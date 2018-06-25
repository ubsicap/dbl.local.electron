import { bundleEditMetadataConstants } from '../constants/bundleEditMetadata.constants';

const initialState = {
  editingMetadata: null,
  formStructure: [],
  formInputs: {}
};

export function bundleEditMetadata(state = initialState, action) {
  switch (action.type) {
    case bundleEditMetadataConstants.OPEN_EDIT_METADATA: {
      return {
        ...state,
        editingMetadata: action.bundleId
      };
    }
    case bundleEditMetadataConstants.CLOSE_EDIT_METADATA: {
      return initialState;
    }
    case bundleEditMetadataConstants.METADATA_FORM_STRUCTURE_REQUEST: {
      return {
        ...state,
        formStructureLoading: action.bundleId
      };
    }
    case bundleEditMetadataConstants.METADATA_FORM_STRUCTURE_UPDATED: {
      return {
        ...state,
        formStructure: action.formStructure,
        formStructureLoading: null
      };
    }
    case bundleEditMetadataConstants.METADATA_FORM_INPUTS_UPDATED: {
      const { formKey, inputs } = action;
      const formInputs = { ...state.formInputs, [formKey]: inputs };
      return {
        ...state,
        formInputs
      };
    }
    case bundleEditMetadataConstants.SAVE_METADATA_REQUEST: {
      return {
        ...state,
        requestingSaveMetadata: true,
        shouldSaveActiveForm: true
      };
    }
    case bundleEditMetadataConstants.SAVE_METADATA_SUCCESS: {
      return {
        ...state,
        requestingSaveMetadata: false,
        wasMetadataSaved: true,
        shouldSaveActiveForm: false
      };
    }
    case bundleEditMetadataConstants.SAVE_METADATA_FAILED: {
      return {
        ...state,
        requestingSaveMetadata: false,
        wasMetadataSaved: false,
        couldNotSaveMetadataMessage: action.message
      };
    }
    default: {
      return state;
    }
  }
}

export default bundleEditMetadata;
