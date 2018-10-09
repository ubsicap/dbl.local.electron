import { userConstants } from '../constants';
import { userService } from '../services';
import { alertActions } from './';
import { history } from '../store/configureStore';
import { dblDotLocalConfig } from '../constants/dblDotLocal.constants';
import { navigationConstants } from '../constants/navigation.constants';

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
        dblDotLocalConfig.getHttpDblDotLocalBaseUrl()
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
      dispatch(success(user, whoami, _workspaceName));
      history.push(navigationConstants.NAVIGATION_BUNDLES);
    } catch (error) {
      dispatch(failure(error));
      const errorMsg = formatErrorMessage(error, dblDotLocalConfig);
      dispatch(alertActions.error({ error, message: errorMsg }));
      return true;
    }
  };

  function request(user, workspaceName) {
    return { type: userConstants.LOGIN_REQUEST, user, workspaceName };
  }
  function success(user, whoami, workspaceName) {
    return { type: userConstants.LOGIN_SUCCESS, user, whoami, workspaceName };
  }
  function failure(error) {
    return { type: userConstants.LOGIN_FAILURE, error };
  }
}

function logout() {
  return dispatch => {
    const user = userService.getUser();
    dispatch(request({ user }));
    userService
      .logout()
      .then(() => {
        dispatch(success(user));
        return true;
      })
      .catch(error => {
        dispatch(failure({ user, error }));
        const message = formatErrorMessage(error, dblDotLocalConfig);
        dispatch(alertActions.error({ error, message }));
        return true;
      });
  };
  function request(_user) {
    return { type: userConstants.LOGOUT_REQUEST, _user };
  }
  function success(_user) {
    return { type: userConstants.LOGOUT_SUCCESS, _user };
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
