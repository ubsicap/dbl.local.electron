import { dblDotLocalConfig } from '../constants/dblDotLocal.constants';
import { dblDotLocalService } from '../services/dbl_dot_local.service';
import { history } from '../store/configureStore';
import { navigationConstants } from '../constants/navigation.constants';
import { utilities } from '../utils/utilities';
import { alertActions } from '../actions/alert.actions';

export const dblDotLocalConfigActions = {
  getDblDotLocalExecStatus,
  loadHtmlBaseUrl,
  gotoWorkspaceLoginPage
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
      dispatch(failure(errorMsg));
    }
  };
  function requestBaseUrl() {
    return { type: dblDotLocalConfig.HTML_BASE_URL_REQUEST };
  }
  function success(dblBaseUrl) {
    return { type: dblDotLocalConfig.HTML_BASE_URL_RESPONSE, dblBaseUrl };
  }
  function failure(error) {
    return { type: dblDotLocalConfig.CONFIG_REQUEST_FAILURE, error };
  }
}

export function getDblDotLocalExecStatus() {
  return async dispatch => {
    const { isRunning } = await dblDotLocalService.getDblDotLocalExecStatus();
    return dispatch({ type: dblDotLocalConfig.DBL_DOT_LOCAL_PROCESS_STATUS, isRunning });
  };
}

export function gotoWorkspaceLoginPage(workspace) {
  return async dispatch => {
    try {
      if (!workspace) {
        history.push(navigationConstants.NAVIGATION_UNKNOWN_WORKSPACE_LOGIN);
        return;
      }
      await dblDotLocalService.updateConfigXmlWithNewPaths(workspace);
      const { fullPath: workspaceFullPath, name: workspaceName } = workspace;
      const configXmlFile = dblDotLocalService.getConfigXmlFullPath(workspace);
      const dblDotLocalExecProcess = await dblDotLocalService.startDblDotLocal(configXmlFile);
      dblDotLocalExecProcess.stderr.on('data', (data) => {
        // log.error(data);
        const [, errorMessage] = `${data}`.split('dbl_dot_local.dbl_app.DblAppException:');
        if (errorMessage) {
          dispatch(alertActions.error({ message: errorMessage }));
        }
      });
      ['error', 'close', 'exit'].forEach(event => {
        dblDotLocalExecProcess.on(event, (dblDotLocalExecProcessCode) => {
          dispatch({
            type: dblDotLocalConfig.STOP_WORKSPACE_PROCESS_DONE,
            dblDotLocalExecProcess,
            dblDotLocalExecProcessCode
          });
          dispatch(getDblDotLocalExecStatus());
        });
        dispatch(setWorkspaceFullPath(workspaceFullPath, configXmlFile, dblDotLocalExecProcess));
        const loginUrl =
          utilities.buildRouteUrl(
            navigationConstants.NAVIGATION_WORKSPACE_LOGIN,
            { workspaceName }
          );
        history.push(loginUrl);
      });
    } catch (error) {
      console.log(error);
    }
  };
  function setWorkspaceFullPath(fullPath, configXmlFile, dblDotLocalExecProcess) {
    return {
      type: dblDotLocalConfig.START_WORKSPACE_PROCESS,
      fullPath,
      configXmlFile,
      dblDotLocalExecProcess
    };
  }
}
