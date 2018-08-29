import traverse from 'traverse';
import { bundleResourceManagerConstants } from '../constants/bundleResourceManager.constants';
import { navigationConstants } from '../constants/navigation.constants';
import { history } from '../store/configureStore';
import { bundleService } from '../services/bundle.service';
import { utilities } from '../utils/utilities';

export const bundleManageResourceActions = {
  openResourceManager,
  closeResourceManager,
  getManifestResources,
  addManifestResources
};

function buildBundleArgUrl(routeUrl, bundleId, mode) {
  const altUrl = routeUrl.replace(':bundleId', bundleId);
  return altUrl.replace(':mode', mode);
}

export function openResourceManager(_bundleId, _mode = 'download') {
  return async dispatch => {
    const isInCreateMode = await bundleService.bundleIsInCreateMode(_bundleId);
    if (!isInCreateMode) {
      await bundleService.startCreateContent(_bundleId);
    }
    dispatch(navigate(_bundleId, _mode));
  };
  function success(bundleId, mode) {
    return { type: bundleResourceManagerConstants.OPEN_RESOURCE_MANAGER, bundleId, mode };
  }
  function navigate(bundleId, mode) {
    const manageResourcesUrl =
      buildBundleArgUrl(navigationConstants.NAVIGATION_BUNDLE_MANAGE_RESOURCES, bundleId, mode);
    history.push(manageResourcesUrl);
    return success(bundleId, mode);
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
    bundleService.unlockCreateMode(bundleId);
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
      type: bundleResourceManagerConstants.GET_MANIFEST_RESOURCES_REQUEST, bundleId
    };
  }
  function success(bundleId, manifestResources, storedFiles) {
    return {
      type: bundleResourceManagerConstants.GET_MANIFEST_RESOURCES_RESPONSE,
      manifestResources,
      storedFiles
    };
  }
  function failure(bundleId, error) {
    return { type: bundleResourceManagerConstants.GET_MANIFEST_RESOURCES_FAILURE, error };
  }
}

export function addManifestResources(_bundleId, _fileToContainerPaths) {
  return async dispatch => {
    dispatch(request(_bundleId, _fileToContainerPaths));
    Object.entries(_fileToContainerPaths).forEach(async ([filePath, containerPath]) => {
      try {
        await bundleService.postResource(_bundleId, filePath, containerPath);
        dispatch(success(_bundleId, filePath, containerPath));
      } catch (errorReadable) {
        const error = await errorReadable.text();
        dispatch(failure(_bundleId, error));
      }
    });
  };
  function request(bundleId, fileToContainerPaths) {
    return {
      type: bundleResourceManagerConstants.UPDATE_MANIFEST_RESOURCES_REQUEST,
      bundleId,
      fileToContainerPaths
    };
  }
  function success(bundleId, filePath, containerPath) {
    return {
      type: bundleResourceManagerConstants.UPDATE_MANIFEST_RESOURCE_RESPONSE,
      filePath,
      containerPath
    };
  }
  function failure(bundleId, error) {
    return {
      type: bundleResourceManagerConstants.UPDATE_MANIFEST_RESOURCE_FAILURE,
      error
    };
  }
}
