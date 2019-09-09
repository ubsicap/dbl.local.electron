import traverse from 'traverse';
import log from 'electron-log';
import waitUntil from 'node-wait-until';
import { List, Map } from 'immutable';
import throttledQueue from 'throttled-queue';
import { bundleConstants } from '../constants/bundle.constants';
import { bundleService } from '../services/bundle.service';
import { updateSearchResultsForBundleId } from './bundleFilter.actions';
import { dblDotLocalService } from '../services/dbl_dot_local.service';
// eslint-disable-next-line import/no-cycle
import { workspaceHelpers } from '../helpers/workspaces.helpers';
import { browserWindowService } from '../services/browserWindow.service';
import {
  getAddedBundle,
  getManifestResourcePaths,
  getStoredResourcePaths
} from '../helpers/bundle.helpers';

export const bundleActions = {
  fetchAll,
  createNewBundle,
  createBundleFromDBL,
  forkIntoNewBundle,
  createDraftRevision,
  updateBundle,
  removeBundle,
  setupBundlesEventSource,
  downloadResources,
  removeResources,
  toggleSelectEntry,
  uploadBundle,
  openJobSpecInBrowser,
  fetchDownloadQueueCounts,
  removeExcessBundles,
  selectBundleEntryRevision
};

export default bundleActions;

export function updateBundle(bundleId) {
  return async dispatch => {
    try {
      const rawBundle = await bundleService.fetchById(bundleId);
      if (!bundleService.apiBundleHasMetadata(rawBundle)) {
        // console.log(`Skipping updateBundle for ${bundleId}`);
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

function tryAddNewEntry(rawBundle) {
  return dispatch => {
    const {
      dbl: { parent, id: dblId }
    } = rawBundle;
    if (parent && parent.dblId === dblId) {
      return;
    }
    dispatch(updateOrAddBundle(rawBundle));
  };
}

function isOptional(arity) {
  return ['*', '?'].includes(arity);
}

function getFormBundleTreeErrors(acc, treeNode) {
  const { arity = null, instances = null } = treeNode;
  if (!arity || isOptional(arity) || this.isRoot) {
    return acc;
  }
  if (!instances || Object.keys(instances).length > 0) {
    return acc;
  }
  const { parents } = this;
  const isNestedInOptionalForm = parents
    .map(context => context.node)
    .some(node => isOptional(node.arity) && !node.present);
  if (isNestedInOptionalForm) {
    return acc;
  }
  const treeError = {
    field_issues: [],
    document_issues: [['missing_instance', 'requires at least one instance']],
    response_format_valid: true,
    response_valid: false
  };

  // build formKey recusively from node.id -> parent.node.id
  const formKey = [...parents, this]
    .filter(
      context =>
        context.key &&
        context.node.id &&
        !['contains', 'instances'].includes(context.key)
    )
    .map(context => context.node.id)
    .join('/');
  return { ...acc, [formKey]: treeError };
}

async function getAllFormsErrorStatus(bundleId) {
  const formsErrorStatus = await bundleService.checkAllFields(bundleId);
  const formStructure = await bundleService.getFormBundleTree(bundleId);
  const formTreeErrors = traverse(formStructure).reduce(
    getFormBundleTreeErrors,
    {}
  );
  return { ...formsErrorStatus, ...formTreeErrors };
}

function updateOrAddBundle(rawBundle) {
  return async (dispatch, getState) => {
    const { local_id: bundleId } = rawBundle;
    const addedBundle = getAddedBundle(getState, bundleId);
    const { status } = bundleService.getInitialTaskAndStatus(rawBundle);
    const formsErrorStatus =
      status === 'DRAFT' ? await getAllFormsErrorStatus(bundleId) : {};
    const bundle = bundleService.convertApiBundleToNathanaelBundle(rawBundle, {
      formsErrorStatus
    });
    if (addedBundle) {
      // console.log(`Updated bundle ${bundleId} from ${context}`);
      dispatch({ type: bundleConstants.UPDATE_BUNDLE, bundle, rawBundle });
      const { id, uploadJob } = bundle;
      if (uploadJob) {
        dispatch(updateUploadJobs(id, uploadJob));
      } else {
        dispatch(updateUploadJobs(id, null, id));
      }
    } else if (rawBundle.mode === 'store') {
      dispatch(addBundle(bundle, rawBundle));
      // console.log(`Added bundle ${bundleId} from listenStorerChangeMode`);
    } else {
      // console.log(`Skipped bundle ${bundleId} with mode ${rawBundle.mode}`);
    }
  };
}

export function createDraftRevision(_bundleId) {
  return async (dispatch, getState) => {
    const { bundles } = getState();
    const { addedByBundleIds } = bundles;
    const bundleIdToEdit = _bundleId;
    const bundleToEdit = _bundleId ? addedByBundleIds[bundleIdToEdit] : {};
    if (bundleToEdit.mode === 'create' || bundleToEdit.status === 'DRAFT') {
      return;
    }
    try {
      await bundleService.startCreateContent(_bundleId, 'createDraftRevision');
    } catch (errorReadable) {
      const error = await errorReadable.text();
      log.error(`error creating draft revision: ${error}`);
    }
  };
}

function updateUploadJobs(bundleId, uploadJob, removeJobOrBundle) {
  return {
    type: bundleConstants.UPDATE_UPLOAD_JOBS,
    bundleId,
    uploadJob,
    removeJobOrBundle
  };
}

export function fetchAll() {
  return async dispatch => {
    dispatch(request());
    try {
      const newMediaTypes = await dblDotLocalService.newBundleMedia();
      const { bundles } = await bundleService.fetchAll();
      dispatch(success(bundles, newMediaTypes));
    } catch (error) {
      dispatch(failure(error));
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

export function forkIntoNewBundle(_bundleId, _medium) {
  return async dispatch => {
    try {
      dispatch(request(_bundleId, _medium));
      await bundleService.forkBundle(_bundleId, _medium);
      dispatch(success(_bundleId, _medium));
    } catch (error) {
      dispatch(failure(error));
    }
  };
  function request(bundleId, medium) {
    return { type: bundleConstants.CREATE_REQUEST, medium, bundleId };
  }
  function success(bundleId, medium) {
    return { type: bundleConstants.CREATE_SUCCESS, medium, bundleId };
  }
  function failure(error) {
    return { type: bundleConstants.CREATE_FAILURE, error };
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

/* should this move to bundleManagerResources.actions? */
function bundleForEntryRevisionHasBeenMade(
  getState,
  dblIdTarget,
  revisionTarget
) {
  const {
    bundles: { allBundles }
  } = getState();
  const targetBundle = allBundles.find(
    b => b.dblId === dblIdTarget && b.revision === `${revisionTarget}`
  );
  return targetBundle;
}

/* should this move to bundleManagerResources.actions? */
export function createBundleFromDBL(dblId, revision, license) {
  return async (dispatch, getState) => {
    try {
      dispatch(request());
      await dblDotLocalService.downloadMetadata(dblId, revision, license);
      const targetBundle = await waitUntil(
        () => bundleForEntryRevisionHasBeenMade(getState, dblId, revision),
        60000,
        500
      );
      dispatch(success(targetBundle));
    } catch (error) {
      dispatch(failure(error));
    }
  };
  function request() {
    return {
      type: bundleConstants.CREATE_FROM_DBL_REQUEST,
      dblId,
      revision,
      license
    };
  }
  function success(targetBundle) {
    return {
      type: bundleConstants.CREATE_FROM_DBL_SUCCESS,
      dblId,
      revision,
      license,
      targetBundle
    };
  }
  function failure(error) {
    return { type: bundleConstants.CREATE_FROM_DBL_FAILURE, error };
  }
}

export function setupBundlesEventSource() {
  return (dispatch, getState) => {
    const {
      authentication: { eventSource }
    } = getState();
    if (!eventSource) {
      console.error('EventSource undefined');
      return;
    }
    const listeners = {
      error: e => dispatch(listenError(e)),
      'storer/execute_task': listenStorerExecuteTaskDownloadResources,
      'storer/change_mode': e => dispatch(listenStorerChangeMode(e)),
      'uploader/job': e => dispatch(listenUploaderJob(e)),
      'uploader/createJob': e => listenUploaderCreateJob(e, dispatch),
      'downloader/receiver': listenDownloaderReceiver,
      'downloader/spec_status': e => dispatch(listenDownloaderSpecStatus(e)),
      'downloader/global_status': e =>
        dispatch(listenDownloaderGlobalStatus(e)),
      'uploader/global_status': e => dispatch(listenUploaderGlobalStatus(e)),
      'storer/delete_resource': e =>
        listenStorerDeleteResource(e, dispatch, getState),
      'storer/delete_bundle': e => dispatch(listenStorerDeleteBundle(e)),
      'storer/write_resource': e => dispatch(listenStorerWriteResource(e))
    };
    Object.keys(listeners).forEach(evType => {
      const handler = listeners[evType];
      eventSource.addEventListener(evType, handler);
    });
    dispatch({ type: 'BUNDLES_SSE_LISTENERS', listeners });
  };

  /*
   * { data: "{"args": ["createJob", "e7495bea-37d1-4980-ba30-73…0}\n"],
   *  "component": "uploader", "type": "error"}"
   */
  function listenError(event) {
    const { data: rawData } = event;
    const data = rawData ? JSON.parse(rawData) : {};
    if (rawData) {
      log.error(data);
    }
    return {
      type: 'SSE_ERROR',
      dispatcher: 'bundle.actions',
      rawData,
      data,
      event
    };
  }

  /*
   * data:{"args": [1, 11], "component": "downloader", "type": "global_status"}
   */
  function listenDownloaderGlobalStatus(e) {
    const data = JSON.parse(e.data);
    const [nSpecs, nAtoms] = data.args;
    return updateDownloadQueue(nSpecs, nAtoms);
  }

  /*
   * data:{"args": [11], "component": "uploader", "type": "global_status"}
   */
  function listenUploaderGlobalStatus() {
    return fetchUploadQueueCounts();
  }

  function listenStorerExecuteTaskDownloadResources() {
    // console.log(e);
  }

  function listenStorerChangeMode(e) {
    return dispatch => {
      // console.log(e);
      const data = JSON.parse(e.data);
      const bundleId = data.args[0];
      if (bundleId.startsWith('session')) {
        return; // skip session change modes
      }
      dispatch(updateBundle(bundleId));
    };
  }

  function listenStorerWriteResource(event) {
    return async dispatch => {
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
      const rawBundle = await bundleService.fetchById(bundleId);
      if (!['template', 'fork'].includes(rawBundle.dbl.origin)) {
        return; // wait until change_mode === store
      }
      dispatch(tryAddNewEntry(rawBundle));
    };
  }

  /* {'event':
   *  'uploader/createJob',
   *  'data': {'args': ('2f57466e-a5c4-41de-a67e-4ba5b54e7870',
   *                    '3a6424b3-8b52-4f05-b69c-3e8cdcf85b0c'),
   *  'component': 'uploader', 'type': 'createJob'}}
   */
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
  function listenUploaderJob(e) {
    return (dispatch, getState) => {
      const { uploadJobs } = getState().bundles;
      const data = JSON.parse(e.data);
      const [type, ...nextArgs] = data.args;
      if (type === 'updated') {
        const [entryId, jobId, payload] = nextArgs;
        const bundleId = uploadJobs[jobId];
        const addedBundle = getAddedBundle(getState, bundleId);
        if (addedBundle.mode === 'upload') {
          const [resourceCountToUpload, resourceCountUploaded] = [
            payload[0],
            payload[5]
          ];
          dispatch(
            updateUploadProgress(
              bundleId,
              entryId,
              jobId,
              resourceCountUploaded,
              resourceCountToUpload
            )
          );
        }
        dispatch(fetchUploadQueueCounts());
        return;
      }
      if (type === 'state' || type === 'status') {
        const [jobId, payload] = nextArgs;
        const bundleId = uploadJobs[jobId];
        if (payload === 'completed') {
          dispatch(updateUploadJobs(bundleId, null, jobId));
        }
        const addedBundle = getAddedBundle(getState, bundleId);
        if (addedBundle.mode === 'upload') {
          return dispatch(updateUploadMessage(bundleId, jobId, payload));
        }
      }
    };
  }

  function updateUploadProgress(
    bundleId,
    entryId,
    jobId,
    resourceCountUploaded,
    resourceCountToUpload
  ) {
    return async dispatch => {
      await bundleService.saveJobSpecToTempFolder(bundleId);
      return dispatch({
        type: bundleConstants.UPLOAD_RESOURCES_UPDATE_PROGRESS,
        bundleId,
        entryId,
        jobId,
        resourceCountUploaded,
        resourceCountToUpload
      });
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
  function listenDownloaderSpecStatus(e) {
    return (dispatch, getState) => {
      // console.log(e);
      const data = JSON.parse(e.data);
      if (data.args.length !== 3) {
        return;
      }
      const bundleId = data.args[0];
      const resourcesDownloaded = data.args[1];
      const resourcesToDownload = data.args[2];
      const addedBundle = getAddedBundle(getState, bundleId);
      if (!addedBundle) {
        return; // hasn't been added yet, so doesn't need to be updated.
      }
      dispatch(
        updateDownloadStatus(bundleId, resourcesDownloaded, resourcesToDownload)
      );
      dispatch(updateSearchResultsForBundleId(bundleId));
      dispatch(fetchDownloadQueueCounts());
    };
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

  function listenStorerDeleteBundle(e) {
    return async (dispatch, getState) => {
      const data = JSON.parse(e.data);
      const bundleId = data.args[0];
      dispatch(removeBundleSuccess(bundleId));
      dispatch(updateUploadJobs(bundleId, null, bundleId));
      await waitUntil(() => !getAddedBundle(getState, bundleId), 60000, 500);
      const gotState = getState();
      workspaceHelpers.persistStarredEntries(
        gotState,
        gotState.bundlesFilter.starredEntries
      );
    };
  }
}

const throttleAddBundle = throttledQueue(4, 1000, true);

function addBundle(bundle, rawBundle) {
  return dispatch =>
    throttleAddBundle(() => {
      dispatch({
        type: bundleConstants.ADD_BUNDLE,
        bundle,
        rawBundle
      });
      dispatch(updateSearchResultsForBundleId(bundle.id));
    });
}

function isInDraftMode(bundle) {
  return bundle.mode === 'create' || bundle.status === 'DRAFT';
}

export function removeExcessBundles() {
  return (dispatch, getState) => {
    const { bundles } = getState();
    const { addedByBundleIds, items } = bundles;
    const itemsByBundleIds = List(items)
      .map(bundle => bundle.id)
      .toSet();
    const itemsByParentIds = List(items)
      .filter(b => b.parent)
      .reduce((acc, bundle) => acc.set(bundle.parent.bundleId, bundle), Map());
    const itemsByDblId = items.reduce(
      (acc, bundle) => ({ ...acc, [bundle.dblId]: bundle }),
      {}
    );
    const bundleIdsToRemove = Object.keys(addedByBundleIds).filter(addedId => {
      if (itemsByBundleIds.includes(addedId)) {
        return false;
      }
      const addedBundle = addedByBundleIds[addedId];
      if (addedBundle.storedResourcePaths.length > 0) {
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
      const itemDisplayed = itemsByParentIds.get(addedId);
      if (itemDisplayed && isInDraftMode(itemDisplayed)) {
        return false;
      }
      return true;
    });
    log.info(`Deleting ${bundleIdsToRemove.length} empty/unused revisions`);
    bundleIdsToRemove.forEach(idBundleToRemove => {
      dispatch(removeBundle(idBundleToRemove));
    });
  };
}

function updateDownloadQueue(nSpecs, nAtoms) {
  return dispatch => {
    dispatch({ type: bundleConstants.UPDATE_DOWNLOAD_QUEUE, nSpecs, nAtoms });
  };
}

function updateUploadQueue(nSpecs, nAtoms) {
  return dispatch => {
    dispatch({ type: bundleConstants.UPDATE_UPLOAD_QUEUE, nSpecs, nAtoms });
  };
}

export function fetchDownloadQueueCounts() {
  return async dispatch => {
    try {
      const downloadQueueList = await bundleService.getSubsystemDownloadQueue();
      const nSpecs = Object.keys(downloadQueueList).length;
      const nAtoms = downloadQueueList.reduce(
        (acc, spec) => acc + (spec.n_atoms - spec.n_downloaded),
        0
      );
      return dispatch(updateDownloadQueue(nSpecs, nAtoms));
    } catch (error) {
      log.error(error);
    }
  };
}

export function fetchUploadQueueCounts() {
  return async dispatch => {
    try {
      const uploadQueueList = await bundleService.getSubsystemUploadQueue();
      const nSpecs = Object.keys(uploadQueueList).length;
      const nAtoms = uploadQueueList.reduce(
        (acc, spec) => acc + (spec.n_atoms - spec.n_uploaded),
        0
      );
      return dispatch(updateUploadQueue(nSpecs, nAtoms));
    } catch (error) {
      log.error(error);
    }
  };
}

export function uploadBundle(id) {
  return async dispatch => {
    try {
      await bundleService.waitStopCreateMode(id);
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

export function openJobSpecInBrowser(bundleId) {
  return async dispatch => {
    const jobSpecFile = await bundleService.saveJobSpecToTempFolder(bundleId);
    browserWindowService.openFileInChromeBrowser(jobSpecFile, false);
    dispatch({ type: 'BUNDLE_OPEN_JOB_SPEC', jobSpecFile });
  };
}

export function downloadResources(_id, _uris = []) {
  return async (dispatch, getState) => {
    try {
      const manifestResourcePaths = getManifestResourcePaths(getState, _id);
      dispatch(request(_id, manifestResourcePaths, _uris));
      dispatch(updateSearchResultsForBundleId(_id));
      await bundleService.downloadResources(_id, _uris);
    } catch (errorReadable) {
      const error = await errorReadable.text();
      dispatch(failure(_id, error));
    }
  };
  function request(id, manifestResourcePaths, uris) {
    return {
      type: bundleConstants.DOWNLOAD_RESOURCES_REQUEST,
      id,
      manifestResourcePaths,
      uris
    };
  }
  function failure(id, error) {
    return { type: bundleConstants.DOWNLOAD_RESOURCES_FAILURE, id, error };
  }
}

export function removeResources(id, selected = []) {
  return async (dispatch, getState) => {
    try {
      const resourcePaths = getStoredResourcePaths(getState, id);
      const resourcePathsToRemove = resourcePaths.filter(
        path => !selected.length || selected.includes(path)
      );
      dispatch(request(id, resourcePathsToRemove));
      dispatch(updateSearchResultsForBundleId(id));
      await bundleService.removeResources(id, resourcePathsToRemove);
    } catch (errorReadable) {
      const error = await errorReadable.text();
      dispatch(failure(id, error));
    }
  };
  function request(_id, resourcesToRemove) {
    return {
      type: bundleConstants.REMOVE_RESOURCES_REQUEST,
      id: _id,
      resourcesToRemove
    };
  }
  function failure(_id, error) {
    return { type: bundleConstants.REMOVE_RESOURCES_FAILURE, id, error };
  }
}

export function removeBundle(id) {
  return async dispatch => {
    dispatch(request(id));
    try {
      await bundleService.waitStopCreateMode(id);
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
  return (dispatch, getState) => {
    const deletedBundle = getAddedBundle(getState, id);
    dispatch({
      type: bundleConstants.DELETE_SUCCESS,
      id,
      appStateSnapshot: getState(),
      deletedBundle
    });
  };
}

export function toggleSelectEntry(selectedBundle) {
  return {
    type: bundleConstants.TOGGLE_SELECT,
    selectedBundle,
    selectedDBLEntryId: selectedBundle.dblId
  };
}

export function selectBundleEntryRevision(bundle) {
  return {
    type: bundleConstants.SELECT_BUNDLE_ENTRY_REVISION,
    bundle,
    id: bundle.id,
    dblId: bundle.dblId,
    revision: bundle.revision
  };
}

export function getEntryRevisions(bundleId) {
  return async (dispatch, getState) => {
    const {
      bundles: { addedByBundleIds }
    } = getState();
    const bundle = addedByBundleIds[bundleId];
    const { dblId } = bundle;
    const entryRevisions = await dblDotLocalService.getEntryRevisions(dblId);
    dispatch({
      type: bundleConstants.GET_ENTRY_REVISIONS_RESPONSE,
      dblId,
      entryRevisions
    });
  };
}
