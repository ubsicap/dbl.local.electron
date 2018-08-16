import { bundleResourceManagerConstants } from '../constants/bundleResourceManager.constants';
import { navigationConstants } from '../constants/navigation.constants';
import { history } from '../store/configureStore';
import { bundleService } from '../services/bundle.service';

export const bundleManageResourceActions = {
  openResourceManager,
  closeResourceManager,
  getManifestResources
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

export function getManifestResources(_bundleId) {
  return async dispatch => {
    try {
      dispatch(request(_bundleId));
      const manifestResources = await bundleService.getManifestResourceDetails(_bundleId);
      dispatch(success(_bundleId, manifestResources));
    } catch (error) {
      dispatch(failure(_bundleId, error));
    }
  };
  function request(bundleId, manifestResources) {
    return {
      type: bundleResourceManagerConstants.MANIFEST_RESOURCES_REQUEST, bundleId, manifestResources
    };
  }
  function success(bundleId, manifestResources) {
    return {
      type: bundleResourceManagerConstants.MANIFEST_RESOURCES_RESPONSE, manifestResources
    };
  }
  function failure(bundleId, error) {
    return { type: bundleResourceManagerConstants.MANIFEST_RESOURCES_FAILURE, error };
  }
}
