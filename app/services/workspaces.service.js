import Store from 'electron-store';

export const workspaceUserSettingsStoreServices = {
  saveUserLogin,
  loadLastUserLoginSettings,
  saveBundlesSearchInput,
  loadBundlesSearchInput,
  loadEntriesFilters,
  saveEntriesFilters,
  loadStarredEntries,
  saveStarredEntries
};
export default workspaceUserSettingsStoreServices;


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


/* todo: change /bundles/search to /entries/search? when we move to entry model */
function saveBundlesSearchInput(workspaceFullPath, email, searchInputRaw) {
  const userSettings = getWorkspaceUserSettings(workspaceFullPath);
  userSettings.set(`${encodeEmailAddress(email)}/bundles/search`, searchInputRaw);
}

function loadBundlesSearchInput(workspaceFullPath, email) {
  const userSettings = getWorkspaceUserSettings(workspaceFullPath);
  return userSettings.get(`${encodeEmailAddress(email)}/bundles/search`, '');
}

function loadEntriesFilters(workspaceFullPath, email) {
  const userSettings = getWorkspaceUserSettings(workspaceFullPath);
  return userSettings.get(`${encodeEmailAddress(email)}/entries/filters`, {});
}

function saveEntriesFilters(workspaceFullPath, email, filters) {
  const userSettings = getWorkspaceUserSettings(workspaceFullPath);
  userSettings.set(`${encodeEmailAddress(email)}/entries/filters`, filters);
}

function loadStarredEntries(workspaceFullPath, email) {
  const userSettings = getWorkspaceUserSettings(workspaceFullPath);
  return userSettings.get(`${encodeEmailAddress(email)}/entries/starred`, []);
}

function saveStarredEntries(workspaceFullPath, email, ids) {
  const userSettings = getWorkspaceUserSettings(workspaceFullPath);
  userSettings.set(`${encodeEmailAddress(email)}/entries/starred`, ids);
}
