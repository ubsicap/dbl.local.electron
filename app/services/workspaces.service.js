import Store from 'electron-store';
import path from 'path';
import { dblDotLocalService } from '../services/dbl_dot_local.service';

export const workspaceUserSettingsStoreServices = {
  saveUserLogin,
  loadLastUserLoginSettings,
  saveBundlesSearchInput,
  loadBundlesSearchInput,
  getCurrentWorkspaceFullPath,
};
export default workspaceUserSettingsStoreServices;

function getCurrentWorkspaceFullPath(state) {
  const { workspaceName, user } = state.authentication;
  if (!workspaceName) {
    return undefined;
  }
  const workspacesLocation = dblDotLocalService.getWorkspacesDir();
  if (!workspacesLocation) {
    return undefined;
  }
  const { username: email } = user || {};
  const workspaceFullPath = path.join(workspacesLocation, workspaceName);
  return { workspaceFullPath, email };
}

function getWorkspaceUserSettings(workspaceFullPath) {
  const store = new Store({
    cwd: workspaceFullPath,
    name: 'userSettings'
  });
  return store;
}

function encodeEmailAddress(email) {
  // avoid dot-notation feature https://github.com/sindresorhus/conf/issues/44
  return email.replace('.', '\\.');
}

function saveUserLogin(workspaceFullPath, email) {
  const userSettings = getWorkspaceUserSettings(workspaceFullPath);
  userSettings.set(encodeEmailAddress(email), { email, lastLogin: Date.now() });
}

function loadLastUserLoginSettings(workspaceFullPath) {
  const userSettings = getWorkspaceUserSettings(workspaceFullPath);
  const lastLogin = Object.values(userSettings.store)
    .reduce((acc, userData) =>
      (!acc || userData.lastLogin > acc.lastLogin ? userData : acc), undefined);
  return lastLogin;
}


function saveBundlesSearchInput(workspaceFullPath, email, searchInputRaw) {
  const userSettings = getWorkspaceUserSettings(workspaceFullPath);
  userSettings.set(`${encodeEmailAddress(email)}/bundles/search`, searchInputRaw);
}

function loadBundlesSearchInput(workspaceFullPath, email) {
  const userSettings = getWorkspaceUserSettings(workspaceFullPath);
  return userSettings.get(`${encodeEmailAddress(email)}/bundles/search`, '');
}
