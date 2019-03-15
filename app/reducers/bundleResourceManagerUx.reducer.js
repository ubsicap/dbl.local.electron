import { bundleResourceManagerConstants } from '../constants/bundleResourceManager.constants';
import { bundleEditMetadataConstants } from '../constants/bundleEditMetadata.constants';

const initialState = {
  bundleId: null,
  mode: null
};

export function bundleManageResourcesUx(state = initialState, action) {
  switch (action.type) {
    case bundleResourceManagerConstants.OPEN_RESOURCE_MANAGER: {
      const { bundleId, mode } = action;
      return {
        ...initialState,
        bundleId,
        mode,
        autoSelectAllResources: mode === 'download'
      };
    }
    case bundleResourceManagerConstants.CLOSE_RESOURCE_MANAGER: {
      return initialState;
    }
    case bundleEditMetadataConstants.CLOSE_EDIT_METADATA: {
      return initialState;
    }
    case bundleResourceManagerConstants.RESOURCES_SELECTED: {
      const { selectedResourceIds } = action;
      return {
        ...state,
        selectedResourceIds,
        autoSelectAllResources: false
      };
    }
    case bundleResourceManagerConstants.REVISIONS_SELECTED: {
      const { selectedRevisionIds } = action;
      return {
        ...state,
        selectedRevisionIds
      };
    }
    default: {
      return state;
    }
  }
}

export default bundleManageResourcesUx;

