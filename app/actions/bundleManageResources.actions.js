import { bundleResourceManagerConstants } from '../constants/bundleResourceManager.constants';
import { navigationConstants } from '../constants/navigation.constants';
import { history } from '../store/configureStore';

export const bundleManageResourceActions = {
  openResourceManager,
  closeResourceManager
};

function buildBundleArgUrl(routeUrl, bundleId) {
  return routeUrl.replace(':bundleId', bundleId);
}

export function openResourceManager(_bundleId) {
  return dispatch => {
    dispatch(navigate(_bundleId));
  };
  function success(bundleId) {
    return { type: bundleResourceManagerConstants.OPEN_RESOURCE_MANAGER, bundleId };
  }
  function navigate(bundleId) {
    const manageResourcesUrl =
      buildBundleArgUrl(navigationConstants.NAVIGATION_BUNDLE_MANAGE_RESOURCES, bundleId);
    history.push(manageResourcesUrl);
    return success(bundleId);
  }
}

export function closeResourceManager(_bundleId) {
  return dispatch => {
    dispatch(navigate(_bundleId));
  };
  function success(bundleId) {
    return { type: bundleResourceManagerConstants.CLOSE_RESOURCE_MANAGER, bundleId };
  }
  function navigate(bundleId) {
    history.push(navigationConstants.NAVIGATION_BUNDLES);
    return success(bundleId);
  }
}
