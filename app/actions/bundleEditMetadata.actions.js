// import traverse from 'traverse';
import path from 'path';
import { bundleEditMetadataConstants } from '../constants/bundleEditMetadata.constants';
import { history } from '../store/configureStore';
import { navigationConstants } from '../constants/navigation.constants';
import { bundleService } from '../services/bundle.service';
import { utilities } from '../utils/utilities';
import editMetadataService from '../services/editMetadata.service';

const { app } = require('electron').remote;

export const bundleEditMetadataActions = {
  openEditMetadata,
  closeEditMetadata,
  fetchFormStructure,
  fetchActiveFormInputs,
  openMetadataFile,
  promptConfirmDeleteInstanceForm,
  deleteInstanceForm
};

export default bundleEditMetadataActions;

function buildEditMetadataUrl(routeUrl, bundleId) {
  return routeUrl.replace(':bundleId', bundleId);
}

function getIsDemoEditMode(routeUrl, bundleId) {
  const editMetadataUrl = buildEditMetadataUrl(routeUrl, bundleId);
  return history.location.pathname === editMetadataUrl;
}

export function fetchFormStructure(_bundleId) {
  return async dispatch => {
    dispatch(request(_bundleId));
    try {
      const isDemoMode =
        getIsDemoEditMode(navigationConstants.NAVIGATION_BUNDLE_EDIT_METADATA_DEMO, _bundleId);
      const response = isDemoMode ?
        await getMockStructure() :
        await bundleService.getFormBundleTree(_bundleId);
      dispatch(success(response));
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

export function fetchActiveFormInputs(bundleId, _formKey) {
  return async dispatch => {
    dispatch(request(_formKey));
    try {
      const isDemoMode =
        getIsDemoEditMode(navigationConstants.NAVIGATION_BUNDLE_EDIT_METADATA_DEMO, bundleId);
      const response = isDemoMode ?
        await getMockFormInputs(bundleId, _formKey) :
        await bundleService.getFormFields(bundleId, _formKey);
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

export function openEditMetadata(bundleId) {
  return async dispatch => {
    dispatch(request(bundleId));
    const bundleInfo = await bundleService.fetchById(bundleId);
    if (bundleInfo.mode !== 'create') {
      const { dbl } = bundleInfo;
      const { currentRevision } = dbl;
      const isDraft = currentRevision === '0' || !currentRevision;
      const label = isDraft ? '' : 'openEditMetadata';
      try {
        await bundleService.startCreateContent(bundleId, label);
        if (isDraft) {
          // ideally we'd wait/listen for the 'create' mode change event.
          dispatchSuccess(bundleId);
        }
      } catch (errorReadable) {
        const error = await errorReadable.text();
        dispatch(failure(bundleId, error));
      }
    } else {
      dispatchSuccess(bundleId);
    }
    function dispatchSuccess(_bundleId) {
      dispatch(success(_bundleId));
      navigate(_bundleId);
    }
  };
  function request(_bundleId) {
    return { type: bundleEditMetadataConstants.OPEN_EDIT_METADATA_REQUEST, bundleId: _bundleId };
  }
  function success(_bundleId) {
    return { type: bundleEditMetadataConstants.OPEN_EDIT_METADATA, bundleId: _bundleId };
  }
  function navigate(_bundleId) {
    const isDemoMode = history.location.pathname === navigationConstants.NAVIGATION_BUNDLES_DEMO;
    const editMetadataPage = isDemoMode ?
      navigationConstants.NAVIGATION_BUNDLE_EDIT_METADATA_DEMO :
      navigationConstants.NAVIGATION_BUNDLE_EDIT_METADATA;
    const editMetadataPageWithBundleId = buildEditMetadataUrl(editMetadataPage, _bundleId);
    history.push(editMetadataPageWithBundleId);
  }
  function failure(_bundleId, error) {
    return {
      type: bundleEditMetadataConstants.OPEN_EDIT_METADATA_FAILED, bundleId: _bundleId, error
    };
  }
}

export function closeEditMetadata(bundleId) {
  return async dispatch => {
    await bundleService.stopCreateContent(bundleId);
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
    const temp = app.getPath('temp');
    const metadataXmlResource = 'metadata.xml';
    const tmpFolder = path.join(temp, bundleId);
    const metadataFile = path.join(tmpFolder, metadataXmlResource);
    const downloadedItem = await bundleService.requestSaveResourceTo(
      tmpFolder,
      bundleId,
      metadataXmlResource,
      () => {}
    );
    dispatch({ type: bundleEditMetadataConstants.METADATA_FILE_SAVED, bundleId, metadataFile });
    return downloadedItem;
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
export function saveMetadata(
  bundleId, formKey, fieldNameValues,
  moveNext, isFactory, instanceKeyValue, saveOverrides = true,
) {
  return async (dispatch, getState) => {
    if (!formKey) {
      return dispatch(saveMetadataRequest(null, null, moveNext));
    }
    const { bundleEditMetadata } = getState();
    const moveNextStep = !moveNext ? bundleEditMetadata.moveNext : moveNext;
    if (bundleId && Object.keys(fieldNameValues).length === 0) {
      dispatch(saveMetadataRequest(null, null, moveNextStep));
      dispatch(fetchActiveFormInputs(bundleId, formKey));
      return dispatch(saveMetadataSuccess(bundleId, formKey));
    }
    const fields = Object.keys(fieldNameValues).reduce((acc, name) => {
      const newFieldValue = fieldNameValues[name];
      return [...acc, { type: 'values', name, valueList: [newFieldValue] }];
    }, []);
    const formId = bundleId;
    dispatch(saveMetadataRequest(formId, fields, moveNextStep));
    try {
      const [keyFieldName] = Object.keys(instanceKeyValue || {});
      const [keyFieldValue] = Object.values(instanceKeyValue || {});
      if (keyFieldName && !(keyFieldValue && keyFieldValue.trim())) {
        const error = {
          field_issues: [[keyFieldName, 'Required field', keyFieldValue]],
          response_valid: false
        };
        dispatch(saveMetadataFailed(bundleId, formKey, error));
        return;
      }
      await bundleService.postFormFields(bundleId, formKey, { formId, fields }, keyFieldValue);
      if (saveOverrides) {
        dispatch(fetchActiveFormInputs(bundleId, formKey));
      }
      dispatch(saveMetadataSuccess(bundleId, formKey));
      if (isFactory) {
        dispatch(fetchFormStructure(bundleId));
      }
      dispatch(saveMetadatFileToTempBundleFolder(bundleId));
      if (saveOverrides) {
        dispatch(saveAllOverrides(bundleId));
      }
    } catch (errorReadable) {
      const errorText = await errorReadable.text();
      try {
        const error = JSON.parse(errorText);
        dispatch(saveMetadataFailed(bundleId, formKey, error));
      } catch (errorParsingJson) {
        dispatch(saveMetadataFailed(bundleId, formKey, null, errorText));
      }
    }
  };
}

function saveMetadataRequest(formId, fields, moveNextStep) {
  return {
    type: bundleEditMetadataConstants.SAVE_METADATA_REQUEST, formId, fields, moveNextStep
  };
}

export function saveMetadataSuccess(bundleId, formKey, moveNextStep) {
  return {
    type: bundleEditMetadataConstants.SAVE_METADATA_SUCCESS, bundleId, formKey, moveNextStep
  };
}

export function saveMetadataFailed(bundleId, formKey, error, errorText) {
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
        dispatch(saveMetadata(bundleId, formKey, fieldNameValues, null, null, null, false));
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
    id: 'bfaa79fd-2c60-41e0-9599-3b77bbf7042e',
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
        default: 'DBL Unit Test Gospels',
        regex: '\\S.*\\S'
      },
      {
        name: 'nameLocal',
        nValues: '?',
        type: 'string',
        label: 'Local Name',
        help: "The entry's localized name",
        default: '',
        regex: '\\S.*\\S'
      },
      {
        name: 'abbreviation',
        nValues: '1',
        type: 'string',
        label: 'Abbreviation',
        help: "The entry's abbreviation, in English (no exotic characters)",
        default: 'DBLUTG',
        regex: '[\\-A-Za-z0-9]{2,12}'
      },
      {
        name: 'abbreviationLocal',
        nValues: '?',
        type: 'string',
        label: 'Local Abbreviation',
        help: "The entry's localized abbreviation",
        default: '',
        regex: '\\S.{0,10}\\S'
      },
      {
        name: 'description',
        nValues: '1',
        type: 'string',
        label: 'Description',
        help: "The entry's description, in English",
        default: 'English: DBL Unit Test Version with Gospels Only',
        regex: '\\S.*\\S'
      },
      {
        name: 'descriptionLocal',
        nValues: '?',
        type: 'string',
        label: 'Local Description',
        help: "The entry's localized description",
        default: '',
        regex: '\\S.*\\S'
      },
      {
        name: 'scope',
        nValues: '1',
        type: 'string',
        label: 'Scope',
        help: "The entry's scope (across all publications)",
        default: 'Portions',
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
        default: '2017-12-01',
        regex: '[12]\\d{3}(-[01]\\d(-[0-3]\\d(T[012]\\d:[0-5]\\d:[0-5]\\d)?)?)?'
      }
    ]
  };
  return new Promise(resolve => resolve(mockFormInputs));
}
