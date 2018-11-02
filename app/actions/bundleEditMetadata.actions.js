import log from 'electron-log';
import wait from 'wait-promise';
import { bundleEditMetadataConstants } from '../constants/bundleEditMetadata.constants';
import { history } from '../store/configureStore';
import { navigationConstants } from '../constants/navigation.constants';
import { bundleService } from '../services/bundle.service';
import { utilities } from '../utils/utilities';
import editMetadataService from '../services/editMetadata.service';
import { bundleActions } from '../actions/bundle.actions';

export const bundleEditMetadataActions = {
  openEditMetadata,
  closeEditMetadata,
  setMoveNextStep,
  updateFormFieldIssues,
  fetchFormStructure,
  fetchActiveFormInputs,
  openMetadataFile,
  promptConfirmDeleteInstanceForm,
  deleteInstanceForm,
  saveMetadata,
  saveFieldValuesForActiveForm,
  reloadFieldValues,
  setArchivistStatusOverrides
};

export default bundleEditMetadataActions;

function buildEditMetadataUrl(routeUrl, bundleId) {
  return routeUrl.replace(':bundleId', bundleId);
}

async function getFormStructure(_bundleId) {
  const isDemoMode = getIsDemoMode();
  const response = isDemoMode ?
    await getMockStructure() :
    await bundleService.getFormBundleTree(_bundleId);
  return response;
}

export function fetchFormStructure(_bundleId) {
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
      const isDemoMode = getIsDemoMode();
      const response = isDemoMode ?
        await getMockFormInputs(bundleId, _formKey) :
        await bundleService.getFormFields(bundleId, _formKey);
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

const { app } = require('electron').remote;

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

function getIsDemoMode() {
  return history.location.pathname.includes('/demo');
}

export function openEditMetadata(_bundleId, _moveNextStep) {
  return async (dispatch, getState) => {
    const bundleToEdit = bundleService.getCurrentBundleState(getState, _bundleId);
    dispatch(request(bundleToEdit, _moveNextStep));
    const isDemoMode = getIsDemoMode();
    if (isDemoMode) {
      dispatch(navigate(bundleToEdit, _moveNextStep));
      return;
    }
    if (bundleToEdit.mode === 'create') {
      dispatch(navigate(bundleToEdit, _moveNextStep));
      return;
    }
    const isDraft = bundleToEdit.status === 'DRAFT';
    if (!isDraft) {
      dispatch(failure(_bundleId, 'not yet in draft mode', _moveNextStep));
      return;
    }
    try {
      await bundleService.startCreateContent(_bundleId, '');
      try {
        const bundleReady = await wait.before(10000).every(500).until(() => {
          const bundle = bundleService.getCurrentBundleState(getState, _bundleId);
          const isInCreateMode = bundle.mode === 'create';
          if (isInCreateMode) {
            return bundle;
          }
          return false;
        });
        dispatch(navigate(bundleReady, _moveNextStep));
      } catch (error) {
        dispatch(failure(_bundleId, 'timeout (10 sec) while waiting for create mode', _moveNextStep));
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
    const isDemoMode = history.location.pathname === navigationConstants.NAVIGATION_BUNDLES_DEMO;
    const editMetadataPage = isDemoMode ?
      navigationConstants.NAVIGATION_BUNDLE_EDIT_METADATA_DEMO :
      navigationConstants.NAVIGATION_BUNDLE_EDIT_METADATA;
    const editMetadataPageWithBundleId = buildEditMetadataUrl(editMetadataPage, bundleId);
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
    const isDemoMode = getIsDemoMode();
    if (!isDemoMode) {
      bundleService.unlockCreateMode(bundleId);
    }
    // ideally we'd wait for change mode to 'store' to complete
    dispatch({ type: bundleEditMetadataConstants.CLOSE_EDIT_METADATA, bundleId });
    await utilities.sleep(1);
    dispatch(switchBackToBundlesPage);
  };
}

export function openMetadataFile(bundleId) {
  return async dispatch => {
    dispatch({ type: bundleEditMetadataConstants.METADATA_FILE_SHOW_REQUEST, bundleId });
    dispatch({ type: bundleEditMetadataConstants.METADATA_FILE_REQUEST, bundleId });
    return dispatch(saveMetadatFileToTempBundleFolder(bundleId));
  };
}

function saveMetadatFileToTempBundleFolder(bundleId) {
  return async dispatch => {
    dispatch({ type: bundleEditMetadataConstants.METADATA_FILE_REQUEST, bundleId });
    const metadataFile = await bundleService.saveMetadataToTempFolder(bundleId);
    await utilities.sleep(1000); // give time for OS to release the file.
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

export function promptConfirmDeleteInstanceForm(bundleId, origFormKey) {
  return async (dispatch, getState) => {
    dispatch(promptConfirm(bundleId, origFormKey, true));
    await utilities.sleep(3000); // wait a few seconds for user to click Confirm
    const nextFormKey = getActiveFormKey(getState);
    if (nextFormKey !== origFormKey) {
      return; // switched form, so cancel this state change.
    }
    dispatch(promptConfirm(bundleId, origFormKey, false));
  };

  function promptConfirm(_bundleId, _formKey, shouldWaitForConfirm) {
    return {
      type: bundleEditMetadataConstants.METADATA_FORM_INSTANCE_DELETE_PROMPT_CONFIRM,
      bundleId: _bundleId,
      formKey: _formKey,
      promptConfirm: shouldWaitForConfirm
    };
  }
}

export function deleteInstanceForm(bundleId, formKey) {
  return async dispatch => {
    dispatch(request());
    try {
      await bundleService.deleteForm(bundleId, formKey);
      dispatch(success(bundleId, formKey));
      dispatch(fetchFormStructure(bundleId));
    } catch (errorReadable) {
      const error = await errorReadable.text();
      dispatch(failure(error));
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
  const isDemoMode =
    history.location.pathname === navigationConstants.NAVIGATION_BUNDLE_EDIT_METADATA_DEMO;
  const bundlesPage = isDemoMode ?
    navigationConstants.NAVIGATION_BUNDLES_DEMO :
    navigationConstants.NAVIGATION_BUNDLES;
  history.push(bundlesPage);
}

export function reloadFieldValues(bundleId, formKey) {
  return (dispatch, getState) => {
    const { bundleEditMetadata } = getState();
    const { moveNext: moveNextStep } = bundleEditMetadata;
    dispatch(saveMetadataRequest({ moveNextStep }));
    dispatch(fetchActiveFormInputs(bundleId, formKey, true));
    return dispatch(saveMetadataSuccess(bundleId, formKey));
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
      await bundleService.postFormFields({ ...postFormArgs });
      if (saveOverrides) {
        // reset state so that saving overrides does not result in infinite loop when errors occur
        dispatch(fetchActiveFormInputs(bundleId, formKey));
      }
      dispatch(saveMetadataSuccess(bundleId, formKey));
      dispatch(updateFormFieldIssues(bundleId));
      if (isFactory || forceSaveState /* reload 'present' status */) {
        dispatch(fetchFormStructure(bundleId));
      }
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
        await bundleService.updatePublications(bundleId, Object.keys(publicationInstances));
        return;
      }
    } catch (error) {
      log.error(`publication wizards error: ${error}`);
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

function getMockStructure() {
  const mockStructure = [
    {
      id: 'identification',
      name: 'Identification',
      template: true,
      contains: [
        {
          id: 'systemId',
          name: 'System IDs',
          contains: [
            {
              arity: '?',
              id: 'gbc',
              name: 'GBC',
              template: true,
              present: false
            },
            {
              arity: '?',
              id: 'paratext',
              name: 'PT',
              template: true,
              present: false
            },
            {
              arity: '?',
              id: 'ptReg',
              name: 'PT Registry',
              template: true,
              present: false
            },
            {
              arity: '?',
              id: 'tms',
              name: 'TMS',
              template: true,
              present: false
            },
            {
              arity: '?',
              id: 'reap',
              name: 'REAP',
              template: true,
              present: false
            },
            {
              arity: '?',
              id: 'biblica',
              name: 'Biblica',
              template: true,
              present: false
            },
            {
              arity: '?',
              id: 'dbp',
              name: 'DBP',
              template: true,
              present: false
            }
          ]
        },
        {
          arity: '?',
          id: 'canonSpec',
          name: 'Canon Specification',
          template: true,
          present: false
        }
      ]
    },
    {
      id: 'relationships',
      name: 'Relationships',
      contains: [
        {
          arity: '*',
          id: 'relation',
          name: '{0}',
          has_key: true,
          template: true,
          instances: {}
        }
      ]
    },
    {
      id: 'agencies',
      name: 'Agencies',
      contains: [
        {
          arity: '+',
          id: 'rightsHolder',
          name: '{0}',
          has_key: true,
          template: true,
          instances: {
            d41b7b7e1c41d27efc13f05f: {
              has_key: true
            }
          }
        },
        {
          arity: '+',
          id: 'contributor',
          name: '{0}',
          has_key: true,
          template: true,
          instances: {
            '54650cd05117ad67b3826e99': {
              has_key: true
            }
          }
        },
        {
          arity: '?',
          id: 'rightsAdmin',
          name: '{0}',
          has_key: true,
          template: true,
          instances: {}
        }
      ]
    },
    {
      id: 'fullLanguage',
      name: 'Language',
      template: true
    },
    {
      id: 'countries',
      name: 'Countries',
      contains: [
        {
          arity: '+',
          id: 'country',
          name: '{0}',
          has_key: true,
          template: true,
          instances: {
            US: {
              has_key: true
            }
          }
        }
      ]
    },
    {
      id: 'textType',
      name: 'Type',
      template: true
    },
    {
      id: 'textFormat',
      name: 'Format',
      template: true
    },
    {
      id: 'names',
      name: 'Names',
      contains: [
        {
          arity: '*',
          id: 'name',
          name: '{0}',
          has_key: true,
          template: true,
          instances: {
            'book-mat': {
              has_key: true
            },
            'book-mrk': {
              has_key: true
            },
            'book-luk': {
              has_key: true
            },
            'book-jhn': {
              has_key: true
            }
          }
        }
      ]
    },
    {
      id: 'publications',
      name: 'Publications',
      contains: [
        {
          arity: '+',
          id: 'publication',
          name: '{0}',
          has_key: true,
          template: true,
          contains: [
            {
              id: 'countries',
              arity: '?',
              name: 'Countries',
              contains: [
                {
                  arity: '+',
                  id: 'country',
                  name: '{0}',
                  has_key: true,
                  template: true
                }
              ],
              present: false
            },
            {
              arity: '?',
              id: 'canonSpec',
              name: 'Canon Specification',
              template: true,
              present: false
            }
          ],
          instances: {
            p1: {
              has_key: true,
              contains: [
                {
                  id: 'countries',
                  arity: '?',
                  name: 'Countries',
                  contains: [
                    {
                      arity: '+',
                      id: 'country',
                      name: '{0}',
                      has_key: true,
                      template: true,
                      instances: {}
                    }
                  ],
                  present: false
                },
                {
                  arity: '?',
                  id: 'canonSpec',
                  name: 'Canon Specification',
                  template: true,
                  present: false
                }
              ]
            }
          }
        }
      ]
    },
    {
      id: 'copyright',
      name: 'Copyright',
      contains: [
        {
          arity: '?',
          id: 'fullStatement',
          name: 'Full Statement',
          template: true,
          present: true
        },
        {
          arity: '?',
          id: 'shortStatement',
          name: 'Short Statement',
          template: true,
          present: false
        }
      ]
    },
    {
      arity: '?',
      id: 'promotion',
      name: 'Promotion',
      template: true,
      present: true
    },
    {
      arity: '1',
      id: 'archiveStatus',
      name: 'Archive Status',
      template: true
    },
    {
      arity: '?',
      id: 'progress',
      name: 'Progress',
      contains: [
        {
          arity: '+',
          id: 'book',
          name: 'Book',
          template: true,
          has_key: true,
          instances: {}
        }
      ],
      present: false
    }
  ];
  return new Promise(resolve => resolve(mockStructure));
}

function getMockFormInputs() {
  const mockFormInputs = {
    id: 'e9257364-21f5-4678-a6ce-fc07ef9b11e3',
    category: 'information',
    fields: [
      {
        type: 'label',
        level: '1',
        text: 'Identification'
      },
      {
        name: 'name',
        nValues: '1',
        type: 'string',
        label: 'Name',
        help: "The entry's name, in English",
        regex: '\\S.*\\S',
        default: [
          'TEST Audio Bundles'
        ]
      },
      {
        name: 'nameLocal',
        nValues: '?',
        type: 'string',
        label: 'Local Name',
        help: "The entry's localized name",
        regex: '\\S.*\\S',
        default: [
          'TEST Audio Bible - Local'
        ]
      },
      {
        name: 'abbreviation',
        nValues: '?',
        type: 'string',
        label: 'Abbreviation',
        help: "The entry's abbreviation, in English (no exotic characters). This is not required for non-text media, but is strongly recommended.",
        regex: '[\\-A-Za-z0-9]{2,12}',
        default: [
          'DBLTD'
        ]
      },
      {
        name: 'abbreviationLocal',
        nValues: '?',
        type: 'string',
        label: 'Local Abbreviation',
        help: "The entry's localized abbreviation",
        regex: '\\S.{0,10}\\S',
        default: [
          ''
        ]
      },
      {
        name: 'description',
        nValues: '1',
        type: 'string',
        label: 'Description',
        help: "The entry's description, in English",
        regex: '\\S.*\\S',
        default: [
          'TEST Audio Bible - Description'
        ]
      },
      {
        name: 'descriptionLocal',
        nValues: '?',
        type: 'string',
        label: 'Local Description',
        help: "The entry's localized description",
        regex: '\\S.*\\S',
        default: [
          ''
        ]
      },
      {
        name: 'scope',
        nValues: '1',
        type: 'string',
        label: 'Scope',
        help: "The entry's scope (across all publications)",
        default: [
          'New Testament'
        ],
        options: [
          'Bible',
          'Bible with Deuterocanon',
          'New Testament',
          'New Testament+',
          'Old Testament',
          'Old Testament + Deuterocanon',
          'Old Testament+',
          'Portions',
          'Selections',
          'Shorter Bible'
        ]
      },
      {
        name: 'dateCompleted',
        nValues: '?',
        type: 'string',
        label: 'Completion Date',
        help: 'The date on which this entry was completed',
        regex: '[12]\\d{3}(-[01]\\d(-[0-3]\\d(T[012]\\d:[0-5]\\d:[0-5]\\d)?)?)?',
        default: [
          ''
        ]
      },
      {
        name: 'bundleProducer',
        nValues: '1',
        type: 'string',
        label: 'Bundle Producer',
        help: 'The client and client version that produced this bundle',
        regex: '\\S.*\\S',
        default: [
          'nathanael/0.9.0'
        ]
      }
    ]
  };
  return new Promise(resolve => resolve(mockFormInputs));
}
