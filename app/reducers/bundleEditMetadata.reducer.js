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
        formStructureLoading: true
      };
    }
    case bundleEditMetadataConstants.METADATA_FORM_STRUCTURE_UPDATED: {
      return {
        ...state,
        formStructure: action.formStructure,
        formStructureLoading: false
      };
    }
    case bundleEditMetadataConstants.METADATA_FORM_INPUTS_UPDATED: {
      const { key, inputs } = action;
      const formInputs = { ...state.formInputs, [key]: inputs };
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
