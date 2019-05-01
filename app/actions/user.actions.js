import log from 'electron-log';
import path from 'path';
import { userConstants } from '../constants';
import { userService } from '../services';
import { alertActions } from '../actions/alert.actions';
import { history } from '../store/configureStore';
import dblDotLocalConstants from '../constants/dblDotLocal.constants';
import { dblDotLocalService } from '../services/dbl_dot_local.service';
import { workspaceUserSettingsStoreServices } from '../services/workspaces.service';
import { navigationConstants } from '../constants/navigation.constants';
import { setupBundlesEventSource } from '../actions/bundle.actions';
import { clipboardActions } from '../actions/clipboard.actions';
import { reportActions } from '../actions/report.actions';

const electron = require('electron');

const { remote = {} } = electron;

export const userActions = {
  login,
  logout,
  getAll
};

export default userActions;

function formatErrorMessage(error) {
  let errorMsg = error.toString();
  if (error.messageDisplayAs) {
    errorMsg = error.messageDisplayAs;
  } else if (error.message) {
    if (error.message === 'Failed to fetch') {
      errorMsg = `${
        error.message
      }. Check that 'DBL dot Local' process is running at ${
        dblDotLocalConstants.getHttpDblDotLocalBaseUrl()
      }`;
    } else {
      errorMsg = error.message;
    }
  }
  return errorMsg;
}

function login(username, password, _workspaceName) {
  return async dispatch => {
    dispatch(request({ username }, _workspaceName));
    try {
      const user = await userService.login(username, password);
      const whoami = await userService.whoami();
      const workspacesLocation = dblDotLocalService.getWorkspacesDir();
      const workspaceFullPath = path.join(workspacesLocation, _workspaceName);
      workspaceUserSettingsStoreServices.saveUserLogin(workspaceFullPath, username);
      dispatch(success(user, whoami, _workspaceName));
      dispatch(connectSSE(user.auth_token));
      dispatch(startPowerMonitor());
      history.push(navigationConstants.NAVIGATION_BUNDLES);
    } catch (error) {
      dispatch(failure(error));
      const errorMsg = formatErrorMessage(error, dblDotLocalConstants);
      dispatch(alertActions.error({ error, message: errorMsg }));
      return true;
    }
  };

  function request(user, workspaceName) {
    return { type: userConstants.LOGIN_REQUEST, user, workspaceName };
  }
  function success(user, whoami, workspaceName) {
    return {
      type: userConstants.LOGIN_SUCCESS, user, whoami, workspaceName
    };
  }
  function failure(error) {
    return { type: userConstants.LOGIN_FAILURE, error };
  }
}

function connectSSE(authToken) {
  return (dispatch, getState) => {
    const eventSource = dblDotLocalService.startEventSource(authToken, getState);
    dispatch({ type: userConstants.SERVER_SENT_EVENTS_SOURCE_CREATED, eventSource });
    dispatch(clipboardActions.setupClipboardListeners());
    dispatch(reportActions.setupReportListeners());
  };
}

function startPowerMonitor() {
  return (dispatch, getState) => {
    remote.powerMonitor.on('resume', () => {
      console.log('The system is resuming. Checking SSE...');
      const { authentication } = getState();
      const { user, eventSource } = authentication;
      if (user && user.auth_token && eventSource &&
          dblDotLocalService.getIsClosedEventSource(eventSource)) {
        console.log('SSE eventSource was closed. Re-establishing');
        dispatch(connectSSE(user.auth_token));
        dispatch(setupBundlesEventSource());
      }
    });
  };
}

function killSpawnedDblDotLocalExecProcess() {
  return (dispatch, getState) => {
    const { dblDotLocalConfig } = getState();
    const {
      dblDotLocalExecProcess = null, isRunningUnknownDblDotLocalProcess
    } = dblDotLocalConfig || {};
    if (isRunningUnknownDblDotLocalProcess) {
      return;
    }
    if (dblDotLocalExecProcess) {
      dblDotLocalExecProcess.kill();
      dispatch({ type: dblDotLocalConstants.STOP_WORKSPACE_PROCESS_REQUEST, dblDotLocalExecProcess });
    }
  };
}

export function logout() {
  return dispatch => {
    const user = userService.getUser();
    dispatch(request({ user }));
    userService
      .logout()
      .then(() => {
        dispatch(killSpawnedDblDotLocalExecProcess());
        return user;
      })
      .then(() => {
        dispatch(success(user));
        return user;
      })
      .catch(error => {
        dispatch(failure({ user, error }));
        const message = formatErrorMessage(error, dblDotLocalConstants);
        dispatch(alertActions.error({ error, message }));
      });
  };
  function request(user) {
    return { type: userConstants.LOGOUT_REQUEST, user };
  }
  function success(user) {
    return { type: userConstants.LOGOUT_SUCCESS, user };
  }
  function failure(error) {
    return { type: userConstants.LOGOUT_WITH_ERROR, error };
  }
}

function getAll() {
  return dispatch => {
    dispatch(request());

    return userService
      .getAll()
      .then(
        users => dispatch(success(users)),
        error => dispatch(failure(error))
      );
  };

  function request() {
    return { type: userConstants.GETALL_REQUEST };
  }
  function success(users) {
    return { type: userConstants.GETALL_SUCCESS, users };
  }
  function failure(error) {
    return { type: userConstants.GETALL_FAILURE, error };
  }
}
