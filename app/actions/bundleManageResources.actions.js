import path from 'path';
import { bundleResourceManagerConstants } from '../constants/bundleResourceManager.constants';
import { navigationConstants } from '../constants/navigation.constants';
import { history } from '../store/configureStore';
import { bundleService } from '../services/bundle.service';
import { dblDotLocalService } from '../services/dbl_dot_local.service';
import { utilities } from '../utils/utilities';
import { openEditMetadata } from './bundleEditMetadata.actions';
import { bundleActions } from './bundle.actions';

export const bundleManageResourceActions = {
  openResourceManager,
  closeResourceManager,
  getManifestResources,
  addManifestResources,
  deleteManifestResources,
  checkPublicationsHealth
};

export function openResourceManager(_bundleId, _mode) {
  return async (dispatch, getState) => {
    dispatch(bundleActions.updateBundle(_bundleId, true));
    const { addedByBundleIds } = getState().bundles;
    const bundleId = _bundleId;
    const bundle = addedByBundleIds[bundleId];
    if (bundle.parent && bundle.parent.dblId === bundle.dblId) {
      dispatch(getManifestResources(bundle.parent.bundleId));
    }
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
      bundleId,
      manifestResources,
      storedFiles
    };
  }
  function failure(bundleId, error) {
    return { type: bundleResourceManagerConstants.GET_MANIFEST_RESOURCES_FAILURE, error };
  }
}

const msgToAddOrRemoveResources = 'To add or remove resources in the manifest';

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
        errorMessage: `${msgToAddOrRemoveResources}, first add a publication to Publications`,
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
    const message = 'The following publication structure wizards will be applied. After modifying the manifest, please click the Review button above to make sure you have the expected publication(s)';
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
      errorMessage: `${msgToAddOrRemoveResources}, first add Canon Specification (ESPECIALLY Canon Components) to the following publications: ${pubsMissingCanonSpecs}`,
      goFix: () => dispatch(openEditMetadata(_bundleId, { formKey: `/publications/publication/${p1}/canonSpec` }))
    };
  }
}

async function updatePublications(getState, bundleId) {
  const { bundleManageResources } = getState();
  const { publicationsHealth } = bundleManageResources;
  const { publications } = publicationsHealth;
  await bundleService.updatePublications(bundleId, publications);
}

export function addManifestResources(_bundleId, _fileToContainerPaths, inputMappers) {
  return async (dispatch, getState) => {
    dispatch(request(_bundleId, _fileToContainerPaths));
    await bundleService.waitStartCreateMode(_bundleId);
    const urisToConvert = utilities.getUnionOfValues(inputMappers);
    /* eslint-disable no-restricted-syntax */
    /* eslint-disable no-await-in-loop */
    for (const [filePath, containerPath] of Object.entries(_fileToContainerPaths)) {
      try {
        if (!urisToConvert.has(containerPath)) {
          await bundleService.postResource(_bundleId, filePath, containerPath);
          dispatch(success(_bundleId, filePath, containerPath));
        } else {
          const applicableInputMappers = Object.entries(inputMappers)
            .filter(([, mapperUris]) => mapperUris
              .includes(containerPath)).map(([mapperKey]) => mapperKey);
          for (const mapper of applicableInputMappers) {
            await bundleService.postResource(_bundleId, filePath, containerPath, mapper);
            dispatch(success(_bundleId, filePath, containerPath, mapper));
          }
        }
      } catch (error) {
        dispatch(failure(_bundleId, error));
      }
    }
    await updatePublications(getState, _bundleId);
    await bundleService.waitStopCreateMode(_bundleId);
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
  function success(bundleId, filePath, containerPath, mapper) {
    return {
      type: bundleResourceManagerConstants.UPDATE_MANIFEST_RESOURCE_RESPONSE,
      bundleId,
      filePath,
      containerPath,
      mapper
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

export function deleteManifestResources(_bundleId, _uris) {
  return async (dispatch, getState) => {
    try {
      dispatch(request(_bundleId, _uris));
      await bundleService.waitStartCreateMode(_bundleId);
      /* eslint-disable no-restricted-syntax */
      /* eslint-disable no-await-in-loop */
      for (const uri of _uris) {
        try {
          await bundleService.deleteManifestResource(_bundleId, uri);
        } catch (error) {
          dispatch(failure(_bundleId, error, uri));
        }
      }
      await updatePublications(getState, _bundleId);
      await bundleService.waitStopCreateMode(_bundleId);
      dispatch(success(_bundleId, _uris));
    } catch (error) {
      dispatch(failure(_bundleId, error));
    }
  };
  function request(bundleId, uris) {
    return {
      type: bundleResourceManagerConstants.DELETE_MANIFEST_RESOURCES_REQUEST, bundleId, uris
    };
  }
  function success(bundleId, uris) {
    return {
      type: bundleResourceManagerConstants.DELETE_MANIFEST_RESOURCES_RESPONSE,
      bundleId,
      uris
    };
  }
  function failure(bundleId, error, uri) {
    return { type: bundleResourceManagerConstants.DELETE_MANIFEST_RESOURCES_FAILURE, error, uri };
  }
}

async function getOverwritesPerMapper(direction, report, bundleId) {
  if (direction !== 'input') {
    return undefined;
  }
  const overwrites = {};
  /* eslint-disable no-restricted-syntax */
  /* eslint-disable no-await-in-loop */
  for (const [mapperKey, mapperUris] of Object.entries(report)) {
    const mapperOverwrites =
      await bundleService.getMapperInputOverwrites(bundleId, { [mapperKey]: mapperUris }, []);
    overwrites[mapperKey] = mapperOverwrites;
  }
  return overwrites;
}

export function getMapperReport(_direction, _uris, _bundleId) {
  return async dispatch => {
    dispatch(request(_direction, _uris));
    const options = await dblDotLocalService.getMappers(_direction);
    const report = await dblDotLocalService.getMapperReport(_direction, _uris);
    const overwrites = await getOverwritesPerMapper(_direction, report, _bundleId);
    dispatch(success(_direction, _uris, report, options, overwrites));
  };
  function request(direction, uris) {
    return {
      type: bundleResourceManagerConstants.MAPPER_REPORT_REQUEST,
      direction,
      uris
    };
  }
  function success(direction, uris, report, options, overwrites) {
    return {
      type: bundleResourceManagerConstants.MAPPER_REPORT_SUCCESS,
      direction,
      uris,
      report,
      options,
      overwrites
    };
  }
}
