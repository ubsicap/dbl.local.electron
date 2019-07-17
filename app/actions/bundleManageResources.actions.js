import log from 'electron-log';
import fs from 'fs-extra';
import upath from 'upath';
import immutableJs from 'immutable';
import { bundleResourceManagerConstants } from '../constants/bundleResourceManager.constants';
import { navigationConstants } from '../constants/navigation.constants';
import { history } from '../store/configureStore';
import { bundleService } from '../services/bundle.service';
import { dblDotLocalService } from '../services/dbl_dot_local.service';
import { utilities } from '../utils/utilities';
import {
  openEditMetadata,
  saveMetadatFileToTempBundleFolder
} from './bundleEditMetadata.actions';
import { bundleActions } from './bundle.actions';
import { updateSearchResultsForBundleId } from './bundleFilter.actions';
import { bundleHelpers } from '../helpers/bundle.helpers';
import { emptyObject } from '../utils/defaultValues';

const { dialog, app } = require('electron').remote;
const { shell } = require('electron');

export const bundleManageResourceActions = {
  openResourceManager,
  closeResourceManager,
  addManifestResources,
  deleteManifestResources,
  checkPublicationsHealth,
  editContainers,
  updateSortOrder
};

function getUxCanons() {
  return async (dispatch, getState) => {
    const gottenState = getState();
    const { bundleManageResourcesUx } = gottenState;
    const { uxCanons = emptyObject } = bundleManageResourcesUx;
    if (uxCanons === emptyObject) {
      const results = await dblDotLocalService.getUxCanons();
      dispatch({
        type: bundleResourceManagerConstants.GOT_CANONS,
        uxCanons: results
      });
    }
  };
}

export function openResourceManager(_bundleId, _mode) {
  return async dispatch => {
    await bundleService.waitStopCreateMode(_bundleId);
    dispatch(getUxCanons());
    dispatch(bundleActions.updateBundle(_bundleId));
    dispatch(navigate(_bundleId, _mode));
  };
  function success(bundleId, mode) {
    return {
      type: bundleResourceManagerConstants.OPEN_RESOURCE_MANAGER,
      bundleId,
      mode
    };
  }
  function navigate(bundleId, mode) {
    const manageResourcesUrl = utilities.buildRouteUrl(
      navigationConstants.NAVIGATION_BUNDLE_MANAGE_RESOURCES,
      { bundleId, mode }
    );
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
    return {
      type: bundleResourceManagerConstants.CLOSE_RESOURCE_MANAGER,
      bundleId
    };
  }
  function navigate(bundleId) {
    history.push(navigationConstants.NAVIGATION_BUNDLES);
    return success(bundleId);
  }
}

const msgToAddOrRemoveResources = 'To add or remove resources in the manifest';

function getBundleMedium(state, bundleId) {
  const { medium } = getBundle(state, bundleId);
  return medium;
}

function getBundle(state, bundleId) {
  const {
    bundles: { addedByBundleIds }
  } = state;
  const bundle = addedByBundleIds[bundleId];
  return bundle;
}

export function checkPublicationsHealth(_bundleId) {
  return async (dispatch, getState) => {
    const medium = getBundleMedium(getState(), _bundleId);
    const applicableWizards = await bundleService.getApplicableWizards(
      _bundleId,
      medium
    );
    if (applicableWizards.length === 0) {
      return dispatch({
        type:
          bundleResourceManagerConstants.GET_BUNDLE_PUBLICATIONS_HEALTH_SUCCESS,
        medium,
        message: `There are no publication wizards available for this ${medium} bundle.`
      });
    }
    const sections = await bundleService.getFormBundleTree(_bundleId);
    const publicationInstances = bundleService.getPublicationsInstances(
      sections
    );
    const publicationInstanceIds = Object.keys(publicationInstances);
    if (publicationInstanceIds.length === 0) {
      return dispatch({
        type:
          bundleResourceManagerConstants.GET_BUNDLE_PUBLICATIONS_HEALTH_ERROR,
        error: 'NO_PUBLICATION_INSTANCE',
        publications: [],
        errorMessage: `${msgToAddOrRemoveResources}, first add a publication to Publications`,
        goFix: () =>
          dispatch(
            openEditMetadata(
              _bundleId,
              { formKey: '/publications/publication' },
              false
            )
          )
      });
    }
    const pubsMissingCanonSpecs = publicationInstanceIds.filter(
      pubId =>
        !publicationInstances[pubId].contains.find(
          section => section.id === 'canonSpec'
        ).present
    );
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
      const [componentField] = pubForm.fields.filter(
        f => f.name === 'component'
      );
      const [firstDefault] = componentField.default || [];
      if (!firstDefault) {
        pubsMissingCanonComponentsIds.push(pubId);
      }
    }
    if (pubsMissingCanonComponentsIds.length > 0) {
      return dispatch(
        updateMissingCanonSpecs(dispatch, pubsMissingCanonComponentsIds)
      );
    }
    const bestPubWizards = await bundleService.getBestWizards(
      _bundleId,
      publicationInstanceIds
    );
    const message =
      'The following publication structure wizards will be applied. After modifying the manifest, please click the Review button above to make sure you have the expected publication(s)';
    const { wizardsResults } = bestPubWizards.reduce(
      (acc, bestPubWizard) => {
        const { wizard: wizardName } = bestPubWizard;
        const { description, documentation } = applicableWizards.find(
          w => w.name === wizardName
        );
        const { wizardsResults: prevWizardsResults = {} } = acc;
        return {
          wizardsResults: {
            ...prevWizardsResults,
            [wizardName]: { ...bestPubWizard, description, documentation }
          }
        };
      },
      { wizardsResults: {} }
    );
    dispatch({
      type:
        bundleResourceManagerConstants.GET_BUNDLE_PUBLICATIONS_HEALTH_SUCCESS,
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
      goFix: () =>
        dispatch(
          openEditMetadata(
            _bundleId,
            { formKey: `/publications/publication/${p1}/canonSpec` },
            false
          )
        )
    };
  }
}

async function updatePublications(getState, bundleId) {
  const { bundleManageResources } = getState();
  const { publicationsHealth } = bundleManageResources;
  const { publications } = publicationsHealth;
  await bundleService.updatePublications(bundleId, publications);
}

export function addManifestResources(
  _bundleId,
  _fileToContainerPaths,
  inputMappers
) {
  return async (dispatch, getState) => {
    dispatch(request(_bundleId, _fileToContainerPaths));
    log.info(`addManifestResources: ${JSON.stringify(_fileToContainerPaths)}`);
    await bundleService.waitStartCreateMode(_bundleId);
    const urisToConvert = utilities.getUnionOfValues(inputMappers);
    /* eslint-disable no-restricted-syntax */
    /* eslint-disable no-await-in-loop */
    const gottenStateForPublications = getState(); // in case user cancel during add
    for (const [filePath, containerPath] of Object.entries(
      _fileToContainerPaths
    )) {
      try {
        const { bundleManageResources } = getState();
        if (!bundleManageResources.loading) {
          break; // user canceled dialog
        }
        if (!urisToConvert.has(containerPath)) {
          await bundleService.postResource(_bundleId, filePath, containerPath);
          dispatch(success(_bundleId, filePath, containerPath));
        } else {
          const applicableInputMappers = bundleHelpers.getApplicableMappersForResourcePath(
            inputMappers,
            containerPath
          );
          for (const mapper of applicableInputMappers) {
            await bundleService.postResource(
              _bundleId,
              filePath,
              containerPath,
              mapper
            );
            dispatch(success(_bundleId, filePath, containerPath, mapper));
          }
        }
        const {
          bundleManageResources: {
            addedFilePaths: origAddedFilePaths,
            fullToRelativePaths
          }
        } = getState();
        const {
          remainingAddedFilePaths,
          remainingFullToRelativePaths
        } = bundleHelpers.reduceAddedFilePaths(
          origAddedFilePaths,
          [filePath],
          fullToRelativePaths
        );
        dispatch(
          updateAddedFilePaths(
            remainingAddedFilePaths,
            remainingFullToRelativePaths,
            [filePath]
          )
        );
      } catch (error) {
        dispatch(failure(_bundleId, error));
      }
    }
    await updatePublications(() => gottenStateForPublications, _bundleId);
    await bundleService.waitStopCreateMode(_bundleId);
    dispatch(done(_bundleId));
    dispatch(saveMetadatFileToTempBundleFolder(_bundleId));
    const {
      bundleManageResources: {
        addedFilePaths: remainingAddedFilePaths,
        fullToRelativePaths
      }
    } = getState();
    dispatch(
      appendAddedFilePaths(
        _bundleId,
        remainingAddedFilePaths,
        fullToRelativePaths,
        true
      )
    );
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

function getBundleExportInfo(bundleId, savedToHistory) {
  return savedToHistory ? savedToHistory[bundleId] : null;
}

function promptForFolderToSaveTo(bundlesSaveTo, bundleId) {
  const { savedToHistory } = bundlesSaveTo;
  const bundleSavedToInfo = getBundleExportInfo(bundleId, savedToHistory);
  const defaultPath = bundleSavedToInfo
    ? bundleSavedToInfo.folderName
    : app.getPath('downloads');
  const [selectedFolder] = dialog.showOpenDialog({
    defaultPath,
    properties: ['openDirectory']
  });
  if (selectedFolder) {
    console.log(selectedFolder.toString());
  }
  return selectedFolder;
}

function openInFolder(bundleId, folderName) {
  shell.openItem(folderName);
  return { type: 'BUNDLES_SAVETO_OPEN_FOLDER', bundleId, folderName };
}

function filterOnSelectResourcesOrAll(selectedResources, resourcePath) {
  return !selectedResources || selectedResources.includes(resourcePath);
}

export function requestSaveBundleTo(
  id,
  folder,
  selectedResources,
  selectedMappers = emptyObject,
  overwrites = emptyObject
) {
  return async (dispatch, getState) => {
    const selectedFolder =
      folder || promptForFolderToSaveTo(getState().bundlesSaveTo, id);
    const bundleInfo = await bundleService.fetchById(id);
    const resourcePaths = bundleHelpers
      .getStoredResourcePaths(getState, id)
      .filter(resourcePath => {
        return filterOnSelectResourcesOrAll(selectedResources, resourcePath);
      });
    const filePathsToExport = [...resourcePaths, 'metadata.xml'];
    const bundleBytesToSave = Object.entries(
      bundleService.getFlatFileInfo(bundleInfo)
    )
      .filter(([resourcePath]) => {
        return filterOnSelectResourcesOrAll(filePathsToExport, resourcePath);
      })
      .reduce(addByteSize, 0);
    const resourcePathsProgress = filePathsToExport.reduce(
      (acc, resourcePath) => {
        acc[resourcePath] = 0;
        return acc;
      },
      {}
    );
    let bundleBytesSaved = 0;
    dispatch(
      request(
        id,
        selectedFolder,
        bundleBytesToSave,
        filePathsToExport,
        selectedMappers,
        overwrites
      )
    );
    dispatch(updateSearchResultsForBundleId(id));
    const resourceUris = bundleHelpers.getResourceUris(
      filePathsToExport,
      selectedMappers
    );
    const altRelativePathMappings = Object.entries(overwrites).reduce(
      (acc, [mapper, overwriteTuples]) => {
        acc[mapper] = overwriteTuples.reduce((accNewObj, overwriteTuple) => {
          return {
            ...accNewObj,
            ...{ [overwriteTuple[0]]: overwriteTuple[1] }
          };
        }, {});
        return acc;
      },
      {}
    );
    const updatedSelectedResources = new Set(selectedResources || []); // not immutableJs
    const filesTransferred = [];
    const filesToTransfer = resourceUris;
    resourceUris.forEach(async resourcePath => {
      const [resourceUri, selectedMapper] = resourcePath.split('?mapper=');
      const downloadUri =
        selectedMapper && selectedMapper !== 'as_is'
          ? resourcePath
          : resourceUri;
      const destinationPath =
        selectedMapper && selectedMapper !== 'as_is'
          ? altRelativePathMappings[selectedMapper][resourceUri]
          : resourceUri;
      try {
        const downloadItem = await bundleService.requestSaveResourceTo(
          selectedFolder,
          id,
          downloadUri,
          destinationPath,
          (resourceTotalBytesSaved, resourceProgress) => {
            const originalResourceBytesTransferred =
              resourcePathsProgress[resourceUri];
            resourcePathsProgress[resourceUri] = resourceTotalBytesSaved;
            const bytesDiff =
              resourceTotalBytesSaved - originalResourceBytesTransferred;
            bundleBytesSaved += bytesDiff;
            if (resourceProgress && resourceProgress % 100 === 0) {
              filesTransferred.push(resourcePath);
              const updatedArgs = {
                _id: id,
                apiBundle: bundleInfo,
                resourcePath,
                resourceTotalBytesSaved,
                bundleBytesSaved,
                bundleBytesToSave,
                filesToTransfer,
                filesTransferred
              };
              dispatch(updated(updatedArgs));
              if (selectedResources) {
                updatedSelectedResources.delete(resourceUri);
                dispatch(selectResources(Array.from(updatedSelectedResources)));
              }
              dispatch(updateSearchResultsForBundleId(id));
              if (filesToTransfer.length === filesTransferred.length) {
                dispatch(openInFolder(id, selectedFolder));
              }
            }
          }
        );
        return downloadItem;
      } catch (error) {
        dispatch(failure(id, error));
      }
    });
  };

  function addByteSize(accBytes, [, fileInfoNode]) {
    return accBytes + fileInfoNode.size;
  }

  function request(
    _id,
    _folderName,
    bundleBytesToSave,
    resourcePaths,
    _selectedMappers,
    _overwrites
  ) {
    return {
      type: bundleResourceManagerConstants.SAVETO_REQUEST,
      id: _id,
      folderName: _folderName,
      bundleBytesToSave,
      resourcePaths,
      selectedMappers: _selectedMappers,
      overwrites: _overwrites
    };
  }

  function updated({
    _id,
    apiBundle,
    resourcePath,
    resourceTotalBytesSaved,
    bundleBytesSaved,
    bundleBytesToSave,
    filesToTransfer,
    filesTransferred
  }) {
    return {
      type: bundleResourceManagerConstants.SAVETO_UPDATED,
      id: _id,
      apiBundle,
      resourcePath,
      resourceTotalBytesSaved,
      bundleBytesSaved,
      bundleBytesToSave,
      filesToTransfer,
      filesTransferred
    };
  }
  function failure(_id, error) {
    return {
      type: bundleResourceManagerConstants.SAVETO_FAILURE,
      id: _id,
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
      dispatch(saveMetadatFileToTempBundleFolder(_bundleId));
    } catch (error) {
      dispatch(failure(_bundleId, error));
    }
  };
  function request(bundleId, uris) {
    return {
      type: bundleResourceManagerConstants.DELETE_MANIFEST_RESOURCES_REQUEST,
      bundleId,
      uris
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
    return {
      type: bundleResourceManagerConstants.DELETE_MANIFEST_RESOURCES_FAILURE,
      error,
      uri
    };
  }
}

async function getOverwritesPerMapper(direction, report, bundleId) {
  const overwrites = {};
  /* eslint-disable no-restricted-syntax */
  /* eslint-disable no-await-in-loop */
  for (const [mapperKey, mapperUris] of Object.entries(report)) {
    const mapperOverwrites = await bundleService.getMapperOverwrites(
      bundleId,
      direction,
      { [mapperKey]: mapperUris },
      []
    );
    overwrites[mapperKey] = mapperOverwrites;
  }
  return overwrites;
}

export function getMapperReport(_direction, _uris, _bundleId) {
  return async (dispatch, getState) => {
    const gottenState = getState();
    const bundle = getBundle(gottenState, _bundleId);
    const { storedResourcePaths } = bundle;
    const storedResourcePathsSet = immutableJs.Set(storedResourcePaths);
    const filteredUris =
      _direction === 'output'
        ? _uris.filter(uri => storedResourcePathsSet.has(uri))
        : _uris;
    dispatch(request(_direction, filteredUris));
    const options = await dblDotLocalService.getMappers(_direction);
    const report = await dblDotLocalService.getMapperReport(_direction, _uris);
    const overwrites = await getOverwritesPerMapper(
      _direction,
      report,
      _bundleId
    );
    if (_direction === 'output') {
      report.as_is = [...filteredUris];
      options.as_is = {
        name: 'as_is',
        medium: bundle.medium,
        description: '** Exports stored resources AS IS',
        documentation: 'Exports selected stored resources as is'
      };
      overwrites.as_is = [...filteredUris];
    }
    dispatch(success(_direction, filteredUris, report, options, overwrites));
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

export function selectMappers(direction, mapperIds) {
  return {
    type: bundleResourceManagerConstants.MAPPERS_SELECTED,
    direction,
    mapperIds
  };
}

export function selectResources(
  selectedResourceIds,
  shouldUpdateOutputMapperReports = false
) {
  const distinctSelectedResourceIds = [...new Set(selectedResourceIds)];
  return (dispatch, getState) => {
    if (shouldUpdateOutputMapperReports) {
      const {
        bundleId,
        addedFilePaths = []
      } = getState().bundleManageResources;
      const addedFilePathsSet = immutableJs.Set(addedFilePaths);
      dispatch(
        updateOutputMapperReports(
          bundleId,
          distinctSelectedResourceIds.filter(id => !addedFilePathsSet.has(id))
        )
      );
    }
    dispatch({
      type: bundleResourceManagerConstants.RESOURCES_SELECTED,
      selectedResourceIds: distinctSelectedResourceIds
    });
  };
}

export function selectRevisions(selectedRevisionIds) {
  return {
    type: bundleResourceManagerConstants.REVISIONS_SELECTED,
    selectedRevisionIds
  };
}

export function appendAddedFilePaths(
  bundleId,
  newAddedFilePaths,
  fullToRelativePaths = null,
  setSelectedToNewAdded = false
) {
  return (dispatch, getState) => {
    const state = getState();
    const {
      addedFilePaths: origAddedFilePaths = [],
      fullToRelativePaths: fullToRelativePathsOrig
    } = state.bundleManageResources;
    const {
      selectedResourceIds: origSelectedIds
    } = state.bundleManageResourcesUx;
    const addedFilePaths = utilities.union(
      origAddedFilePaths,
      newAddedFilePaths
    );
    const selectedIds = setSelectedToNewAdded
      ? newAddedFilePaths
      : utilities.union(origSelectedIds, addedFilePaths);
    dispatch(
      updateAddedFilePaths(
        addedFilePaths,
        fullToRelativePaths || fullToRelativePathsOrig,
        newAddedFilePaths,
        addedFilePaths
      )
    );
    dispatch(selectResources(selectedIds));
    dispatch(getFileSizes(newAddedFilePaths));
  };
}

function updateInputMapperReports(
  bundleId,
  filePaths,
  fullToRelativePaths,
  editedContainers
) {
  const mapperReportUris = filePaths.map(
    filePath =>
      utilities.getFilePathResourceData(
        filePath,
        fullToRelativePaths,
        editedContainers
      ).uri
  );
  return getMapperReport('input', mapperReportUris, bundleId);
}

export function updateOutputMapperReports(bundleId, mapperReportUris) {
  return getMapperReport('output', mapperReportUris, bundleId);
}

export function updateAddedFilePaths(
  addedFilePaths,
  fullToRelativePaths,
  filePathsToRemoveFromContainers,
  selectedIdsForInputMapperResults
) {
  return (dispatch, getState) => {
    const { editedContainers, bundleId } = getState().bundleManageResources;
    const {
      remainingFullToRelativePaths: remainingEditedContainers
    } = bundleHelpers.reduceAddedFilePaths(
      addedFilePaths,
      filePathsToRemoveFromContainers,
      editedContainers
    );
    dispatch(updateEditedResourceContainers(remainingEditedContainers));
    if (selectedIdsForInputMapperResults) {
      dispatch(
        updateInputMapperReports(
          bundleId,
          selectedIdsForInputMapperResults,
          fullToRelativePaths,
          remainingEditedContainers
        )
      );
    }
    dispatch({
      type: bundleResourceManagerConstants.UPDATE_ADDED_FILEPATHS,
      addedFilePaths,
      fullToRelativePaths
    });
  };
}

export function updateSortOrder(orderDirection, orderBy) {
  return (dispatch, getState) => {
    const { mode } = getState().bundleManageResourcesUx;
    return dispatch({
      type: bundleResourceManagerConstants.UPDATE_MAIN_TABLE_SORT_ORDER,
      sortOrder: {
        mode,
        orderDirection,
        orderBy
      }
    });
  };
}

function getFileSizes(newlyAddedFilePaths) {
  return async (dispatch, getState) => {
    const { fileSizes: fileSizesOrig = {} } = getState().bundleManageResources;
    const fileSizesPromises = newlyAddedFilePaths.map(async filePath => {
      try {
        const stats = await fs.stat(filePath);
        const { size: sizeRaw } = stats;
        const size = utilities.formatBytesByKbs(sizeRaw);
        return { filePath, size };
      } catch (error) {
        console.error(error); // returns undefined data
      }
      // const checksum = size < 268435456 ? await md5File(filePath) : '(too expensive)';
    });
    const fileSizesList = await Promise.all(fileSizesPromises);
    const fileSizes = fileSizesList
      .filter(data => data !== undefined)
      .reduce((acc, data) => {
        acc[data.filePath] = data.size;
        return acc;
      }, fileSizesOrig);
    dispatch({
      type: bundleResourceManagerConstants.UPDATE_FILE_STATS_SIZES,
      fileSizes
    });
  };
}

export function editContainers(newContainer) {
  return (dispatch, getState) => {
    const state = getState();
    const {
      addedFilePaths = [],
      fullToRelativePaths = {},
      editedContainers: editedContainersOrig = {},
      bundleId
    } = state.bundleManageResources;
    const { selectedResourceIds = [] } = state.bundleManageResourcesUx;
    const toAddResourceIds = immutableJs
      .Set(addedFilePaths)
      .intersect(selectedResourceIds)
      .toArray();
    const newlyEditedContainers = toAddResourceIds.reduce((acc, filePath) => {
      const finalContainer = utilities.formatContainer(newContainer);
      const { relativeFolder } = utilities.getFilePathResourceData(
        filePath,
        fullToRelativePaths
      );
      const updatedContainer = relativeFolder
        ? utilities.formatContainer(
            upath.joinSafe(finalContainer, relativeFolder)
          )
        : finalContainer;
      acc[filePath] = updatedContainer;
      return acc;
    }, {});
    const editedContainers = {
      ...editedContainersOrig,
      ...newlyEditedContainers
    };
    dispatch(updateEditedResourceContainers(editedContainers));
    dispatch(
      updateInputMapperReports(
        bundleId,
        toAddResourceIds,
        fullToRelativePaths,
        editedContainers
      )
    );
  };
}

function updateEditedResourceContainers(editedContainers) {
  return {
    type: bundleResourceManagerConstants.EDIT_RESOURCE_CONTAINERS,
    editedContainers
  };
}
