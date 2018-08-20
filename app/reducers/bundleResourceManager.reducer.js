import path from 'path';
import { bundleResourceManagerConstants } from '../constants/bundleResourceManager.constants';

const initialState = {
  bundleId: null
};

export function bundleManageResources(state = initialState, action) {
  switch (action.type) {
    case bundleResourceManagerConstants.OPEN_RESOURCE_MANAGER: {
      const { bundleId } = action;
      return {
        bundleId
      };
    }
    case bundleResourceManagerConstants.CLOSE_RESOURCE_MANAGER: {
      return initialState;
    }
    case bundleResourceManagerConstants.MANIFEST_RESOURCES_RESPONSE: {
      const { manifestResources: rawManifestResources } = action;
      return {
        ...state,
        rawManifestResources
      };
    }
    default: {
      return state;
    }
  }
}

export default bundleManageResources;
