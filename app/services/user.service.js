import { authHeader } from '../helpers';
import { localStorageConstants } from '../constants/localStorage.constants';
import { dblDotLocalConstants } from '../constants/dblDotLocal.constants';

const storage = window.require('electron-json-storage');

export const userService = {
  login,
  logout,
  getUser,
  register,
  getAll,
  getById,
  update,
  delete: remove
};
export default userService;

function login(username, password) {
  const requestOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `username=${username}&password=${password}`
  };

  return fetch(`${dblDotLocalConstants.HTTP_DBL_DOT_LOCAL_BASE_URL}/login`, requestOptions)
    .then(response => response.json())
    .then(json => {
      // login successful if there's a jwt token in the response
      if (json && json.auth_token) {
        // store user details and jwt token in local storage
        // to keep user logged in between page refreshes
        const newUserObj = JSON.parse(JSON.stringify(json));
        newUserObj.username = username;
        const userData = JSON.stringify(newUserObj);
        localStorage.setItem(localStorageConstants.KEY_LOCAL_STORAGE_USER, userData);
        storage.set(localStorageConstants.KEY_LOCAL_STORAGE_USER, userData);
        return newUserObj;
      }
      const errorMsg = `${json.message} ${json.error_code} Error (HTTP ${json.status_code})`;
      return Promise.reject(errorMsg);
    });
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
  return fetch(`${dblDotLocalConstants.HTTP_DBL_DOT_LOCAL_BASE_URL}/logout`, requestOptions)
    .then(response => {
      if (response.size > 0) {
        return response.json();
      }
      return response;
    })
    .then(json => {
      // logout successful if there is no message
      if (!json.message) {
        return true;
      }
      removeUser();
      // const errorMsg = `${json.message} ${json.error_code} Error (HTTP ${json.status_code})`;
      return Promise.reject(json);
    });
}

function removeUser() {
  localStorage.removeItem(localStorageConstants.KEY_LOCAL_STORAGE_USER);
  storage.remove(localStorageConstants.KEY_LOCAL_STORAGE_USER);
}

function getAll() {
  const requestOptions = {
    method: 'GET',
    headers: authHeader()
  };

  return fetch('/users', requestOptions).then(handleResponse);
}

function getById(id) {
  const requestOptions = {
    method: 'GET',
    headers: authHeader()
  };

  return fetch(`/users/${id}`, requestOptions).then(handleResponse);
}

function register(user) {
  const requestOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user)
  };

  return fetch('/users/register', requestOptions).then(handleResponse);
}

function update(user) {
  const requestOptions = {
    method: 'PUT',
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(user)
  };

  return fetch(`/users/${user.id}`, requestOptions).then(handleResponse);
}

// prefixed function name with underscore because delete is a reserved word in javascript
function remove(id) {
  const requestOptions = {
    method: 'DELETE',
    headers: authHeader()
  };

  return fetch(`/users/${id}`, requestOptions).then(handleResponse);
}

function handleResponse(response) {
  if (!response.ok) {
    return Promise.reject(response.statusText);
  }

  return response.json();
}
