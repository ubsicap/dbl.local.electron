import { bundleConstants } from '../constants/bundle.constants';

export function bundles(state = {}, action) {
  switch (action.type) {
    case bundleConstants.FETCH_REQUEST:
      return {
        loading: true
      };
    case bundleConstants.FETCH_SUCCESS:
      return {
        items: action.bundles.map(bundle => addBundleDecorators(bundle))
      };
    case bundleConstants.FETCH_FAILURE:
      return {
        error: action.error
      };
    case bundleConstants.DELETE_REQUEST:
      // add 'deleting:true' property to bundle being deleted
      return {
        ...state,
        items: state.items.map(bundle =>
          (bundle.id === action.id
            ? { ...bundle, deleting: true }
            : bundle))
      };
    case bundleConstants.DOWNLOAD_RESOURCES_REQUEST: {
      return updateTaskStatusProgress(action.id, 'DOWNLOAD', 'IN_PROGRESS', 0);
    }
    case bundleConstants.DOWNLOAD_RESOURCES_UPDATED: {
      const progress = Math.floor((action.resourcesDownloaded / action.resourcesToDownload) * 100);
      const status = progress === 100 ? 'COMPLETED' : 'IN_PROGRESS';
      return updateTaskStatusProgress(action.id, 'DOWNLOAD', status, progress);
    }
    case bundleConstants.SAVETO_REQUEST: {
      return updateTaskStatusProgress(action.id, 'SAVETO', 'IN_PROGRESS', 0);
    }
    case bundleConstants.SAVETO_UPDATED: {
      const progress = calcProgress(action.bundleBytesSaved, action.bundleBytesToSave);
      const status = progress === 100 ? 'COMPLETED' : 'IN_PROGRESS';
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
        const resourcesToRemove = bundle.resourcesToRemove || (resourcesRemoved.length + 1);
        return {
          progress: calcProgress(resourcesRemoved, resourcesToRemove),
          resourcesRemoved,
          resourcesToRemove
        };
      });
    }
    case bundleConstants.UPDATE_STATUS: {
      const progress = action.status === 'COMPLETED' ? 100 : null;
      return updateTaskStatusProgress(action.id, null, action.status, progress, (bundle) => {
        const hasCompletedRemovingResources = action.status === 'COMPLETED' && bundle.task === 'REMOVE_RESOURCES';
        const task = hasCompletedRemovingResources ? 'DOWNLOAD' : bundle.task;
        const status = hasCompletedRemovingResources ? 'NOT_STARTED' : bundle.status;
        return {
          task,
          status
        };
      });
    }
    case bundleConstants.TOGGLE_MODE_PAUSE_RESUME: {
      const updatedItems = forkArray(
        state.items,
        bundle => bundle.id === action.id,
        bundle => buildToggledBundle(bundle)
      );
      return {
        ...state,
        items: updatedItems
      };
    }
    case bundleConstants.TOGGLE_SELECT: {
      const selectedBundle = state.selectedBundle && state.selectedBundle.id === action.id ?
        {} : state.items.find(bundle => bundle.id === action.id);
      return {
        selectedBundle,
        items: state.items
      };
    }
    case bundleConstants.DELETE_FAILURE:
      // remove 'deleting:true' property and add 'deleteError:[error]' property to bundle
      return {
        ...state,
        items: state.items.map(bundle => {
          if (bundle.id === action.id) {
            // make copy of bundle without 'deleting:true' property
            const { deleting, ...bundleCopy } = bundle;
            // return copy of bundle with 'deleteError:[error]' property
            return { ...bundleCopy, deleteError: action.error };
          }
          return bundle;
        })
      };
    default:
      return state;
  }

  function calcProgress(itemsDone, itemsToDo) {
    return Math.floor((itemsDone / itemsToDo) * 100);
  }

  function updateTaskStatusProgress(bundleId, task, status, progress, updateDecorators) {
    const items = state.items.map(bundle => (bundle.id === bundleId
      ? addBundleDecorators({
        ...bundle,
        task: (task || bundle.task),
        status: (status || bundle.status),
        progress: Number.isInteger(progress) ? progress : bundle.progress,
        ...(updateDecorators ? updateDecorators(bundle) : {})
      })
      : bundle));
    return {
      ...state,
      items
    };
  }
}
export default bundles;

function forkArray(array, condition, createItem) {
  return array.map((item, index) => (condition(item, index) ? createItem(item) : item));
}

function buildToggledBundle(bundle) {
  const newMode = bundle.status === 'NOT_STARTED' || bundle.mode === 'PAUSED' ? 'RUNNING' : 'PAUSED';
  const newStatus = bundle.status === 'NOT_STARTED' ? `${bundle.task}ING` : bundle.status;
  const updatedBundle = {
    ...bundle,
    status: newStatus,
    mode: newMode,
  };
  return addBundleDecorators(updatedBundle);
}

function addBundleDecorators(bundle) {
  return { ...bundle, ...formatDisplayAs(bundle), isDownloaded: (bundle.status) === 'COMPLETED' };
}


function formatDisplayAs(bundle) {
  return {
    displayAs: {
      name: bundle.name || bundle.nameDisplayAs,
      revision: `Revision ${bundle.revision || '0'}`,
      status: formatStatus(bundle)
    }
  };
}

function formatStatus(bundle) {
  const formattedProgress = formatProgress(bundle);
  let newStatusDisplayAs;
  if (bundle.status === 'NOT_STARTED') {
    newStatusDisplayAs = 'Download';
  } else if (bundle.task === 'UPLOAD' && bundle.status === 'IN_PROGRESS') {
    newStatusDisplayAs = `Uploading ${formattedProgress}`;
  } else if (bundle.task === 'DOWNLOAD' && bundle.status === 'IN_PROGRESS') {
    newStatusDisplayAs = `Downloading ${formattedProgress}`;
  } else if (bundle.task === 'REMOVE_RESOURCES' && bundle.status === 'IN_PROGRESS') {
    newStatusDisplayAs = `Cleaning Resources ${formattedProgress}`;
  } else if (bundle.task === 'SAVETO' && bundle.status === 'IN_PROGRESS') {
    newStatusDisplayAs = `Saving to Folder ${formattedProgress}`;
  } else if (['UPLOAD', 'DOWNLOAD'].includes(bundle.task) && bundle.status === 'COMPLETED') {
    newStatusDisplayAs = `${bundle.task}ED`;
  } else if (['SAVETO'].includes(bundle.task) && bundle.status === 'COMPLETED') {
    newStatusDisplayAs = 'Open in Folder';
  } else {
    newStatusDisplayAs = bundle.statusDisplayAs || bundle.status;
  }
  return newStatusDisplayAs;
}

function formatProgress(bundle) {
  const progress = bundle.progress ? bundle.progress : 0;
  return `(${progress}%)`;
}
