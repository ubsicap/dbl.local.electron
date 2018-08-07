import { authHeader } from '../helpers';
import { localStorageConstants } from '../constants/localStorage.constants';
import { dblDotLocalConfig } from '../constants/dblDotLocal.constants';

export const userService = {
  login,
  logout,
  getUser,
  whoami
};
export default userService;

async function login(username, password) {
  const requestOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `username=${username}&password=${password}`
  };

  try {
    const response = await fetch(`${dblDotLocalConfig.getHttpDblDotLocalBaseUrl()}/login`, requestOptions);
    const json = await response.json();
    if (!response.ok) {
      const error = { json, response };
      throw error;
    }
    const newUserObj = { ...json, username };
    const userData = JSON.stringify(newUserObj);
    localStorage.setItem(localStorageConstants.KEY_LOCAL_STORAGE_USER, userData);
    return newUserObj;
  } catch (error) {
    const { json = {}, response = {}, message = '' } = error;
    const errorMessage = message || json.message;
    const { statusText } = response;
    const { error_code: errorCode = statusText } = json;
    const { status } = response;
    const { status_code: statusCode = status } = json;
    if (errorCode) {
      const messageDisplayAs = `${errorMessage} ${errorCode} Error (HTTP ${statusCode})`;
      const newError = { ...error, messageDisplayAs };
      throw newError;
    }
    throw error;
  }
}

async function whoami() {
  const requestOptions = {
    method: 'GET',
    headers: authHeader()
  };
  const response = await fetch(`${dblDotLocalConfig.getHttpDblDotLocalBaseUrl()}/whoami`, requestOptions);
  return response.json();
}

function getUser() {
  return localStorage.getItem(localStorageConstants.KEY_LOCAL_STORAGE_USER) || {};
}

function logout() {
  // remove user from local storage to log user out
  const auth = authHeader();
  if (!auth.Authorization) {
    return new Promise(resolve => {
      removeUser();
      resolve({});
    });
  }
  const requestOptions = {
    method: 'POST',
    headers: auth
  };
  return fetch(`${dblDotLocalConfig.getHttpDblDotLocalBaseUrl()}/logout`, requestOptions)
    .then(response => {
      if (response.size > 0) {
        return response.json();
      }
      return response;
    })
    .then(json => {
      removeUser();
      // logout successful if there is no message
      if (!json.message) {
        return true;
      }
      // const errorMsg = `${json.message} ${json.error_code} Error (HTTP ${json.status_code})`;
      return Promise.reject(json);
    }).catch(error => {
      removeUser();
      return Promise.reject(error);
    });
}

function removeUser() {
  localStorage.removeItem(localStorageConstants.KEY_LOCAL_STORAGE_USER);
}

