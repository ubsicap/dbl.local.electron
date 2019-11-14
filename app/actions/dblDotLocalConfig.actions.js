import log from 'electron-log';
import dblDotLocalConstants from '../constants/dblDotLocal.constants';
import { dblDotLocalService } from '../services/dbl_dot_local.service';
import { history } from '../store/configureStore';
import { navigationConstants } from '../constants/navigation.constants';
import { utilities } from '../utils/utilities';
import { alertActions } from './alert.actions';

export const dblDotLocalConfigActions = {
  getDblDotLocalExecStatus,
  loadHtmlBaseUrl,
  gotoWorkspaceLoginPage,
  incrementErrorLogCount,
  resetErrorLogCount
};

export default dblDotLocalConfigActions;

export function loadHtmlBaseUrl() {
  return async dispatch => {
    dispatch(requestBaseUrl());
    try {
      const readable = await dblDotLocalService.htmlBaseUrl();
      const dblBaseUrl = await readable.text();
      dispatch(success(dblBaseUrl));
    } catch (readableError) {
      const errorMsg = await readableError.text();
      log.error(errorMsg);
      dispatch(failure(errorMsg));
    }
  };
  function requestBaseUrl() {
    return { type: dblDotLocalConstants.HTML_BASE_URL_REQUEST };
  }
  function success(dblBaseUrl) {
    return { type: dblDotLocalConstants.HTML_BASE_URL_RESPONSE, dblBaseUrl };
  }
  function failure(error) {
    return { type: dblDotLocalConstants.CONFIG_REQUEST_FAILURE, error };
  }
}

export function getDblDotLocalExecStatus() {
  return async dispatch => {
    const { isRunning } = await dblDotLocalService.getDblDotLocalExecStatus();
    return dispatch({
      type: dblDotLocalConstants.DBL_DOT_LOCAL_PROCESS_STATUS,
      isRunning
    });
  };
}

export function gotoWorkspaceLoginPage(workspace) {
  return async dispatch => {
    try {
      if (!workspace) {
        dispatch({
          type: navigationConstants.NAVIGATION_ACTIVITY,
          url: navigationConstants.NAVIGATION_UNKNOWN_WORKSPACE_LOGIN,
          workspace: 'UNKNOWN_WORKSPACE'
        });
        history.push(navigationConstants.NAVIGATION_UNKNOWN_WORKSPACE_LOGIN);
        return;
      }
      await dblDotLocalService.updateConfigXmlWithNewPaths(workspace);
      const { fullPath: workspaceFullPath, name: workspaceName } = workspace;
      const configXmlFile = dblDotLocalService.getConfigXmlFullPath(workspace);
      const dblDotLocalExecProcess = await dblDotLocalService.startDblDotLocal(
        configXmlFile
      );
      dblDotLocalExecProcess.stderr.on('data', data => {
        const dataString = `${data}`;
        const [, errorMessage] = dataString.split(
          'dbl_dot_local.dbl_app.DblAppException:'
        );
        if (errorMessage) {
          dispatch(alertActions.error({ message: errorMessage }));
        } else if (dataString.includes('File "')) {
          log.error(dataString, {
            [dblDotLocalConstants.DDL_APPENDER_ID]: true
          });
        }
      });
      ['error', 'close', 'exit'].forEach(event => {
        dblDotLocalExecProcess.on(event, dblDotLocalExecProcessCode => {
          dispatch({
            type: dblDotLocalConstants.STOP_WORKSPACE_PROCESS_DONE,
            dblDotLocalExecProcess,
            dblDotLocalExecProcessCode
          });
          dispatch(getDblDotLocalExecStatus());
        });
        dispatch(
          setWorkspaceFullPath(
            workspaceFullPath,
            configXmlFile,
            dblDotLocalExecProcess
          )
        );
        const loginUrl = utilities.buildRouteUrl(
          navigationConstants.NAVIGATION_WORKSPACE_LOGIN,
          { workspaceName }
        );
        dispatch({
          type: navigationConstants.NAVIGATION_ACTIVITY,
          url: loginUrl,
          workspace: workspaceName
        });
        history.push(loginUrl);
      });
    } catch (error) {
      log.error(error);
    }
  };
  function setWorkspaceFullPath(
    fullPath,
    configXmlFile,
    dblDotLocalExecProcess
  ) {
    return {
      type: dblDotLocalConstants.START_WORKSPACE_PROCESS,
      fullPath,
      configXmlFile,
      dblDotLocalExecProcess
    };
  }
}

export function incrementErrorLogCount() {
  return { type: dblDotLocalConstants.DDL_ERROR_LOG_COUNT_INCREMENT };
}

export function resetErrorLogCount() {
  return { type: dblDotLocalConstants.DDL_ERROR_LOG_COUNT_RESET };
}
