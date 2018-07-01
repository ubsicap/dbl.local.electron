// import traverse from 'traverse';
import { bundleEditMetadataConstants } from '../constants/bundleEditMetadata.constants';
import { history } from '../store/configureStore';
import { navigationConstants } from '../constants/navigation.constants';
import { bundleService } from '../services/bundle.service';

export const bundleEditMetadataActions = {
  openEditMetadata,
  closeEditMetadata,
  fetchFormStructure,
  fetchFormInputs
};

export default bundleEditMetadataActions;

export function fetchFormStructure(_bundleId) {
  return async dispatch => {
    dispatch(request(_bundleId));
    try {
      const isDemoMode = history.location.pathname === navigationConstants.NAVIGATION_BUNDLES_DEMO;
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

export function fetchFormInputs(bundleId, _formKey) {
  return async dispatch => {
    dispatch(request(_formKey));
    try {
      const isDemoMode = history.location.pathname === navigationConstants.NAVIGATION_BUNDLES_DEMO;
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
    return { type: bundleEditMetadataConstants.METADATA_FORM_INPUTS_UPDATED, formKey, inputs };
  }
  function failure(error) {
    return { type: bundleEditMetadataConstants.METADATA_FORM_FETCH_ERROR, error };
  }
}

export function openEditMetadata(bundleId) {
  return { type: bundleEditMetadataConstants.OPEN_EDIT_METADATA, bundleId };
}

export function closeEditMetadata() {
  return { type: bundleEditMetadataConstants.CLOSE_EDIT_METADATA };
}

/*
    {
      "formId": "37b60a8e-296e-4502-963d-c15b5bdc607e",
      "fields": [
          {"type": "values", "name": "name", "valueList": ["New Name"]},
          {"type": "values", "name": "nameLocal", "valueList": ["New Localized Name"]},
          {"type": "values", "name": "abbreviation", "valueList": ["NEWABBR"]},
          {"type": "values", "name": "description", "valueList": ["New Description"]},
          {"type": "values", "name": "dateCompleted", "valueList": ["2018-06-01T12:23:34"]}
      ]
    }
 */
export function saveMetadata(bundleId, formKey, fieldNameValues, moveNext, isFactory) {
  return async (dispatch, getState) => {
    if (!formKey) {
      return dispatch(saveMetadataRequest(null, null, moveNext));
    }
    const { bundleEditMetadata } = getState();
    const moveNextStep = !moveNext ? bundleEditMetadata.moveNext : moveNext;
    if (bundleId && Object.keys(fieldNameValues).length === 0) {
      dispatch(saveMetadataRequest(null, null, moveNextStep));
      return dispatch(saveMetadataSuccess(bundleId, formKey));
    }
    const fields = Object.keys(fieldNameValues).reduce((acc, name) => {
      const newFieldValue = fieldNameValues[name];
      return [...acc, { type: 'values', name, valueList: [newFieldValue] }];
    }, []);
    const formId = bundleId;
    dispatch(saveMetadataRequest(formId, fields, moveNextStep));
    try {
      await bundleService.postFormFields(bundleId, formKey, { formId, fields });
      dispatch(saveMetadataSuccess(bundleId, formKey));
      if (isFactory) {
        dispatch(fetchFormStructure(bundleId));
      }
    } catch (errorReadable) {
      const error = await errorReadable.json();
      dispatch(saveMetadataFailed(bundleId, formKey, error));
    }
  };
}

function saveMetadataRequest(formId, fields, moveNextStep) {
  return { type: bundleEditMetadataConstants.SAVE_METADATA_REQUEST, formId, fields, moveNextStep };
}

export function saveMetadataSuccess(bundleId, formKey, moveNextStep) {
  return { type: bundleEditMetadataConstants.SAVE_METADATA_SUCCESS, bundleId, formKey, moveNextStep };
}

export function saveMetadataFailed(bundleId, formKey, error) {
  return { type: bundleEditMetadataConstants.SAVE_METADATA_FAILED, bundleId, formKey, error };
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
