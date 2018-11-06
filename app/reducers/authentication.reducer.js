import { userConstants } from '../constants';

const user = JSON.parse(localStorage.getItem('user'));
const initialState = user ?
  { loggedIn: true, user } : { loggedIn: false };

export function authentication(state = initialState, action) {
  switch (action.type) {
    case userConstants.LOGIN_REQUEST:
      return {
        loggedIn: false,
        loggingIn: true,
        user: action.user,
        workspaceName: action.workspaceName
      };
    case userConstants.LOGIN_SUCCESS: {
      const { whoami, workspaceName } = action;
      return {
        loggedIn: true,
        user: action.user,
        whoami,
        workspaceName
      };
    } case userConstants.LOGIN_FAILURE:
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
    case userConstants.SERVER_SENT_EVENTS_SOURCE_CREATED: {
      return {
        ...state,
        eventSource: action.eventSource
      };
    }
    default:
      return state;
  }
}

export default authentication;
