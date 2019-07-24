import { workspaceConstants } from '../constants/workspace.constants';
import { entryAppBarConstants } from '../constants/entryAppBar.constants';

const initialState = {};

export function workspace(state = initialState, action) {
  switch (action.type) {
    case entryAppBarConstants.RESET_ENTRY_APP_BAR:
      return initialState;
    case workspaceConstants.GOT_METADATA_FILE_CHECKSUM: {
      const { templateFilePath, templateMedium, templateChecksum } = action;
      return {
        ...state,
        templateFilePath,
        templateMedium,
        templateChecksum
      };
    }
    default:
      return state;
  }
}

export default workspace;
