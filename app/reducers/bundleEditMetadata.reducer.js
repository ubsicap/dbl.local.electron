import { bundleEditMetadataConstants } from '../constants/bundleEditMetadata.constants';

const initialState = {
  editingMetadata: null,
};

export function bundleEditMetadata(state = initialState, action) {
  switch (action.type) {
    case bundleEditMetadataConstants.OPEN_EDIT_METADATA: {
      return {
        ...state,
        editingMetadata: action.bundleId,
        formStructure: {},
        formInputs: {}
      };
    }
    case bundleEditMetadataConstants.CLOSE_EDIT_METADATA: {
      return {
        ...state,
        editingMetadata: null
      };
    }
    case bundleEditMetadataConstants.METADATA_FORM_STRUCTURE_REQUEST: {
      return {
        ...state,
        formStructure: {},
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
    default: {
      return state;
    }
  }
}

export default bundleEditMetadata;
