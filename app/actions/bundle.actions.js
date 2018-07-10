import traverse from 'traverse';
import log from 'electron-log';
import { bundleConstants } from '../constants/bundle.constants';
import { bundleService } from '../services/bundle.service';
import { updateSearchResultsForBundleId } from '../actions/bundleFilter.actions';
import { dblDotLocalConfig } from '../constants/dblDotLocal.constants';
import { history } from '../store/configureStore';
import { navigationConstants } from '../constants/navigation.constants';

export const bundleActions = {
  fetchAll,
  updateBundle,
  delete: removeBundle,
  setupBundlesEventSource,
  downloadResources,
  requestSaveBundleTo,
  removeResources,
  toggleModePauseResume,
  toggleSelectBundle,
};

export default bundleActions;

export function updateBundle(bundleId) {
  return async dispatch => {
    const isDemoMode = history.location.pathname.includes('/demo');
    if (isDemoMode) {
      return;
    }
    const apiBundle = await bundleService.fetchById(bundleId);
    const bundle = await bundleService.convertApiBundleToNathanaelBundle(apiBundle);
    dispatch({ type: bundleConstants.UPDATE_BUNDLE, bundle });
  };
}

export function fetchAll() {
  return dispatch => {
    dispatch(request());
    const isDemoMode = history.location.pathname === navigationConstants.NAVIGATION_BUNDLES_DEMO;
    if (isDemoMode) {
      const mockBundles = getMockBundles();
      dispatch(success(mockBundles));
    } else {
      return bundleService
        .fetchAll()
        .then(
          bundles => dispatch(success(bundles)),
          error => dispatch(failure(error))
        );
    }
  };

  function request() {
    return { type: bundleConstants.FETCH_REQUEST };
  }
  function success(bundles) {
    return { type: bundleConstants.FETCH_SUCCESS, bundles };
  }
  function failure(error) {
    return { type: bundleConstants.FETCH_FAILURE, error };
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
      'storer/change_mode': listenStorerChangeMode,
      'downloader/receiver': listenDownloaderReceiver,
      'downloader/status': (e) => listenDownloaderSpecStatus(e, dispatch, getState),
      'downloader/spec_status': (e) => listenDownloaderSpecStatus(e, dispatch, getState),
      'storer/delete_resource': (e) => listenStorerDeleteResource(e, dispatch, getState),
      'storer/update_from_download': (e) => listenStorerUpdateFromDownload(e, dispatch, getState),
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

  function listenStorerChangeMode() {
    // console.log(e);
    // const data = JSON.parse(e.data);
    // const bundleId = data.args[0];
    // const mode = data.args[1];
    // if (mode === 'store') {
    //   dispatch(updateStatus(bundleId, 'COMPLETED'));
    // }
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

  async function listenStorerUpdateFromDownload(e, dispatch) {
    const data = JSON.parse(e.data);
    const bundleId = data.args[0];
    const apiBundle = await bundleService.fetchById(bundleId);
    const fileInfoKeys = Object.keys(apiBundle.store.file_info);
    if (fileInfoKeys.length === 1 && fileInfoKeys[0] === 'metadata.xml') {
      // we just downloaded metadata.xml
      const bundle = await bundleService.convertApiBundleToNathanaelBundle(apiBundle);
      dispatch(addBundle(bundle));
      dispatch(updateSearchResultsForBundleId(bundle.id));
    }
  }

  function addBundle(bundle) {
    return {
      type: bundleConstants.ADD_BUNDLE,
      bundle
    };
  }
}

export function downloadResources(id) {
  return async dispatch => {
    try {
      const manifestResourcePaths = await bundleService.getManifestResourcePaths(id);
      dispatch(request(id, manifestResourcePaths));
      dispatch(updateSearchResultsForBundleId(id));
      await bundleService.downloadResources(id);
    } catch (error) {
      dispatch(failure(id, error));
    }
  };
  function request(_id, manifestResourcePaths) {
    return { type: bundleConstants.DOWNLOAD_RESOURCES_REQUEST, id: _id, manifestResourcePaths };
  }
  function failure(_id, error) {
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
    } catch (error) {
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

function removeBundle(id) {
  return dispatch => {
    dispatch(request(id));

    bundleService
      .delete(id)
      .then(() => {
        dispatch(success(id));
        return true;
      })
      .catch(error => {
        dispatch(failure(id, error));
        return true;
      });
  };

  function request(_id) {
    return { type: bundleConstants.DELETE_REQUEST, id: _id };
  }
  function success(_id) {
    return { type: bundleConstants.DELETE_SUCCESS, id: _id };
  }
  function failure(_id, error) {
    return { type: bundleConstants.DELETE_FAILURE, id: _id, error };
  }
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
    resourcePath,
    resourceTotalBytesSaved,
    bundleBytesSaved,
    bundleBytesToSave
  }) {
    return {
      type: bundleConstants.SAVETO_UPDATED,
      id: _id,
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

export function toggleModePauseResume(id) {
  return { type: bundleConstants.TOGGLE_MODE_PAUSE_RESUME, id };
}

export function toggleSelectBundle(selectedBundle) {
  return { type: bundleConstants.TOGGLE_SELECT, selectedBundle };
}

function getMockBundles() {
  const bundles = [
    {
      id: 'bundle01',
      dblId: 'dblId1',
      medium: 'print',
      name: 'Test Bundle #1',
      languageIso: 'eng',
      countryIso: 'us',
      revision: 3,
      task: 'UPLOAD',
      status: 'COMPLETED'
    },
    {
      id: 'bundle02',
      dblId: 'dblId2',
      medium: 'text',
      name: 'Another Bundle',
      languageIso: 'eng',
      countryIso: 'us',
      revision: 3,
      task: 'UPLOAD',
      status: 'IN_PROGRESS',
      progress: 63,
      mode: 'PAUSED'
    },
    {
      id: 'bundle03',
      dblId: 'dblId3',
      medium: 'audio',
      name: 'Audio Bundle',
      languageIso: 'eng',
      countryIso: 'us',
      revision: 52,
      task: 'DOWNLOAD',
      status: 'IN_PROGRESS',
      progress: 12,
      mode: 'RUNNING'
    },
    {
      id: 'bundle04',
      dblId: 'dblId4',
      medium: 'audio',
      name: 'Unfinished Bundle',
      languageIso: 'eng',
      countryIso: 'us',
      task: 'UPLOAD',
      status: 'DRAFT'
    },
    {
      id: 'bundle05',
      dblId: 'dblId5',
      medium: 'video',
      name: 'Unfinished Video Bundle',
      languageIso: 'eng',
      countryIso: 'us',
      task: 'UPLOAD',
      status: 'DRAFT'
    },
    {
      id: 'bundle06',
      dblId: 'dblId6',
      medium: 'text',
      revision: 3,
      name: 'DBL Bundle',
      languageIso: 'eng',
      countryIso: 'us',
      task: 'DOWNLOAD',
      status: 'NOT_STARTED'
    },
    {
      id: 'bundle07',
      dblId: 'dblId7',
      medium: 'text',
      revision: 4,
      name: 'DBL Bundle',
      languageIso: 'eng',
      countryIso: 'us',
      task: 'DOWNLOAD',
      status: 'NOT_STARTED'
    },
    {
      id: 'bundle08',
      dblId: 'dblId8',
      medium: 'audio',
      name: 'Audio Bundle #2',
      languageIso: 'eng',
      countryIso: 'us',
      revision: 40,
      task: 'DOWNLOAD',
      status: 'COMPLETED'
    },
    {
      id: 'bundle09',
      dblId: 'dblId9',
      medium: 'audio',
      name: 'Audio Bundle #3',
      languageIso: 'eng',
      countryIso: 'us',
      revision: 5,
      task: 'SAVETO',
      status: 'IN_PROGRESS',
      progress: 0,
    },
    {
      id: 'bundle10',
      dblId: 'dblId10',
      medium: 'audio',
      name: 'Audio Bundle #4',
      languageIso: 'eng',
      countryIso: 'us',
      revision: 4,
      task: 'SAVETO',
      status: 'IN_PROGRESS',
      progress: 66,
    },
    {
      id: 'bundle11',
      dblId: 'dblId5',
      medium: 'audio',
      name: 'Audio Bundle #5',
      languageIso: 'eng',
      countryIso: 'us',
      revision: 5,
      task: 'SAVETO',
      status: 'COMPLETED',
      progress: 100,
    }
  ];
  // const taskOrder = ['UPLOAD', 'DOWNLOAD', 'SAVETO'];
  // const statusOrder = ['IN_PROGRESS', 'DRAFT', 'COMPLETED', 'NOT_STARTED'];
  return bundles;
}
