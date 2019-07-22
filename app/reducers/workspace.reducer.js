import { workspaceConstants } from '../constants/workspace.constants';
import dblDotLocalConfigConstants from '../constants/dblDotLocal.constants';

const initialState = {
};

export function workspace(state = initialState, action) {
  switch (action.type) {
    case workspaceConstants.GOT_METADATA_FILE_CHECKSUM: {
      const {
        templateFilePath,
        templateMedium,
        templateChecksum
      } = action;
      return {
        ...state,
        templateFilePath,
        templateMedium,
        templateChecksum
      };
      return state;
    }
    default:
      return state;
  }
}

export default workspace;

