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
    default: {
      return state;
    }
  }
}

export default bundleManageResources;
