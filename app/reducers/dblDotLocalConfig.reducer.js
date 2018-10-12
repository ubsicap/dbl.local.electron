import dblDotLocalConfigConstants from '../constants/dblDotLocal.constants';

const initialState = {
  dblBaseUrl: null
};

export function dblDotLocalConfig(state = initialState, action) {
  switch (action.type) {
    case dblDotLocalConfigConstants.DBL_DOT_LOCAL_PROCESS_STATUS: {
      const { isRunning: isRunningUnknownDblDotLocalProcess } = action;
      return {
        ...state,
        isRunningUnknownDblDotLocalProcess
      };
    }
    case dblDotLocalConfigConstants.START_WORKSPACE_PROCESS: {
      const { configXmlFile, dblDotLocalExecProcess } = action;
      if (dblDotLocalExecProcess) {
        return {
          ...state,
          configXmlFile,
          dblDotLocalExecProcess,
          isRunningKnownDblLocalProcess: true
        };
      }
      return state;
    }
    case dblDotLocalConfigConstants.STOP_WORKSPACE_PROCESS_REQUEST: {
      return {
        ...state,
        isRequestingStopDblDotLocalExecProcess: true
      };
    }
    case dblDotLocalConfigConstants.STOP_WORKSPACE_PROCESS_DONE: {
      const { configXmlFile } = state;
      const { dblDotLocalExecProcess, dblDotLocalExecProcessCode } = action;
      if (dblDotLocalExecProcess) {
        return {
          ...state,
          configXmlFile,
          dblDotLocalExecProcess,
          dblDotLocalExecProcessCode,
          isRunningKnownDblLocalProcess: false,
          dblBaseUrl: null,
          isRequestingStopDblDotLocalExecProcess: false
        };
      }
      return state;
    }
    case dblDotLocalConfigConstants.HTML_BASE_URL_RESPONSE:
    {
      const { dblBaseUrl } = action;
      return {
        ...state,
        dblBaseUrl
      };
    }
    default:
      return state;
  }
}

export default dblDotLocalConfig;
