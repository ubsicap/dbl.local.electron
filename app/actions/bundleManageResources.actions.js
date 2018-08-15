import { bundleResourceManagerConstants } from '../constants/bundleResourceManager.constants';

export const bundleManageResourceActions = {
  openResourceManager,
  closeResourceManager
};

export function openResourceManager(bundleId) {
  return { type: bundleResourceManagerConstants.OPEN_RESOURCE_MANAGER, bundleId };
}

export function closeResourceManager(bundleId) {
  return { type: bundleResourceManagerConstants.CLOSE_RESOURCE_MANAGER, bundleId };
}
