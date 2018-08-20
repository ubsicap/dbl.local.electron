import traverse from 'traverse';
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

function addFileInfo(acc, fileInfoNode) {
  if (fileInfoNode.is_dir || this.isRoot || fileInfoNode.size === undefined) {
    return acc;
  }
  const { path } = this;
  const fullKey = path.join('/');
  return { ...acc, [fullKey]: fileInfoNode };
}

export function getManifestResources(_bundleId) {
  return async dispatch => {
    try {
      dispatch(request(_bundleId));
      const manifestResources = await bundleService.getManifestResourceDetails(_bundleId);
      const rawBundle = await bundleService.fetchById(_bundleId);
      const storedFiles = traverse(rawBundle.store.file_info).reduce(addFileInfo, {});
      dispatch(success(_bundleId, manifestResources, storedFiles));
    } catch (error) {
      dispatch(failure(_bundleId, error));
    }
  };
  function request(bundleId) {
    return {
      type: bundleResourceManagerConstants.MANIFEST_RESOURCES_REQUEST, bundleId
    };
  }
  function success(bundleId, manifestResources, storedFiles) {
    return {
      type: bundleResourceManagerConstants.MANIFEST_RESOURCES_RESPONSE,
      manifestResources,
      storedFiles
    };
  }
  function failure(bundleId, error) {
    return { type: bundleResourceManagerConstants.MANIFEST_RESOURCES_FAILURE, error };
  }
}
