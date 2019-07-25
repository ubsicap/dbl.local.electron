import path from 'path';
import { dblDotLocalService } from '../services/dbl_dot_local.service';
import { workspaceUserSettingsStoreServices } from '../services/workspaces.service';

export const workspaceHelpers = {
  getCurrentWorkspaceFullPath,
  getToggledStarredEntries,
  persistStarredEntries
};
export default workspaceHelpers;

// state helper
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

function getToggledStarredEntries(bundleFilterReducerState, dblIdToToggle) {
  const { starredEntries: starredEntriesOrig } = bundleFilterReducerState;
  const wasEntryStarred = starredEntriesOrig.has(dblIdToToggle);
  const starredEntries = wasEntryStarred
    ? starredEntriesOrig.delete(dblIdToToggle)
    : starredEntriesOrig.add(dblIdToToggle);
  return { starredEntries, isEntryStarred: !wasEntryStarred };
}

function persistStarredEntries(state, starredEntries) {
  const {
    workspaceFullPath,
    email
  } = workspaceHelpers.getCurrentWorkspaceFullPath(state);
  workspaceUserSettingsStoreServices.saveStarredEntries(
    workspaceFullPath,
    email,
    starredEntries.toArray()
  );
}
