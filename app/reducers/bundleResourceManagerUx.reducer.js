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
      return updateStateFromActionProps({ autoSelectAllResources: false });
    }
    case bundleResourceManagerConstants.UPDATE_MAIN_TABLE_SORT_ORDER:
    case bundleResourceManagerConstants.REVISIONS_SELECTED: {
      return updateStateFromActionProps();
    }
    default: {
      return state;
    }
  }
  function updateStateFromActionProps(appendProps = {}) {
    const { type, ...restProps } = action;
    return {
      ...state,
      ...restProps,
      ...appendProps
    };
  }
}

export default bundleManageResourcesUx;

