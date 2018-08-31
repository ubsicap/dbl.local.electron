import { bundleResourceManagerConstants } from '../constants/bundleResourceManager.constants';

const initialState = {
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
    case bundleResourceManagerConstants.GET_MANIFEST_RESOURCES_RESPONSE: {
      const { manifestResources: rawManifestResources, storedFiles } = action;
      return {
        ...state,
        rawManifestResources,
        storedFiles
      };
    }
    case bundleResourceManagerConstants.GET_BUNDLE_PUBLICATIONS_HEALTH_ERROR: {
      const {
        error, publications, errorMessage, navigation
      } = action;
      return {
        ...state,
        publicationsHealth: {
          error, publications, errorMessage, navigation
        }
      };
    }
    case bundleResourceManagerConstants.GET_BUNDLE_PUBLICATIONS_HEALTH_SUCCESS: {
      const { publications } = action;
      return {
        ...state,
        publicationsHealth: { publications }
      };
    }
    default: {
      return state;
    }
  }
}

export default bundleManageResources;
