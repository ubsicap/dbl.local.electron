import dblDotLocalConfigConstants from '../constants/dblDotLocal.constants';

const initialState = {
  dblBaseUrl: null
};

export function dblDotLocalConfig(state = initialState, action) {
  switch (action.type) {
    case dblDotLocalConfigConstants.DBL_DOT_LOCAL_PROCESS_STATUS: {
      const { isRunning: isRunningDblDotLocalProcess } = action;
      return {
        ...state,
        isRunningDblDotLocalProcess
      };
    }
    case dblDotLocalConfigConstants.START_WORKSPACE_PROCESS: {
      const { configXmlFile, dblDotLocalExecProcess } = action;
      if (dblDotLocalExecProcess) {
        return {
          ...state,
          configXmlFile,
          dblDotLocalExecProcess,
          processStarted: true,
        };
      }
      return state;
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
          processStopped: true,
        };
      }
      return state;
    }
    case dblDotLocalConfigConstants.HTML_BASE_URL_RESPONSE:
    {
      const { dblBaseUrl } = action;
      // dblDotLocalConfig.HTML_BASE_URL_RESPONSE, dblBaseUrl
      return {
        dblBaseUrl
      };
    }
    default:
      return state;
  }
}

export default dblDotLocalConfig;
