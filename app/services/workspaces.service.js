import Store from 'electron-store';

export const workspacesService = {
  saveUserLogin,
  getLastUserLoginSettings
};
export default workspacesService;

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

function getLastUserLoginSettings(workspaceFullPath) {
  const userSettings = getWorkspaceUserSettings(workspaceFullPath);
  const lastLogin = Object.values(userSettings.store)
    .reduce((acc, userData) =>
      (!acc || userData.lastLogin > acc.lastLogin ? userData : acc), undefined);
  return lastLogin;
}
