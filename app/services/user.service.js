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

function login(username, password) {
  const requestOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `username=${username}&password=${password}`
  };

  return fetch(`${dblDotLocalConfig.getHttpDblDotLocalBaseUrl()}/login`, requestOptions)
    .then(response => response.json())
    .then(json => {
      // login successful if there's a jwt token in the response
      if (json && json.auth_token) {
        // store user details and jwt token in local storage
        // to keep user logged in between page refreshes
        const newUserObj = { ...json, username };
        const userData = JSON.stringify(newUserObj);
        localStorage.setItem(localStorageConstants.KEY_LOCAL_STORAGE_USER, userData);
        return newUserObj;
      }
      const messageDisplayAs = `${json.message} ${json.error_code} Error (HTTP ${json.status_code})`;
      const newError = { ...json, messageDisplayAs };
      return Promise.reject(newError);
    });
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

