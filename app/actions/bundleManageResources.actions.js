import { bundleResourceManagerConstants } from '../constants/bundleResourceManager.constants';
import { navigationConstants } from '../constants/navigation.constants';
import { history } from '../store/configureStore';
import { bundleService } from '../services/bundle.service';
import { utilities } from '../utils/utilities';
import { openEditMetadata } from './bundleEditMetadata.actions';

export const bundleManageResourceActions = {
  openResourceManager,
  closeResourceManager,
  getManifestResources,
  addManifestResources,
  checkPublicationsHealth
};

export function openResourceManager(_bundleId, _mode = 'download') {
  return async (dispatch, getState) => {
    const isInCreateMode = await bundleService.bundleIsInCreateMode(_bundleId);
    if (isInCreateMode || _mode === 'download') {
      return dispatch(navigate(_bundleId, _mode));
    }
    await bundleService.waitStartCreateMode(_bundleId);
    dispatch(navigate(_bundleId, _mode));
  };
  function success(bundleId, mode) {
    return { type: bundleResourceManagerConstants.OPEN_RESOURCE_MANAGER, bundleId, mode };
  }
  function navigate(bundleId, mode) {
    const manageResourcesUrl =
      utilities.buildRouteUrl(navigationConstants.NAVIGATION_BUNDLE_MANAGE_RESOURCES, { bundleId, mode });
    history.push(manageResourcesUrl);
    return success(bundleId, mode);
  }
}

export function closeResourceManager(_bundleId) {
  return async dispatch => {
    await bundleService.waitStopCreateMode(_bundleId);
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
  return async (dispatch, getState) => {
    const { bundles: { addedByBundleIds } } = getState();
    const bundleId = _bundleId;
    const { medium } = addedByBundleIds[bundleId];
    const applicableWizards = await bundleService.getApplicableWizards(_bundleId, medium);
    if (applicableWizards.length === 0) {
      return dispatch({
        type: bundleResourceManagerConstants.GET_BUNDLE_PUBLICATIONS_HEALTH_SUCCESS,
        medium,
        message: `There are no publication wizards available for this ${medium} bundle.`
      });
    }
    const sections = await bundleService.getFormBundleTree(_bundleId);
    const publicationInstances = bundleService.getPublicationsInstances(sections);
    const publicationInstanceIds = Object.keys(publicationInstances);
    if (publicationInstanceIds.length === 0) {
      return dispatch({
        type: bundleResourceManagerConstants.GET_BUNDLE_PUBLICATIONS_HEALTH_ERROR,
        error: 'NO_PUBLICATION_INSTANCE',
        publications: [],
        errorMessage: 'To add a resource, first add a publication to Publications',
        goFix: () => dispatch(openEditMetadata(_bundleId, { formKey: '/publications/publication' }))
      });
    }
    const pubsMissingCanonSpecs = publicationInstanceIds.filter(pubId =>
      !(publicationInstances[pubId].contains.find(section => section.id === 'canonSpec').present));
    if (pubsMissingCanonSpecs.length > 0) {
      return dispatch(updateMissingCanonSpecs(dispatch, pubsMissingCanonSpecs));
    }
    /* eslint-disable no-restricted-syntax */
    /* eslint-disable no-await-in-loop */
    const pubsMissingCanonComponentsIds = [];
    for (const pubId of publicationInstanceIds) {
      // now check that at least components are added.
      const pubFormKey = `/publications/publication/${pubId}/canonSpec`;
      const pubForm = await bundleService.getFormFields(_bundleId, pubFormKey);
      const [componentField] = pubForm.fields.filter(f => f.name === 'component');
      const [firstDefault] = componentField.default || [];
      if (!firstDefault) {
        pubsMissingCanonComponentsIds.push(pubId);
      }
    }
    if (pubsMissingCanonComponentsIds.length > 0) {
      return dispatch(updateMissingCanonSpecs(dispatch, pubsMissingCanonComponentsIds));
    }
    const bestPubWizards = await bundleService.getBestWizards(_bundleId, publicationInstanceIds);
    const message = 'The following publication structure wizards will be applied. After adding resources, please click the Review button above to make sure you have the expected publication(s)';
    const { wizardsResults } = bestPubWizards.reduce((acc, bestPubWizard) => {
      const { wizard: wizardName } = bestPubWizard;
      const { description, documentation } = applicableWizards.find(w => w.name === wizardName);
      const { wizardsResults: prevWizardsResults = {} } = acc;
      return { wizardsResults: { ...prevWizardsResults, [wizardName]: { ...bestPubWizard, description, documentation } } };
    }, { wizardsResults: {} });
    dispatch({
      type: bundleResourceManagerConstants.GET_BUNDLE_PUBLICATIONS_HEALTH_SUCCESS,
      medium,
      publications: publicationInstanceIds,
      applicableWizards,
      bestPubWizards,
      message,
      wizardsResults
    });
  };

  function updateMissingCanonSpecs(dispatch, pubsMissingCanonSpecs) {
    const [p1] = pubsMissingCanonSpecs;
    return {
      type: bundleResourceManagerConstants.GET_BUNDLE_PUBLICATIONS_HEALTH_ERROR,
      error: 'MISSING_CANON_SPECS',
      publications: pubsMissingCanonSpecs,
      errorMessage: `To add a resource, first add Canon Specification (ESPECIALLY Canon Components) to the following publications: ${pubsMissingCanonSpecs}`,
      goFix: () => dispatch(openEditMetadata(_bundleId, { formKey: `/publications/publication/${p1}/canonSpec` }))
    };
  }
}

export function addManifestResources(_bundleId, _fileToContainerPaths) {
  return async (dispatch, getState) => {
    dispatch(request(_bundleId, _fileToContainerPaths));
    /* eslint-disable no-restricted-syntax */
    /* eslint-disable no-await-in-loop */
    for (const [filePath, containerPath] of Object.entries(_fileToContainerPaths)) {
      try {
        await bundleService.postResource(_bundleId, filePath, containerPath);
        await bundleService.updateManifestResource(_bundleId, containerPath);
        const { bundleManageResources } = getState();
        const { publicationsHealth } = bundleManageResources;
        const { publications } = publicationsHealth;
        await bundleService.updatePublications(_bundleId, publications);
        dispatch(success(_bundleId, filePath, containerPath));
      } catch (error) {
        dispatch(failure(_bundleId, error));
      }
    }
    dispatch(done(_bundleId));
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
      bundleId,
      filePath,
      containerPath
    };
  }
  function done(bundleId) {
    return {
      type: bundleResourceManagerConstants.UPDATE_MANIFEST_RESOURCE_DONE,
      bundleId
    };
  }
  function failure(bundleId, error) {
    return {
      type: bundleResourceManagerConstants.UPDATE_MANIFEST_RESOURCE_FAILURE,
      error
    };
  }
}
