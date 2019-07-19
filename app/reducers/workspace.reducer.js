import { workspaceConstants } from '../constants/workspace.constants';

const initialState = {
  openDrawer: false
};

export function entryAppBar(state = initialState, action) {
  switch (action.type) {
    case workspaceConstants.RESET_ENTRY_APP_BAR:
    case workspaceConstants.OPEN_ENTRY:
    case workspaceConstants.CLOSE_ENTRY: {
      return initialState;
    }
    case workspaceConstants.OPEN_ENTRY_DRAWER: {
      return {
        ...state,
        openDrawer: true
      };
    }
    case workspaceConstants.CLOSE_ENTRY_DRAWER: {
      return {
        ...state,
        openDrawer: false,
      };
    }
    default:
      return state;
  }
}

export default workspace;

