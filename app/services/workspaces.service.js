import Conf from 'conf';

export const workspacesService = {
  saveUserLogin,
  getLastUserLogin
};
export default workspacesService;

function getWorkspaceUserSettings(workspaceFullPath) {
  const config = new Conf({
    cwd: workspaceFullPath,
    configName: 'userSettings'
  });
  return config;
}

function encodeEmailAddress(email) {
  return email.replace('.', ' DOT ');
}

function saveUserLogin(workspaceFullPath, email) {
  const userSettings = getWorkspaceUserSettings(workspaceFullPath);
  userSettings.set(encodeEmailAddress(email), { email, lastLogin: Date.now() });
}

function getLastUserLogin(workspaceFullPath) {
  const userSettings = getWorkspaceUserSettings(workspaceFullPath);
  const latstLogin = Object.values(userSettings.store)
    .reduce((acc, userData) =>
      (userData.lastLogin > acc.lastLogin ? userData : acc), { lastLogin: 0 });
  return latstLogin;
}
