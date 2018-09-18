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
  addManifestResources,
  checkPublicationsHealth
};

function buildBundleArgUrl(routeUrl, args) {
  const url = Object.entries(args).reduce(
    (acc, [key, value]) => (acc.replace(`:${key}`, value)),
    routeUrl
  );
  return url;
}

export function openResourceManager(_bundleId, _mode = 'download') {
  return async dispatch => {
    const isInCreateMode = await bundleService.bundleIsInCreateMode(_bundleId);
    if (!isInCreateMode && _mode !== 'download') {
      await bundleService.startCreateContent(_bundleId);
    }
    dispatch(navigate(_bundleId, _mode));
  };
  function success(bundleId, mode) {
    return { type: bundleResourceManagerConstants.OPEN_RESOURCE_MANAGER, bundleId, mode };
  }
  function navigate(bundleId, mode) {
    const manageResourcesUrl =
      buildBundleArgUrl(navigationConstants.NAVIGATION_BUNDLE_MANAGE_RESOURCES, { bundleId, mode });
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

export function getManifestResources(_bundleId) {
  return async dispatch => {
    try {
      dispatch(request(_bundleId));
      const manifestResources = await bundleService.getManifestResourceDetails(_bundleId);
      const rawBundle = await bundleService.fetchById(_bundleId);
      const storedFiles = bundleService.getFlatFileInfo(rawBundle);
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

export function checkPublicationsHealth(_bundleId) {
  return async dispatch => {
    const sections = await bundleService.getFormBundleTree(_bundleId);
    const publicationsStructure = sections.find(section => section.id === 'publications');
    const { contains: publicationsContains } = publicationsStructure;
    const publicationStructure = publicationsContains.find(section => section.id === 'publication');
    const { instances: publicationInstances } = publicationStructure;
    const publicationInstanceIds = Object.keys(publicationInstances);
    const editMetadataPageWithBundleId = buildBundleArgUrl(
      navigationConstants.NAVIGATION_BUNDLE_EDIT_METADATA_SECTION,
      { bundleId: _bundleId, section: 'publications' }
    );
    if (publicationInstanceIds.length === 0) {
      return dispatch({
        type: bundleResourceManagerConstants.GET_BUNDLE_PUBLICATIONS_HEALTH_ERROR,
        error: 'NO_PUBLICATION_INSTANCE',
        publications: [],
        errorMessage: 'To add a resource, first add a publication to Publications',
        navigation: editMetadataPageWithBundleId
      });
    }
    const pubsMissingCanonSpecs = publicationInstanceIds.filter(pubId =>
      !(publicationInstances[pubId].contains.find(section => section.id === 'canonSpec').present));
    if (pubsMissingCanonSpecs.length > 0) {
      return dispatch({
        type: bundleResourceManagerConstants.GET_BUNDLE_PUBLICATIONS_HEALTH_ERROR,
        error: 'MISSING_CANON_SPECS',
        publications: pubsMissingCanonSpecs,
        errorMessage: `To add a resource, first add Canon Specification to the following publications: ${pubsMissingCanonSpecs}`,
        navigation: editMetadataPageWithBundleId
      });
    }
    // now get the publication structure for each publication
    dispatch({
      type: bundleResourceManagerConstants.GET_BUNDLE_PUBLICATIONS_HEALTH_SUCCESS,
      publications: publicationInstanceIds
    });
  };
}

export function addManifestResources(_bundleId, _fileToContainerPaths) {
  return async (dispatch, getState) => {
    dispatch(request(_bundleId, _fileToContainerPaths));
    /* eslint-disable no-restricted-syntax */
    /* eslint-disable no-await-in-loop */
    for (const [filePath, containerPath] of Object.entries(_fileToContainerPaths)) {
      try {
        await utilities.sleep(50); // avoid hang?
        await bundleService.postResource(_bundleId, filePath, containerPath);
        await utilities.sleep(250); // avoid hang?
        await bundleService.updateManifestResource(_bundleId, containerPath);
        await utilities.sleep(50); // avoid hang?
        const { bundleManageResources } = getState();
        const { publicationsHealth } = bundleManageResources;
        const { publications } = publicationsHealth;
        for (const pubId of publications) {
          const wizardTestResults = await bundleService.testPublicationWizards(_bundleId, pubId);
          const bestWizard = wizardTestResults.reduce(
            (acc, r) => (r.hits.length > acc.hits.length ? r : acc),
            { hits: [], misses: [] }
          );
          const { wizard, uri } = bestWizard;
          await bundleService.runPublicationWizard(_bundleId, pubId, wizard, uri);
        }
        dispatch(success(_bundleId, filePath, containerPath));
      } catch (error) {
        dispatch(failure(_bundleId, error));
      }
    }
    /*
    await Promise.all(Object.entries(_fileToContainerPaths)
      .map(async ([filePath, containerPath]) => {
        try {
          await bundleService.postResource(_bundleId, filePath, containerPath);
          dispatch(success(_bundleId, filePath, containerPath));
        } catch (errorReadable) {
          const error = await errorReadable.text();
          dispatch(failure(_bundleId, error));
        }
      }));
      */
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
