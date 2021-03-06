import { bundleResourceManagerConstants } from '../constants/bundleResourceManager.constants';
import { bundleConstants } from '../constants/bundle.constants';
import { utilities } from '../utils/utilities';
import { bundleEditMetadataConstants } from '../constants/bundleEditMetadata.constants';

const initialState = {
  isStoreMode: true,
  bundleId: null,
  mode: null,
  publicationsHealth: null
};

export function bundleManageResources(state = initialState, action) {
  switch (action.type) {
    case bundleResourceManagerConstants.OPEN_RESOURCE_MANAGER: {
      const { bundleId, mode } = action;
      return {
        ...initialState,
        bundleId,
        mode
      };
    }
    case bundleResourceManagerConstants.CLOSE_RESOURCE_MANAGER: {
      return initialState;
    }
    case bundleEditMetadataConstants.CLOSE_EDIT_METADATA: {
      return initialState;
    }
    case bundleConstants.UPDATE_BUNDLE: {
      const {
        mode
      } = action.bundle;
      if (action.bundle.id !== state.bundleId) {
        return state;
      }
      const isStoreMode = mode === 'store';
      return {
        ...state,
        isStoreMode
      };
    }
    case bundleResourceManagerConstants.UPDATE_MANIFEST_RESOURCES_REQUEST: {
      const {
        bundleId,
        fileToContainerPaths
      } = action;
      return {
        ...state,
        loading: true,
        progress: 0,
        updatingManifest: {
          bundleId,
          fileToContainerPaths
        }
      };
    }
    case bundleResourceManagerConstants.UPDATE_MANIFEST_RESOURCE_RESPONSE: {
      const {
        filePath,
      } = action;
      const { fileToContainerPaths, filesCompleted: filesCompletedPrev = [] }
       = state.updatingManifest;
      const filesCompleted = [...filesCompletedPrev, filePath];
      const filesDone = filesCompleted.length;
      const filesTotal = Object.keys(fileToContainerPaths).length;
      const progress = utilities.calculatePercentage(filesDone, filesTotal);
      const loading = state.loading && filesDone < filesTotal;
      return {
        ...state,
        loading,
        progress,
        updatingManifest: {
          ...state.updatingManifest,
          filesCompleted
        }
      };
    }
    case bundleResourceManagerConstants.UPDATE_MANIFEST_RESOURCE_DONE: {
      return {
        ...state,
        loading: false
      };
    }
    case bundleConstants.CREATE_FROM_DBL_REQUEST: {
      return {
        ...state,
        fetchingMetadata: true
      };
    }
    case bundleConstants.CREATE_FROM_DBL_SUCCESS: {
      return {
        ...state,
        fetchingMetadata: false
      };
    }
    case bundleConstants.CREATE_FROM_DBL_ERROR: {
      return {
        ...state,
        fetchingMetadata: false
      };
    }
    case bundleResourceManagerConstants.GET_BUNDLE_PUBLICATIONS_HEALTH_ERROR: {
      const {
        error, publications, errorMessage, goFix
      } = action;
      return {
        ...state,
        publicationsHealth: {
          error, publications, errorMessage, goFix
        }
      };
    }
    case bundleResourceManagerConstants.GET_BUNDLE_PUBLICATIONS_HEALTH_SUCCESS: {
      const {
        publications, medium, message, wizardsResults
      } = action;
      return {
        ...state,
        publicationsHealth: {
          publications, medium, message, wizardsResults
        }
      };
    }
    case bundleResourceManagerConstants.MAPPER_REPORT_SUCCESS: {
      const {
        uris, direction, report, options, overwrites
      } = action;
      const { mapperReports: mapperReportsOrig } = state;
      return {
        ...state,
        mapperReports: {
          ...mapperReportsOrig,
          [direction]: {
            uris, report, options, overwrites
          }
        }
      };
    }
    case bundleResourceManagerConstants.MAPPERS_SELECTED: {
      const { direction, mapperIds } = action;
      const { selectedMappers: selectedMappersOrig } = state;
      return {
        ...state,
        selectedMappers: { ...selectedMappersOrig, [direction]: mapperIds }
      };
    }

    case bundleResourceManagerConstants.UPDATE_ADDED_FILEPATHS:
    case bundleResourceManagerConstants.UPDATE_FILE_STATS_SIZES:
    case bundleResourceManagerConstants.EDIT_RESOURCE_CONTAINERS: {
      return updateStateFromActionProps();
    }
    default: {
      return state;
    }
  }

  function updateStateFromActionProps() {
    const { type, ...restProps } = action;
    return {
      ...state,
      ...restProps
    };
  }
}

export default bundleManageResources;

