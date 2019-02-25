import log from 'electron-log';
import waitUntil from 'node-wait-until';
import { bundleEditMetadataConstants } from '../constants/bundleEditMetadata.constants';
import { history } from '../store/configureStore';
import { navigationConstants } from '../constants/navigation.constants';
import { bundleService } from '../services/bundle.service';
import editMetadataService from '../services/editMetadata.service';
import { bundleActions } from '../actions/bundle.actions';
import { utilities } from '../utils/utilities';
import { browserWindowService } from '../services/browserWindow.service';

const electron = require('electron');

const { remote = {} } = electron;
const { app } = remote;

export const bundleEditMetadataActions = {
  openEditMetadata,
  closeEditMetadata,
  setMoveNextStep,
  updateFormFieldIssues,
  fetchFormStructure,
  fetchActiveFormInputs,
  openMetadataFile,
  deleteForm,
  saveMetadata,
  saveFieldValuesForActiveForm,
  reloadActiveForm,
  setArchivistStatusOverrides,
  saveMetadatFileToTempBundleFolder
};

export default bundleEditMetadataActions;

async function getFormStructure(_bundleId) {
  const response = await bundleService.getFormBundleTree(_bundleId);
  return response;
}

export function fetchFormStructure(
  _bundleId,
  shouldReloadActiveForm = false,
  shouldUpdateBundleFormErrors = false
) {
  return async dispatch => {
    dispatch(request(_bundleId));
    try {
      const formStructure = await getFormStructure(_bundleId);
      dispatch(success(formStructure));
      // formStructure Middleware
      // dispatch(tryUpdateMetadataSources(_bundleId, formStructure));
    } catch (error) {
      dispatch(failure(error));
    }
    if (shouldReloadActiveForm) {
      dispatch(reloadActiveForm(shouldUpdateBundleFormErrors));
    }
  };
  function request(bundleId) {
    return { type: bundleEditMetadataConstants.METADATA_FORM_STRUCTURE_REQUEST, bundleId };
  }
  function success(formStructure) {
    return { type: bundleEditMetadataConstants.METADATA_FORM_STRUCTURE_UPDATED, formStructure };
  }
  function failure(error) {
    return { type: bundleEditMetadataConstants.METADATA_FORM_FETCH_ERROR, error };
  }
}

function tryUpdateMetadataSources(bundleId, formStructure) {
  return async (dispatch, getState) => {
    const relationInstances = bundleService.getSubSectionInstances(formStructure, 'relationships', 'relation');
    const relationInstanceIds = Object.keys(relationInstances);
    if (relationInstanceIds.length === 0) {
      return;
    }
    try {
      const relationPathBase = '/relationships/relation/';
      relationInstanceIds.forEach(async (dblIdTarget) => {
        const formKey = `${relationPathBase}${dblIdTarget}`;
        const formRelation = await bundleService.getFormFields(bundleId, formKey);
        const [revisionField] = formRelation.fields.filter(f => f.name === 'revision');
        const revisionTarget = revisionField.default[0];
        const { bundles: { allBundles } } = getState();
        const dblTargetBundles = allBundles.filter(b => b.dblId === dblIdTarget && b.revision === revisionTarget);
        if (dblTargetBundles.length === 0) {
          // download entry/revision to bundle
          console.log(`create bundle and download for entry: ${dblIdTarget}/${revisionTarget}`);
        } else {
          // update links to review this metadata
          console.log(`found bundle for entry: ${dblIdTarget}/${revisionTarget}`);
        }
      });
    } catch (error) {
      log.error(`metadata sources error: ${error}`);
    }
  };
}

export function fetchActiveFormInputs(bundleId, _formKey, doUpdateBundleFormFieldErrors) {
  return async dispatch => {
    dispatch(request(_formKey));
    try {
      const response = await bundleService.getFormFields(bundleId, _formKey);
      if (doUpdateBundleFormFieldErrors) {
        dispatch(updateFormFieldIssues(bundleId));
      }
      dispatch(success(_formKey, response));
    } catch (error) {
      dispatch(failure(error));
    }
  };
  function request(formKey) {
    return { type: bundleEditMetadataConstants.METADATA_FORM_INPUTS_REQUEST, formKey };
  }
  function success(formKey, inputs) {
    return { type: bundleEditMetadataConstants.METADATA_FORM_INPUTS_LOADED, formKey, inputs };
  }
  function failure(error) {
    return { type: bundleEditMetadataConstants.METADATA_FORM_FETCH_ERROR, error };
  }
}

export function editActiveFormInput(formKey, inputName, newValue) {
  return {
    type: bundleEditMetadataConstants.METADATA_FORM_INPUT_EDITED, formKey, inputName, newValue
  };
}

export function setArchivistStatusOverrides(_bundleId) {
  return async (dispatch, getState) => {
    const { authentication } = getState();
    const { whoami } = authentication;
    const formStructure = await getFormStructure(_bundleId);
    const appMetadataOverrides = getAppMetadataOverrides(formStructure);
    const userMetadataOverrides = getUserMetadataOverrides(whoami);
    const metadataOverrides = { ...appMetadataOverrides, ...userMetadataOverrides };
    dispatch(myAction(_bundleId, metadataOverrides));
  };

  function myAction(bundleId, metadataOverrides) {
    return { type: bundleEditMetadataConstants.SET_METADATA_OVERRIDES, metadataOverrides };
  }
}

function getAppMetadataOverrides(formStructure) {
  const { id: identificationStatusFormKey } = formStructure.find(section => section.id.endsWith('dentification'));
  const bundleProducerDefault = `${app.getName()}/${app.getVersion()}`;
  const bundleProducer = { default: [bundleProducerDefault] };
  return { [`/${identificationStatusFormKey}`]: { bundleProducer } };
}

function getUserMetadataOverrides(whoami) {
  const archiveStatusFormKey = '/archiveStatus';
  const { display_name: archivistName } = whoami;
  const bundleCreatorName = archivistName;
  return {
    [archiveStatusFormKey]: {
      archivistName: { default: [archivistName] },
      bundleCreatorName: { default: [bundleCreatorName] }
    }
  };
}

export function openEditMetadata(_bundleId, _moveNextStep) {
  return async (dispatch, getState) => {
    const bundleToEdit = bundleService.getCurrentBundleState(getState, _bundleId);
    dispatch(request(bundleToEdit, _moveNextStep));
    if (bundleToEdit.mode === 'create') {
      dispatch(navigate(bundleToEdit, _moveNextStep));
      return;
    }
    try {
      try {
        const bundleReady = bundleService.getCurrentBundleState(getState, _bundleId);
        dispatch(navigate(bundleReady, _moveNextStep));
      } catch (error) {
        dispatch(failure(_bundleId, `error ${error} while waiting for create mode`, _moveNextStep));
      }
    } catch (errorReadable) {
      const error = await errorReadable.text();
      dispatch(failure(_bundleId, error, _moveNextStep));
    }
  };
  function request(bundleToEdit, moveNextStep) {
    const { id: bundleId } = bundleToEdit;
    return {
      type: bundleEditMetadataConstants.OPEN_EDIT_METADATA_REQUEST,
      bundleId,
      bundleToEdit,
      moveNextStep
    };
  }
  function success(bundleToEdit, moveNextStep) {
    const { id: bundleId } = bundleToEdit;
    return {
      type: bundleEditMetadataConstants.OPEN_EDIT_METADATA,
      bundleId,
      bundleToEdit,
      moveNextStep
    };
  }
  function navigate(bundleToEdit, moveNextStep) {
    const { id: bundleId } = bundleToEdit;
    const editMetadataPageWithBundleId = utilities.buildRouteUrl(
      navigationConstants.NAVIGATION_BUNDLE_EDIT_METADATA,
      { bundleId }
    );
    history.push(editMetadataPageWithBundleId);
    return success(bundleToEdit, moveNextStep);
  }
  function failure(bundleId, error, moveNextStep) {
    return {
      type: bundleEditMetadataConstants.OPEN_EDIT_METADATA_FAILED, bundleId, error, moveNextStep
    };
  }
}

export function closeEditMetadata(bundleId) {
  return async dispatch => {
    await bundleService.waitStopCreateMode(bundleId);
    dispatch({ type: bundleEditMetadataConstants.CLOSE_EDIT_METADATA, bundleId });
    dispatch(switchBackToBundlesPage);
  };
}

export function openMetadataFile(bundleId) {
  return async (dispatch, getState) => {
    dispatch({ type: bundleEditMetadataConstants.METADATA_FILE_SHOW_REQUEST, bundleId });
    dispatch({ type: bundleEditMetadataConstants.METADATA_FILE_REQUEST, bundleId });
    dispatch(saveMetadatFileToTempBundleFolder(bundleId));
    const metadataFile = await waitUntil(
      () => getState().bundleEditMetadata.showMetadataFile,
      60000,
      500
    );
    browserWindowService.openFileInChromeBrowser(metadataFile, true);
  };
}

export function saveMetadatFileToTempBundleFolder(bundleId) {
  return async dispatch => {
    dispatch({ type: bundleEditMetadataConstants.METADATA_FILE_REQUEST, bundleId });
    const metadataFile = await bundleService.saveMetadataToTempFolder(bundleId);
    dispatch({ type: bundleEditMetadataConstants.METADATA_FILE_SAVED, bundleId, metadataFile });
    return metadataFile;
  };
}

function getActiveFormKey(getState) {
  const { bundleEditMetadata } = getState();
  const { activeFormInputs } = bundleEditMetadata;
  const [formKey] = Object.keys(activeFormInputs);
  return formKey;
}

export function deleteForm(bundleId, formKey, shouldReloadActiveForm) {
  return async dispatch => {
    dispatch(request());
    try {
      await bundleService.waitStartCreateMode(bundleId);
      await bundleService.deleteForm(bundleId, formKey);
      dispatch(fetchFormStructure(bundleId, shouldReloadActiveForm, true));
      dispatch(success(bundleId, formKey));
    } catch (errorReadable) {
      const error = await errorReadable.text();
      dispatch(failure(error));
    } finally {
      await bundleService.waitStopCreateMode(bundleId);
    }
  };
  function request() {
    return { type: bundleEditMetadataConstants.METADATA_FORM_INSTANCE_DELETE_REQUEST };
  }
  function success(_bundleId, _formKey) {
    return {
      type: bundleEditMetadataConstants.METADATA_FORM_INSTANCE_DELETE_SUCCESS,
      bundleId: _bundleId,
      formKey: _formKey
    };
  }
  function failure(error) {
    return { type: bundleEditMetadataConstants.METADATA_FORM_INSTANCE_DELETE_FAILED, error };
  }
}

function switchBackToBundlesPage() {
  history.push(navigationConstants.NAVIGATION_BUNDLES);
}

export function reloadActiveForm(shouldUpdateBundleFormErrors = false) {
  return (dispatch, getState) => {
    const { bundleEditMetadata } = getState();
    const { bundleToEdit, moveNext: moveNextStep, activeFormInputs } = bundleEditMetadata;
    const [activeFormKey] = Object.keys(activeFormInputs || {});
    if (!bundleToEdit || !activeFormKey) {
      return; // no active form
    }
    dispatch(saveMetadataRequest({ moveNextStep }));
    dispatch(fetchActiveFormInputs(bundleToEdit.id, activeFormKey, shouldUpdateBundleFormErrors));
    return dispatch(saveMetadataSuccess(bundleToEdit.id, activeFormKey));
  };
}

export function saveFieldValuesForActiveForm({ moveNext, forceSave } = {}) {
  return saveMetadataRequest({ moveNextStep: moveNext, forceSave });
}

/*
  Expected Output:
    {
      "formId": "37b60a8e-296e-4502-963d-c15b5bdc607e",
      "fields": [
          {"type": "values", "name": "name", "valueList": ["New Name"]},
          {"type": "values", "name": "nameLocal", "valueList": ["New Localized Name"]},
          {"type": "values", "name": "abbreviation", "valueList": ["NEWABBR"]},
          {"type": "values", "name": "description", "valueList": ["New Description"]},
          {"type": "values", "name": "dateCompleted", "valueList": ["2018-06-01T12:23:34"]}
          {"type": "xml", "name": "fullStatement", "text": "<xml>blah</xml>"}
      ]
    }
 */
export function saveMetadata({
  bundleId, formKey, fieldNameValues,
  moveNext, isFactory, instanceKeyValue,
  saveOverrides = true, forceSave = false
} = {}) {
  return async (dispatch, getState) => {
    const { bundleEditMetadata } = getState();
    const moveNextStep = !moveNext ? bundleEditMetadata.moveNext : moveNext;
    const forceSaveState = !moveNext ? bundleEditMetadata.forceSave : forceSave;
    const fields = Object.keys(fieldNameValues).reduce((acc, name) => {
      const fieldNameInfo = fieldNameValues[name];
      const { values: newFieldValues, type: fieldType } = fieldNameInfo;
      const type = fieldType === 'xml' ? fieldType : 'values';
      const normalizedValues = newFieldValues.map(fieldValue => fieldValue.replace(/(\r\n\t|\n|\r\t)/gm, '').trim());
      const valueObj = type === 'xml' ?
        { text: `${normalizedValues}` } : { valueList: normalizedValues };
      return [...acc, { type, name, ...valueObj }];
    }, []);
    dispatch(saveMetadataRequest({
      bundleId, fields, moveNextStep, forceSave: forceSaveState
    }));
    let postFormArgs = null;
    try {
      const [keyFieldName] = Object.keys(instanceKeyValue || {});
      const [keyFieldValue] = Object.values(instanceKeyValue || {});
      if (keyFieldName && !(keyFieldValue && keyFieldValue.trim())) {
        const error = {
          field_issues: [[keyFieldName, 'Required field', keyFieldValue, 'Required field']],
          response_valid: false
        };
        dispatch(saveMetadataFailed(bundleId, formKey, error));
        return;
      }
      postFormArgs = {
        bundleId, formKey, payload: { formId: bundleId, fields }, keyField: keyFieldValue
      };
      await bundleService.waitUntilPostFormFields({ ...postFormArgs }, getState);
      if (saveOverrides) {
        // reset state so that saving overrides does not result in infinite loop when errors occur
        dispatch(fetchActiveFormInputs(bundleId, formKey));
      }
      dispatch(updateFormFieldIssues(bundleId));
      if (isFactory || forceSaveState /* reload 'present' status */) {
        dispatch(fetchFormStructure(bundleId));
      }
      dispatch(saveMetadataSuccess(bundleId, formKey));
      dispatch(saveMetadatFileToTempBundleFolder(bundleId));
      dispatch(saveSuccessMiddleware(bundleId, formKey));
      if (saveOverrides) {
        dispatch(saveAllOverrides(bundleId));
      }
    } catch (errorReadable) {
      const errorText = await errorReadable.text();
      try {
        const error = JSON.parse(errorText);
        dispatch(saveMetadataFailed(bundleId, formKey, error));
      } catch (errorParsingJson) {
        dispatch(saveMetadataFailed(bundleId, formKey, null, errorText, postFormArgs));
      }
    }
  };
}

export function updateFormFieldIssues(bundleId) {
  return bundleActions.updateBundle(bundleId); // adjust formsErrorStatus (form field issues)
}

function saveMetadataRequest({
  bundleId, fields, moveNextStep, forceSave
}) {
  return {
    type: bundleEditMetadataConstants.SAVE_METADATA_REQUEST,
    bundleId,
    fields,
    moveNextStep,
    forceSave
  };
}

export function setMoveNextStep(moveNextStep) {
  return { type: bundleEditMetadataConstants.SET_EDIT_METADATA_MOVE_NEXT, moveNextStep };
}

export function saveMetadataSuccess(bundleId, formKey, moveNextStep) {
  return {
    type: bundleEditMetadataConstants.SAVE_METADATA_SUCCESS, bundleId, formKey, moveNextStep
  };
}

function tryUpdatePublications(formKey, bundleId) {
  return async (dispatch, getState) => {
    try {
      if (formKey.startsWith('/publications/publication/') && formKey.endsWith('/canonSpec')) {
        const { bundleEditMetadata: { formStructure } } = getState();
        const publicationInstances = bundleService.getPublicationsInstances(formStructure);
        await bundleService.waitStartCreateMode(bundleId);
        await bundleService.updatePublications(bundleId, Object.keys(publicationInstances));
        return;
      }
    } catch (error) {
      log.error(`publication wizards error: ${error}`);
    } finally {
      await bundleService.waitStopCreateMode(bundleId);
    }
  };
}

function saveSuccessMiddleware(bundleId, formKey) {
  return dispatch => {
    /*
      * technically this middleWare should be AFTER metadata success and formStructure reloaded,
      * since formStructure can change based on state of posting metadata
      */
    dispatch(tryUpdatePublications(formKey, bundleId));
  };
}

export function saveMetadataFailed(bundleId, formKey, error, errorText, postFormArgs) {
  if (!error && errorText) {
    log.error(`POST form args: ${JSON.stringify(postFormArgs)}`);
    log.error(`POST form error: ${errorText}`);
  }
  return {
    type: bundleEditMetadataConstants.SAVE_METADATA_FAILED, bundleId, formKey, error, errorText
  };
}

function saveAllOverrides(bundleId) {
  return (dispatch, getState) => {
    const { bundleEditMetadata: { metadataOverrides } } = getState();
    Object.keys(metadataOverrides).forEach(async formKey => {
      try {
        const formInputs = await bundleService.getFormFields(bundleId, formKey);
        const formOverrides = metadataOverrides[formKey];
        const overridesAsEdits = Object.keys(formOverrides).reduce((acc, override) =>
          ({ ...acc, [override]: formOverrides[override].default }), {});
        if (!editMetadataService.getHasFormFieldsChanged(formInputs.fields, overridesAsEdits)) {
          return;
        }
        const formWithOverrides =
          editMetadataService.getFormInputsWithOverrides(formKey, formInputs, metadataOverrides);
        const fieldNameValues =
          editMetadataService.getFormFieldValues(bundleId, formKey, formWithOverrides.fields, {});
        dispatch(saveMetadata({
          bundleId, formKey, fieldNameValues, saveOverrides: false
        }));
      } catch (error) {
        // be silent about fetch form errors
      }
    });
  };
}