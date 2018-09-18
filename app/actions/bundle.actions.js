import traverse from 'traverse';
import log from 'electron-log';
import { bundleConstants } from '../constants/bundle.constants';
import { bundleService } from '../services/bundle.service';
import { updateSearchResultsForBundleId } from '../actions/bundleFilter.actions';
import { dblDotLocalConfig } from '../constants/dblDotLocal.constants';
import { history } from '../store/configureStore';
import { navigationConstants } from '../constants/navigation.constants';
import { dblDotLocalService } from '../services/dbl_dot_local.service';

export const bundleActions = {
  fetchAll,
  createNewBundle,
  updateBundle,
  removeBundle,
  setupBundlesEventSource,
  downloadResources,
  requestSaveBundleTo,
  removeResources,
  toggleSelectEntry,
  uploadBundle
};

export default bundleActions;

export function updateBundle(bundleId) {
  return async (dispatch) => {
    const isDemoMode = history.location.pathname.includes('/demo');
    if (isDemoMode) {
      return;
    }
    try {
      const rawBundle = await bundleService.fetchById(bundleId);
      if (!bundleService.apiBundleHasMetadata(rawBundle)) {
        return; // hasn't downloaded metadata yet. (don't expect to be in our list)
      }
      dispatch(updateOrAddBundle(rawBundle));
    } catch (error) {
      if (error.status === 404) {
        // this has been deleted.
        return;
      }
      throw error;
    }
  };
}

function tryAddNewEntry(bundleId) {
  return async (dispatch) => {
    const rawBundle = await bundleService.fetchById(bundleId);
    if (!bundleService.apiBundleHasMetadata(rawBundle)) {
      return; // hasn't downloaded metadata yet. (don't expect to be in our list)
    }
    const { dbl: { parent } } = rawBundle;
    if (parent) {
      return;
    }
    dispatch(updateOrAddBundle(rawBundle));
  };
}

function updateOrAddBundle(rawBundle) {
  return async (dispatch, getState) => {
    const { local_id: bundleId } = rawBundle;
    const hasStoredResources = bundleService.getHasStoredResources(rawBundle);
    const manifestResources = hasStoredResources ?
      await bundleService.getManifestResourcePaths(bundleId) : 0;
    const resourceCountManifest = (manifestResources || []).length;
    const bundle = await bundleService.convertApiBundleToNathanaelBundle(rawBundle, resourceCountManifest);
    const addedBundle = getAddedBundle(getState, bundleId);
    if (addedBundle) {
      dispatch({ type: bundleConstants.UPDATE_BUNDLE, bundle, rawBundle });
      const { id, uploadJob } = bundle;
      if (uploadJob) {
        dispatch(updateUploadJobs(id, uploadJob));
      } else {
        dispatch(updateUploadJobs(id, null, id));
      }
    } else {
      dispatch(addBundle(bundle, rawBundle));
    }
  };
}

function updateUploadJobs(bundleId, uploadJob, removeJobOrBundle) {
  return { type: bundleConstants.UPDATE_UPLOAD_JOBS, bundleId, uploadJob, removeJobOrBundle };
}

export function fetchAll() {
  return async dispatch => {
    dispatch(request());
    const isDemoMode = history.location.pathname === navigationConstants.NAVIGATION_BUNDLES_DEMO;
    if (isDemoMode) {
      const mockBundles = getMockBundles();
      dispatch(success(mockBundles));
    } else {
      try {
        const newMediaTypes = await dblDotLocalService.newBundleMedia();
        const { bundles } = await bundleService.fetchAll();
        dispatch(success(bundles, newMediaTypes));
      } catch (error) {
        dispatch(failure(error));
      }
    }
  };

  function request() {
    return { type: bundleConstants.FETCH_REQUEST };
  }
  function success(bundles, newMediaTypes) {
    return { type: bundleConstants.FETCH_SUCCESS, bundles, newMediaTypes };
  }
  function failure(error) {
    return { type: bundleConstants.FETCH_FAILURE, error };
  }
}

export function createNewBundle(_medium) {
  return async dispatch => {
    try {
      dispatch(request(_medium));
      await dblDotLocalService.createNewBundle(_medium);
      dispatch(success(_medium));
    } catch (error) {
      dispatch(failure(error));
    }
  };
  function request(medium) {
    return { type: bundleConstants.CREATE_REQUEST, medium };
  }
  function success(medium) {
    return { type: bundleConstants.CREATE_SUCCESS, medium };
  }
  function failure(error) {
    return { type: bundleConstants.CREATE_FAILURE, error };
  }
}

export function setupBundlesEventSource(authentication) {
  return (dispatch, getState) => {
    console.log('SSE connect to Bundles');
    const eventSource = new EventSource(`${dblDotLocalConfig.getHttpDblDotLocalBaseUrl()}/events/${authentication.user.auth_token}`);
    eventSource.onmessage = (event) => {
      console.log(event);
    };
    eventSource.onopen = () => {
      console.log('Connection to event source opened.');
    };
    eventSource.onerror = (error) => {
      console.log('EventSource error.');
      console.log(error);
      log.error(JSON.stringify(error.data));
    };
    const listeners = {
      'storer/execute_task': listenStorerExecuteTaskDownloadResources,
      'storer/change_mode': (e) => listenStorerChangeMode(e, dispatch, getState),
      'uploader/job': (e) => listenUploaderJob(e, dispatch, getState().bundles.uploadJobs),
      'uploader/createJob': (e) => listenUploaderCreateJob(e, dispatch),
      'downloader/receiver': listenDownloaderReceiver,
      'downloader/status': (e) => listenDownloaderSpecStatus(e, dispatch, getState),
      'downloader/spec_status': (e) => listenDownloaderSpecStatus(e, dispatch, getState),
      'storer/delete_resource': (e) => listenStorerDeleteResource(e, dispatch, getState),
      'storer/update_from_download': (e) => listenStorerUpdateFromDownload(e, dispatch, getState),
      'storer/delete_bundle': (e) => listenStorerDeleteBundle(e, dispatch, getState),
      'storer/write_resource': listenStorerWriteResource(dispatch, getState)
    };
    Object.keys(listeners).forEach((evType) => {
      const handler = listeners[evType];
      eventSource.addEventListener(evType, handler);
    });
    dispatch(connectedToSessionEvents(eventSource, authentication));

    function connectedToSessionEvents(_eventSource, _authentication) {
      return {
        type: bundleConstants.SESSION_EVENTS_CONNECTED,
        eventSource: _eventSource,
        authentication: _authentication
      };
    }
  };

  function listenStorerExecuteTaskDownloadResources() {
    // console.log(e);
  }

  function listenStorerChangeMode(e, dispatch) {
    // console.log(e);
    const data = JSON.parse(e.data);
    const bundleId = data.args[0];
    if (bundleId.startsWith('session')) {
      return; // skip session change modes
    }
    dispatch(updateBundle(bundleId));
  }

  function listenStorerWriteResource(dispatch) {
    return (event) => {
      /*
      {'event': 'storer/write_resource',
       'data': {'args': ('50501698-e832-4db5-8973-f85340dc2e39', 'metadata.xml'),
        'component': 'storer', 'type': 'write_resource'}}
      */
      const data = JSON.parse(event.data);
      const [bundleId, fileName] = data.args;
      if (fileName !== 'metadata.xml') {
        return;
      }
      dispatch(tryAddNewEntry(bundleId));
    };
  }

  /* {'event': 'uploader/createJob', 'data': {'args': ('2f57466e-a5c4-41de-a67e-4ba5b54e7870', '3a6424b3-8b52-4f05-b69c-3e8cdcf85b0c'), 'component': 'uploader', 'type': 'createJob'}} */
  function listenUploaderCreateJob(e, dispatch) {
    // console.log(e);
    const data = JSON.parse(e.data);
    const [jobId, bundleId] = data.args;
    dispatch(updateUploadJobs(bundleId, jobId));
  }

  /* {'event': 'uploader/job', 'data': {'args': ('updated', '343a70a5-b4d2-453a-95a5-5b53107b0c60', (7, 0, 0, 5, 4, 2)), 'component': 'uploader', 'type': 'job'}}
   * {'event': 'uploader/job', 'data': {'args': ('state', '343a70a5-b4d2-453a-95a5-5b53107b0c60', 'submitting'), 'component': 'uploader', 'type': 'job'}}
   * {'event': 'uploader/job', 'data': {'args': ('status', '343a70a5-b4d2-453a-95a5-5b53107b0c60', 'completed'), 'component': 'uploader', 'type': 'job'}}
   */
  function listenUploaderJob(e, dispatch, uploadJobs) {
    // console.log(e);
    const data = JSON.parse(e.data);
    const [type, ...nextArgs] = data.args;
    if (type === 'updated') {
      const [entryId, jobId, payload] = nextArgs;
      const bundleId = uploadJobs[jobId];
      const [resourceCountToUpload, resourceCountUploaded] = [payload[0], payload[5]];
      return dispatch(updateUploadProgress(bundleId, entryId, jobId, resourceCountUploaded, resourceCountToUpload));
    }
    if (type === 'state' || type === 'status') {
      const [jobId, payload] = nextArgs;
      const bundleId = uploadJobs[jobId];
      if (payload === 'completed') {
        dispatch(updateUploadJobs(bundleId, null, jobId));
      }
      return dispatch(updateUploadMessage(bundleId, jobId, payload));
    }
  }

  function updateUploadProgress(bundleId, entryId, jobId, resourceCountUploaded, resourceCountToUpload) {
    return {
      type: bundleConstants.UPLOAD_RESOURCES_UPDATE_PROGRESS,
      bundleId,
      entryId,
      jobId,
      resourceCountUploaded,
      resourceCountToUpload
    };
  }

  function updateUploadMessage(bundleId, jobId, message) {
    return {
      type: bundleConstants.UPLOAD_RESOURCES_UPDATE_MESSAGE,
      bundleId,
      jobId,
      message
    };
  }

  function listenDownloaderReceiver() {
    // console.log(e);
  }

  /* downloader/status
   * {'event': 'downloader/status',
   * 'data': {'args': ('48a8e8fe-76ac-45d6-9b3a-d7d99ead7224', 4, 8),
   *          'component': 'downloader', 'type': 'status'}}
   */
  function listenDownloaderSpecStatus(e, dispatch) {
    // console.log(e);
    const data = JSON.parse(e.data);
    if (data.args.length !== 3) {
      return;
    }
    const bundleId = data.args[0];
    const resourcesDownloaded = data.args[1];
    const resourcesToDownload = data.args[2];
    dispatch(updateDownloadStatus(bundleId, resourcesDownloaded, resourcesToDownload));
    dispatch(updateSearchResultsForBundleId(bundleId));
  }

  function updateDownloadStatus(_id, resourcesDownloaded, resourcesToDownload) {
    return {
      type: bundleConstants.DOWNLOAD_RESOURCES_UPDATED,
      id: _id,
      resourcesDownloaded,
      resourcesToDownload
    };
  }

  function listenStorerDeleteResource(e, dispatch) {
    // console.log(e);
    const data = JSON.parse(e.data);
    const bundleId = data.args[0];
    const resourceToRemove = data.args[1];
    dispatch(updateRemoveResourcesStatus(bundleId, resourceToRemove));
    dispatch(updateSearchResultsForBundleId(bundleId));
  }

  function updateRemoveResourcesStatus(_id, resourceToRemove) {
    return {
      type: bundleConstants.REMOVE_RESOURCES_UPDATED,
      id: _id,
      resourceToRemove
    };
  }

  function listenStorerDeleteBundle(e, dispatch) {
    const data = JSON.parse(e.data);
    const bundleId = data.args[0];
    dispatch(removeBundleSuccess(bundleId));
    dispatch(updateUploadJobs(bundleId, null, bundleId));
  }

  async function listenStorerUpdateFromDownload(e, dispatch, getState) {
    const data = JSON.parse(e.data);
    const bundleId = data.args[0];
    const rawBundle = await bundleService.fetchById(bundleId);
    if (bundleService.apiBundleHasMetadata(rawBundle)) {
      const addedBundle = getAddedBundle(getState, bundleId);
      if (addedBundle) {
        return; // already exists in items.
      }
      // we just downloaded metadata.xml
      const bundle = await bundleService.convertApiBundleToNathanaelBundle(rawBundle);
      dispatch(addBundle(bundle, rawBundle));
    }
  }
}

function addBundle(bundle, rawBundle) {
  return dispatch => {
    dispatch({
      type: bundleConstants.ADD_BUNDLE,
      bundle,
      rawBundle
    });
    dispatch(updateSearchResultsForBundleId(bundle.id));
    dispatch(removeExcessBundles());
  };
}

function isInDraftMode(bundle) {
  return bundle.mode === 'create' || bundle.status === 'DRAFT';
}

function removeExcessBundles() {
  return (dispatch, getState) => {
    const { bundles } = getState();
    const { addedByBundleIds, items } = bundles;
    const itemsByBundleIds = items.reduce((acc, bundle) => ({ ...acc, [bundle.id]: bundle }), {});
    const itemsByParentIds = items.filter(b => b.parent).reduce((acc, bundle) =>
      ({ ...acc, [bundle.parent.bundleId]: bundle }), {});
    const itemsByDblId = items.reduce((acc, bundle) => ({ ...acc, [bundle.dblId]: bundle }), {});
    const bundleIdsToRemove = Object.keys(addedByBundleIds).filter(addedId => {
      if (addedId in itemsByBundleIds) {
        return false;
      }
      const addedBundle = addedByBundleIds[addedId];
      if (addedBundle.resourceCountStored > 0) {
        return false;
      }
      // don't delete if revision is greater than the one on display
      const itemMatchingDblId = itemsByDblId[addedBundle.dblId];
      if (itemMatchingDblId) {
        if (isInDraftMode(itemMatchingDblId)) {
          if (addedBundle.revision > itemMatchingDblId.parent.revision) {
            return false;
          }
        } else if (addedBundle.revision > itemMatchingDblId.revision) {
          return false;
        }
      }
      // don't delete if is parent of item in draft mode
      const itemDisplayed = itemsByParentIds[addedId];
      if (itemDisplayed && isInDraftMode(itemDisplayed)) {
        return false;
      }
      return true;
    });
    bundleIdsToRemove.forEach((idBundleToRemove) => {
      dispatch(removeBundle(idBundleToRemove));
    });
  };
}

function getAddedBundle(getState, bundleId) {
  const { bundles } = getState();
  const { addedByBundleIds = {} } = bundles;
  const addedBundles = addedByBundleIds[bundleId];
  return addedBundles;
}


export function uploadBundle(id) {
  return async dispatch => {
    try {
      bundleService.unlockCreateMode(id);
      dispatch(request(id));
      await bundleService.startUploadBundle(id);
    } catch (errorReadable) {
      const error = await errorReadable.text();
      dispatch(failure(id, error));
    }
  };
  function request(_id) {
    return { type: bundleConstants.UPLOAD_BUNDLE_REQUEST, id: _id };
  }
  function failure(_id, error) {
    return { type: bundleConstants.UPLOAD_BUNDLE_FAILURE, id, error };
  }
}

export function downloadResources(_id, _uris = []) {
  return async dispatch => {
    try {
      const manifestResourcePaths = await bundleService.getManifestResourcePaths(_id);
      dispatch(request(_id, manifestResourcePaths, _uris));
      dispatch(updateSearchResultsForBundleId(_id));
      await bundleService.downloadResources(_id, _uris);
    } catch (errorReadable) {
      const error = await errorReadable.text();
      dispatch(failure(_id, error));
    }
  };
  function request(id, manifestResourcePaths, uris) {
    return { type: bundleConstants.DOWNLOAD_RESOURCES_REQUEST, id, manifestResourcePaths, uris };
  }
  function failure(id, error) {
    return { type: bundleConstants.DOWNLOAD_RESOURCES_FAILURE, id, error };
  }
}

export function removeResources(id) {
  return async dispatch => {
    try {
      const resourcePathsToRemove = await bundleService.getResourcePaths(id);
      dispatch(request(id, resourcePathsToRemove));
      dispatch(updateSearchResultsForBundleId(id));
      await bundleService.removeResources(id);
    } catch (errorReadable) {
      const error = await errorReadable.text();
      dispatch(failure(id, error));
    }
  };
  function request(_id, resourcesToRemove) {
    return { type: bundleConstants.REMOVE_RESOURCES_REQUEST, id: _id, resourcesToRemove };
  }
  function failure(_id, error) {
    return { type: bundleConstants.REMOVE_RESOURCES_FAILURE, id, error };
  }
}

export function removeBundle(id) {
  return async dispatch => {
    dispatch(request(id));
    try {
      bundleService.unlockCreateMode(id);
      await bundleService.removeBundle(id);
    } catch (error) {
      dispatch(failure(id, error));
    }
  };

  function request(_id) {
    return { type: bundleConstants.DELETE_REQUEST, id: _id };
  }
  function failure(_id, error) {
    return { type: bundleConstants.DELETE_FAILURE, id: _id, error };
  }
}

function removeBundleSuccess(id) {
  return { type: bundleConstants.DELETE_SUCCESS, id };
}

export function requestSaveBundleTo(id, selectedFolder) {
  return async dispatch => {
    const bundleInfo = await bundleService.fetchById(id);
    const bundleBytesToSave = traverse(bundleInfo.store.file_info).reduce(addByteSize, 0);
    const resourcePaths = await bundleService.getResourcePaths(id);
    resourcePaths.unshift('metadata.xml');
    const resourcePathsProgress = resourcePaths.reduce((acc, resourcePath) => {
      acc[resourcePath] = 0;
      return acc;
    }, {});
    let bundleBytesSaved = 0;
    dispatch(request(id, selectedFolder, bundleBytesToSave, resourcePaths));
    dispatch(updateSearchResultsForBundleId(id));
    resourcePaths.forEach(async resourcePath => {
      try {
        const downloadItem = await bundleService.requestSaveResourceTo(
          selectedFolder,
          id,
          resourcePath,
          (resourceTotalBytesSaved, resourceProgress) => {
            const originalResourceBytesTransferred = resourcePathsProgress[resourcePath];
            resourcePathsProgress[resourcePath] = resourceTotalBytesSaved;
            const bytesDiff = resourceTotalBytesSaved - originalResourceBytesTransferred;
            bundleBytesSaved += bytesDiff;
            if (resourceProgress && resourceProgress % 100 === 0) {
              const updatedArgs = {
                _id: id,
                apiBundle: bundleInfo,
                resourcePath,
                resourceTotalBytesSaved,
                bundleBytesSaved,
                bundleBytesToSave
              };
              dispatch(updated(updatedArgs));
              dispatch(updateSearchResultsForBundleId(id));
            }
          }
        );
        return downloadItem;
      } catch (error) {
        dispatch(failure(id, error));
      }
    });
  };

  function addByteSize(accBytes, fileInfoNode) {
    if (fileInfoNode.is_dir || this.isRoot || fileInfoNode.size === undefined) {
      return accBytes;
    }
    return accBytes + fileInfoNode.size;
  }

  function request(_id, _folderName, bundleBytesToSave, resourcePaths) {
    return {
      type: bundleConstants.SAVETO_REQUEST,
      id: _id,
      folderName: _folderName,
      bundleBytesToSave,
      resourcePaths
    };
  }

  function updated({
    _id,
    apiBundle,
    resourcePath,
    resourceTotalBytesSaved,
    bundleBytesSaved,
    bundleBytesToSave,
  }) {
    return {
      type: bundleConstants.SAVETO_UPDATED,
      id: _id,
      apiBundle,
      resourcePath,
      resourceTotalBytesSaved,
      bundleBytesSaved,
      bundleBytesToSave
    };
  }
  function failure(_id, error) {
    return { type: bundleConstants.SAVETO_FAILURE, id: _id, error };
  }
}

export function toggleSelectEntry(selectedBundle) {
  return {
    type: bundleConstants.TOGGLE_SELECT,
    selectedBundle,
    selectedDBLEntryId: selectedBundle.dblId
  };
}

function getMockBundles() {
  const bundles = [
    {
      id: 'bundle01',
      dblId: 'dblId1',
      revision: '3',
      parent: null,
      medium: 'print',
      name: 'Test Bundle #1',
      languageIso: 'eng',
      countryIso: 'us',
      task: 'UPLOAD',
      status: 'COMPLETED',
      resourceCountStored: 2,
      resourceCountManifest: 2
    },
    {
      id: 'bundle03',
      dblId: 'dblId3',
      revision: '52',
      parent: null,
      medium: 'audio',
      name: 'Audio Bundle',
      languageIso: 'eng',
      countryIso: 'us',
      task: 'DOWNLOAD',
      status: 'IN_PROGRESS',
      progress: 12,
      resourceCountStored: 1,
      resourceCountManifest: 2
    },
    {
      id: 'bundle04',
      dblId: 'dblId4',
      revision: '0',
      medium: 'audio',
      name: 'Unfinished Bundle',
      languageIso: 'eng',
      countryIso: 'us',
      task: 'UPLOAD',
      status: 'DRAFT',
      parent: { revision: '32' },
      resourceCountStored: 1,
      resourceCountManifest: 2
    },
    {
      id: 'bundle05',
      dblId: 'dblId5',
      revision: '0',
      medium: 'video',
      name: 'Unfinished Video Bundle',
      languageIso: 'eng',
      countryIso: 'us',
      task: 'UPLOAD',
      status: 'DRAFT',
      parent: { revision: '42' },
      resourceCountStored: 1,
      resourceCountManifest: 2
    },
    {
      id: 'bundle06',
      dblId: 'dblId6',
      parent: null,
      revision: '3',
      medium: 'text',
      name: 'DBL Bundle',
      languageIso: 'eng',
      countryIso: 'us',
      task: 'DOWNLOAD',
      status: 'NOT_STARTED',
      resourceCountStored: 0,
      resourceCountManifest: 2
    },
    {
      id: 'bundle07',
      dblId: 'dblId7',
      revision: '4',
      parent: null,
      medium: 'text',
      name: 'DBL Bundle',
      languageIso: 'eng',
      countryIso: 'us',
      task: 'DOWNLOAD',
      status: 'NOT_STARTED',
      resourceCountStored: 0,
      resourceCountManifest: 2
    },
    {
      id: 'bundle08',
      dblId: 'dblId8',
      revision: '40',
      parent: null,
      medium: 'audio',
      name: 'Audio Bundle #2',
      languageIso: 'eng',
      countryIso: 'us',
      task: 'DOWNLOAD',
      status: 'COMPLETED',
      resourceCountStored: 2,
      resourceCountManifest: 2
    },
    {
      id: 'bundle09',
      dblId: 'dblId9',
      revision: '5',
      parent: null,
      medium: 'audio',
      name: 'Audio Bundle #3',
      languageIso: 'eng',
      countryIso: 'us',
      task: 'SAVETO',
      status: 'IN_PROGRESS',
      progress: 0,
      resourceCountStored: 2,
      resourceCountManifest: 2
    },
    {
      id: 'bundle10',
      dblId: 'dblId10',
      revision: '4',
      parent: null,
      medium: 'audio',
      name: 'Audio Bundle #4',
      languageIso: 'eng',
      countryIso: 'us',
      task: 'SAVETO',
      status: 'IN_PROGRESS',
      progress: 66,
      resourceCountStored: 2,
      resourceCountManifest: 2
    }
  ];
  // const taskOrder = ['UPLOAD', 'DOWNLOAD', 'SAVETO'];
  // const statusOrder = ['IN_PROGRESS', 'DRAFT', 'COMPLETED', 'NOT_STARTED'];
  return bundles;
}
