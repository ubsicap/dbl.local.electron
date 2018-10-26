import sort from 'fast-sort';
import { List, Set } from 'immutable';
import { bundleConstants } from '../constants/bundle.constants';
import { bundleService } from '../services/bundle.service';

const [idKey] = ['id'];

function sortAndFilterBundlesAsEntries(allBundles, shouldIndexByIds = true) {
  const sortedBundles = sort(allBundles).asc([
    b => b.dblId,
    b => (b.revision === '0' || !b.revision ? ~10000000 : ~b.revision) // eslint-disable-line no-bitwise
  ]);
  const reducedBundles = List(sortedBundles).reduce((acc, b) => {
    if (acc.visitedDblIds.includes(b.dblId)) {
      return acc;
    }
    const visitedDblIds = acc.visitedDblIds.add(b.dblId);
    const items = acc.items.push(b);
    return { visitedDblIds, items };
  }, { visitedDblIds: Set(), items: List() });
  const reducedUnsorted = reducedBundles.items.toArray();
  const items = sort(reducedUnsorted).asc([
    b => b.displayAs.languageAndCountry,
    b => b.displayAs.name,
  ]);
  const addedByBundleIds = shouldIndexByIds ? indexBy(sortedBundles, idKey) : null;
  return { items, addedByBundleIds };
}

/* consider converting indexBy to extension method:
  Object.defineProperty(String.prototype, "SayHi", {
      value: function SayHi() {
          return "Hi " + this + "!";
      },
      writable: true,
      configurable: true
  });
*/
function indexBy(items, byField) {
  return items.reduce((acc, item) => ({ ...acc, [item[byField]]: item }), {});
}

function getSelectedState(state, bundleToToggle, bundleIdToRemove, newItems) {
  const { selectedBundle: origSelectedBundle = {} } = state;
  const { dblId: origSelectedBundleDblId = null } = origSelectedBundle || {};
  const { id: origSelectedBundleId } = origSelectedBundle || {};
  if (bundleToToggle) {
    const newBundleToSelect = newItems ?
      newItems.find(b => b.dblId === origSelectedBundleDblId) :
      bundleToToggle;
    const selectedBundle = bundleToToggle.id === origSelectedBundleId ?
      null : newBundleToSelect;
    const { dblId: selectedDBLEntryId } = selectedBundle || {};
    return {
      selectedBundle,
      selectedDBLEntryId
    };
  }
  if (bundleIdToRemove && bundleIdToRemove === origSelectedBundleId) {
    const newBundleToSelect = origSelectedBundleId === bundleIdToRemove ?
      newItems.find(b => b.dblId === origSelectedBundleDblId) : null;
    return {
      selectedBundle: newBundleToSelect,
      selectedDBLEntryId: (newBundleToSelect ? newBundleToSelect.dblId : null)
    };
  }
  return {
    selectedBundle: origSelectedBundle,
    selectedDBLEntryId: origSelectedBundleDblId
  };
}

function updateIndexedByIds(state, decoratedBundle) {
  const { addedByBundleIds: origByIds } = state;
  const addedByBundleIds = { ...origByIds, [decoratedBundle[idKey]]: decoratedBundle };
  return { addedByBundleIds };
}

export function bundles(state = { items: [], allBundles: [] }, action) {
  switch (action.type) {
    case bundleConstants.FETCH_REQUEST:
      return {
        ...state,
        loading: true
      };
    case bundleConstants.FETCH_SUCCESS: {
      const { bundles: bundlesRaw, newMediaTypes = [] } = action;
      const allBundles = bundlesRaw.map(bundle => addBundleDecorators(bundle));
      const { items, addedByBundleIds } = sortAndFilterBundlesAsEntries(allBundles);
      const uploadJobs = items.filter(b => b.uploadJob).reduce((acc, b) =>
        ({ ...acc, [b.id]: b.uploadJob, [b.uploadJob]: b.id }), {});
      return {
        ...state,
        items,
        allBundles,
        addedByBundleIds,
        uploadJobs,
        loading: false,
        newMediaTypes
      };
    }
    case bundleConstants.FETCH_FAILURE:
      return {
        ...state,
        error: action.error,
        loading: false,
      };
    case bundleConstants.UPDATE_UPLOAD_JOBS: {
      const { uploadJobs: originalUploadJobs = {} } = state;
      const { bundleId: updatedBundleId, uploadJob: bundleUploadJob, removeJobOrBundle } = action;
      const originalBundleUploadJob = originalUploadJobs[updatedBundleId];
      if (originalBundleUploadJob === bundleUploadJob) {
        return state; // no jobs have changed
      }
      const reverseLookup = bundleUploadJob ? { [bundleUploadJob]: updatedBundleId } : {};
      const {
        [removeJobOrBundle]: removedBundleOrJob,
        [updatedBundleId]: removedJobId,
        ...trimmedJobs
      } = originalUploadJobs;
      const uploadJobs = bundleUploadJob ?
        { ...trimmedJobs, [updatedBundleId]: bundleUploadJob, ...reverseLookup } :
        trimmedJobs;
      return {
        ...state,
        uploadJobs
      };
    }
    case bundleConstants.DELETE_SUCCESS: {
      const { id: bundleIdToRemove } = action;
      const allBundles = state.allBundles.filter(bundle => bundle.id !== bundleIdToRemove);
      const { items, addedByBundleIds } = sortAndFilterBundlesAsEntries(allBundles);
      const { selectedBundle, selectedDBLEntryId } = getSelectedState(state, null, bundleIdToRemove, items);
      return {
        ...state,
        items,
        allBundles,
        addedByBundleIds,
        selectedBundle,
        selectedDBLEntryId
      };
    }
    case bundleConstants.ADD_BUNDLE: {
      const { bundle } = action;
      const { allBundles: origUnsorted } = state;
      const decoratedBundle = addBundleDecorators(bundle);
      const allBundles = ([decoratedBundle, ...origUnsorted]);
      const { items } = sortAndFilterBundlesAsEntries(allBundles, false);
      const { addedByBundleIds } = updateIndexedByIds(state, decoratedBundle);
      const { selectedBundle, selectedDBLEntryId } = getSelectedState(state, decoratedBundle, null, items);
      return {
        ...state,
        items,
        allBundles,
        addedByBundleIds,
        selectedBundle,
        selectedDBLEntryId
      };
    }
    case bundleConstants.UPDATE_DOWNLOAD_QUEUE: {
      const { nSpecs, nAtoms } = action;
      return {
        ...state,
        downloadQueue: { nSpecs, nAtoms }
      };
    }
    case bundleConstants.DOWNLOAD_RESOURCES_REQUEST: {
      return updateTaskStatusProgress(action.id, 'DOWNLOAD', 'IN_PROGRESS', 0);
    }
    case bundleConstants.DOWNLOAD_RESOURCES_UPDATED: {
      const progress = Math.floor((action.resourcesDownloaded / action.resourcesToDownload) * 100);
      const status = progress === 100 ? 'COMPLETED' : 'IN_PROGRESS';
      return updateTaskStatusProgress(action.id, 'DOWNLOAD', status, progress);
    }
    case bundleConstants.UPLOAD_BUNDLE_REQUEST: {
      return updateTaskStatusProgress(action.id, 'UPLOAD', 'IN_PROGRESS', null, () => ({
        isUploading: true
      }));
    }
    case bundleConstants.UPLOAD_RESOURCES_UPDATE_PROGRESS: {
      const percentage = action.resourceCountToUpload > 0 ?
        Math.floor((action.resourceCountUploaded / action.resourceCountToUpload) * 100) :
        100/* metadata only */;
      return updateTaskStatusProgress(action.bundleId, 'UPLOAD', 'IN_PROGRESS', percentage, () => ({
        isUploading: true
      }));
    }
    case bundleConstants.UPLOAD_RESOURCES_UPDATE_MESSAGE: {
      const { message } = action;
      return updateTaskStatusProgress(action.bundleId, 'UPLOAD', null, null, (bState, bDecorated) => ({
        displayAs: { ...bDecorated.displayAs, status: `Uploading (${message})` }
      }));
    }
    case bundleConstants.SAVETO_REQUEST: {
      return updateTaskStatusProgress(action.id, 'SAVETO', 'IN_PROGRESS', 0);
    }
    case bundleConstants.SAVETO_UPDATED: {
      const progress = calcProgress(action.bundleBytesSaved, action.bundleBytesToSave);
      const status = progress === 100 ? 'COMPLETED' : 'IN_PROGRESS';
      const { apiBundle } = action;
      if (status === 'COMPLETED') {
        const { task, status: initStatus } = bundleService.getInitialTaskAndStatus(apiBundle);
        const finalStatus = initStatus === 'DRAFT' ? initStatus : 'COMPLETED';
        return updateTaskStatusProgress(action.id, task, finalStatus, progress);
      }
      return updateTaskStatusProgress(action.id, 'SAVETO', status, progress);
    }
    case bundleConstants.REMOVE_RESOURCES_REQUEST: {
      return updateTaskStatusProgress(action.id, 'REMOVE_RESOURCES', 'IN_PROGRESS', 0, () => {
        const resourcesRemoved = [];
        const resourcesToRemove = action.resourcesToRemove || (resourcesRemoved.length + 1);
        return {
          resourcesRemoved,
          resourcesToRemove
        };
      });
    }
    case bundleConstants.REMOVE_RESOURCES_UPDATED: {
      return updateTaskStatusProgress(action.id, 'REMOVE_RESOURCES', 'IN_PROGRESS', null, (bundle) => {
        const { resourceToRemove } = action;
        const originalResourceRemoved = bundle.resourcesRemoved || [];
        const resourcesRemoved = originalResourceRemoved.includes(resourceToRemove) ?
          resourcesRemoved : [...originalResourceRemoved, resourceToRemove];
        const resourcesToRemove = bundle.resourcesToRemove || [...resourcesRemoved, 'unknown'];
        const progress = calcProgress(resourcesRemoved.length, resourcesToRemove.length);
        const hasCompletedRemovingResources = progress === 100;
        const task = hasCompletedRemovingResources ? 'DOWNLOAD' : bundle.task;
        const status = hasCompletedRemovingResources ? 'NOT_STARTED' : bundle.status;
        return {
          task,
          status,
          progress,
          resourcesRemoved,
          resourcesToRemove
        };
      });
    }
    case bundleConstants.UPDATE_STATUS: {
      const progress = action.status === 'COMPLETED' ? 100 : null;
      return updateTaskStatusProgress(action.id, null, action.status, progress);
    }
    case bundleConstants.UPDATE_BUNDLE: {
      const { bundle } = action;
      return updateTaskStatusProgress(bundle.id, null, null, null, (bState) => {
        const updatedBundle = { ...bState, ...bundle };
        if (bState.isUploading) {
          return updateBundleItem(updatedBundle, 'UPLOAD', 'IN_PROGRESS', bState.progress);
        }
        return updateBundleItem(updatedBundle, bundle.task, bundle.status, bundle.progress);
      });
    }
    case bundleConstants.TOGGLE_SELECT: {
      const { selectedBundle, selectedDBLEntryId } = getSelectedState(state, action.selectedBundle);
      return {
        ...state,
        selectedBundle,
        selectedDBLEntryId
      };
    }
    case bundleConstants.SESSION_EVENTS_CONNECTED: {
      if (state.eventSource && state.eventSource.readyState !== 2) {
        state.eventSource.close();
        console.log('session EventSource closed');
      }
      return {
        ...state,
        eventSource: action.eventSource
      };
    }
    default:
      return state;
  }

  function calcProgress(itemsDone, itemsToDo) {
    return Math.floor((itemsDone / itemsToDo) * 100);
  }

  function updateTaskStatusProgress(bundleId, task, status, progress, updateDecorators) {
    const allBundles = updateBundleItems(bundleId, task, status, progress, updateDecorators);
    const { items } = sortAndFilterBundlesAsEntries(allBundles, false);
    const decoratedBundle = allBundles.find(bundle => bundle.id === bundleId);
    const { addedByBundleIds } = updateIndexedByIds(state, decoratedBundle);
    return {
      ...state,
      items,
      allBundles,
      addedByBundleIds
    };
  }

  function updateBundleItem(bundle, task, status, progress, updateDecorators) {
    return addBundleDecorators({
      ...bundle,
      task: (task || bundle.task),
      status: (status || bundle.status),
      progress: Number.isInteger(progress) ? progress : bundle.progress
    }, updateDecorators);
  }

  function updateBundleItems(bundleId, task, status, progress, updateDecorators) {
    return state.allBundles.map(bundle => (bundle.id === bundleId
      ? updateBundleItem(bundle, task, status, progress, updateDecorators)
      : bundle));
  }
}
export default bundles;

function addBundleDecorators(bundle, addCustomDecoration) {
  const isDownloaded = bundle.task === 'DOWNLOAD' && bundle.status === 'COMPLETED';
  const isUploaded = bundle.task === 'UPLOAD' && bundle.status === 'COMPLETED';
  const coreDecorated = { ...bundle, ...formatDisplayAs(bundle), isDownloaded, isUploaded };
  if (!addCustomDecoration) {
    return coreDecorated;
  }
  const customDecoration = addCustomDecoration(bundle, coreDecorated);
  return { ...coreDecorated, ...customDecoration };
}

function formatRevisionDisplayAs(bundle) {
  const { parent, revision } = bundle;
  if (!revision && !parent) {
    return 'Update';
  }
  if (parent || revision === '0') {
    const { revision: parentRevision = null } = parent || {};
    if (parentRevision && parent.dblId === bundle.dblId) {
      return `> Rev ${parentRevision}`;
    }
    return 'Rev 1 (New)';
  }
  return `Rev ${revision}`;
}

function formatDisplayAs(bundle) {
  const revision = formatRevisionDisplayAs(bundle);
  return {
    displayAs: {
      languageAndCountry: formatLanguageAndCountry(bundle),
      name: bundle.name,
      rightsHolders: bundle.rightsHolders,
      license: ['owned', 'open-access'].includes(bundle.license) ? bundle.license : `#${bundle.license}`,
      revision: (bundle.dblId ? revision : 'New'),
      status: formatStatus(bundle)
    }
  };
}

function formatLanguageAndCountry(bundle) {
  const { languageIso, countryIso } = bundle;
  return `${languageIso}-${countryIso}`;
}

function formatStatus(bundle) {
  const formattedProgress = formatProgress(bundle);
  const stored = (bundle.resourceCountStored === bundle.resourceCountManifest) ?
    bundle.resourceCountManifest : `${bundle.resourceCountStored}/${bundle.resourceCountManifest || '...'}`;
  let newStatusDisplayAs;
  if (bundle.isUploading) {
    const uploadingMessage = (!bundle.resourceCountStored || bundle.resourceCountStored === 0) ? 'metadata' : formattedProgress;
    newStatusDisplayAs = `Uploading ${uploadingMessage}`;
  } else if (bundle.task === 'UPLOAD' && bundle.status === 'IN_PROGRESS') {
    newStatusDisplayAs = 'Uploading';
  } else if (bundle.status === 'NOT_STARTED') {
    newStatusDisplayAs = 'Download';
  } else if (bundle.task === 'DOWNLOAD' && bundle.status === 'IN_PROGRESS') {
    newStatusDisplayAs = `Downloading ${formattedProgress}`;
  } else if (bundle.task === 'REMOVE_RESOURCES' && bundle.status === 'IN_PROGRESS') {
    newStatusDisplayAs = `Cleaning Resources ${formattedProgress}`;
  } else if (bundle.task === 'SAVETO' && bundle.status === 'IN_PROGRESS') {
    newStatusDisplayAs = `Saving to Folder ${formattedProgress}`;
  } else if (['UPLOAD', 'DOWNLOAD'].includes(bundle.task) && bundle.status === 'COMPLETED') {
    if (bundle.resourceCountStored) {
      newStatusDisplayAs = `Stored (${stored})`;
    } else {
      newStatusDisplayAs = 'Stored (metadata)';
    }
  } else if (['SAVETO'].includes(bundle.task) && bundle.status === 'COMPLETED') {
    newStatusDisplayAs = 'Open in Folder';
  } else if (bundle.status === 'DRAFT') {
    if (bundle.resourceCountStored) {
      newStatusDisplayAs = `DRAFT (${stored})`;
    } else {
      newStatusDisplayAs = 'DRAFT (metadata)';
    }
  } else {
    newStatusDisplayAs = bundle.statusDisplayAs || bundle.status;
  }
  return newStatusDisplayAs;
}

function formatProgress(bundle) {
  const progress = bundle.progress ? bundle.progress : 0;
  return `(${progress}%)`;
}
