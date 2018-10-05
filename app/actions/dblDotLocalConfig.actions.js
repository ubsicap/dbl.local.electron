import path from 'path';
import { dblDotLocalConfig } from '../constants/dblDotLocal.constants';
import { dblDotLocalService } from '../services/dbl_dot_local.service';
import { history } from '../store/configureStore';
import { navigationConstants } from '../constants/navigation.constants';

export const dblDotLocalConfigActions = {
  loadHtmlBaseUrl,
  loginToWorkspace
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

export function loginToWorkspace(workspaceFullPath) {
  return async dispatch => {
    try {
      const configXmlFile = path.join(workspaceFullPath, 'config.xml');
      await dblDotLocalService.ensureDblDotLocal(configXmlFile);
      dispatch(setWorkspaceFullPath(workspaceFullPath));
      history.push(navigationConstants.NAVIGATION_LOGIN);
    } catch (error) {
      console.log(error);
    }
  };
  function setWorkspaceFullPath(fullPath, configXmlFile) {
    return { type: dblDotLocalConfig.SET_WORKSPACE, fullPath, configXmlFile };
  }
}
