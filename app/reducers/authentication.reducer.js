import { userConstants } from '../constants';

const user = JSON.parse(localStorage.getItem('user'));
const initialState = user ? { loggedIn: true, user } : { loggedIn: false };

export function authentication(state = initialState, action) {
  switch (action.type) {
    case userConstants.LOGIN_REQUEST:
      return {
        loggedIn: false,
        loggingIn: true,
        user: action.user
      };
    case userConstants.LOGIN_SUCCESS:
      return {
        loggedIn: true,
        user: action.user,
        whoami: action.whoami
      };
    case userConstants.LOGIN_FAILURE:
      return {
        loggedIn: false,
        error: action.error
      };
    case userConstants.LOGOUT_SUCCESS:
      return {
        loggedIn: false,
        loggedOut: true,
      };
    case userConstants.LOGOUT_WITH_ERROR:
      return {
        loggedIn: false,
        loggedOut: true,
        error: action.error
      };
    default:
      return state;
  }
}

export default authentication;
