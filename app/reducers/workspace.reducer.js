import { workspaceConstants } from '../constants/workspace.constants';
import dblDotLocalConfigConstants from '../constants/dblDotLocal.constants';

const initialState = {
};

export function workspace(state = initialState, action) {
  switch (action.type) {
    case dblDotLocalConfigConstants.START_WORKSPACE_PROCESS: {
      const { configXmlFile, fullPath } = action;
      if (dblDotLocalExecProcess) {
        return {
          ...state,
          configXmlFile,
          dblDotLocalExecProcess,
          isRunningKnownDblLocalProcess: true,
          isRunningUnknownDblDotLocalProcess: false
        };
      }
      return state;
    }
    default:
      return state;
  }
}

export default workspace;

