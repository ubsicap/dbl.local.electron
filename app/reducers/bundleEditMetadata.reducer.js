import { bundleEditMetadataConstants } from '../constants/bundleEditMetadata.constants';
import editMetadataService from '../services/editMetadata.service';
import { bundleConstants } from '../constants/bundle.constants';

const initialState = {
  editingMetadata: null,
  formStructure: [],
  activeFormInputs: {},
  activeFormEdits: {}
};

const initialActiveFormState = {
  activeFormInputs: {},
  activeFormEdits: {},
  formFieldIssues: null,
  errorTree: null,
};

function changeStateForNewActiveForm(state, newState) {
  const {
    editingMetadata, bundleToEdit, formStructure, metadataOverrides, formFieldIssues, errorTree
  } = state;
  return {
    editingMetadata,
    formStructure,
    metadataOverrides,
    ...initialActiveFormState,
    bundleToEdit,
    formFieldIssues,
    errorTree,
    ...newState
  };
}

export function bundleEditMetadata(state = initialState, action) {
  switch (action.type) {
    case bundleEditMetadataConstants.OPEN_EDIT_METADATA_REQUEST: {
      return {
        ...initialState,
        requestingRevision: action.bundleId,
        moveNext: action.moveNextStep
      };
    }
    case bundleEditMetadataConstants.OPEN_EDIT_METADATA: {
      const { bundleToEdit, bundleId: editingMetadata } = action;
      const {
        formFieldIssues, errorTree
      } = getFormErrorData(bundleToEdit);
      const [currentFormWithErrors, nextFormWithErrors] = Object.keys(formFieldIssues);
      const moveNext = currentFormWithErrors ? { formKey: currentFormWithErrors } : action.moveNextStep;
      return {
        ...state,
        requestingRevision: null,
        moveNext,
        editingMetadata,
        bundleToEdit,
        formFieldIssues,
        errorTree,
        currentFormWithErrors,
        nextFormWithErrors
      };
    }
    case bundleEditMetadataConstants.CLOSE_EDIT_METADATA: {
      return initialState;
    }
    case bundleEditMetadataConstants.SET_EDIT_METADATA_MOVE_NEXT: {
      const { moveNextStep: moveNext } = action;
      return { ...state, moveNext };
    }
    case bundleEditMetadataConstants.METADATA_FILE_SHOW_REQUEST: {
      return { ...state, requestingShowMetadataFile: true };
    }
    case bundleEditMetadataConstants.METADATA_FILE_SAVED: {
      if (state.requestingShowMetadataFile) {
        return {
          ...state, showMetadataFile: action.metadataFile, requestingShowMetadataFile: false
        };
      }
      return state;
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
    case bundleEditMetadataConstants.METADATA_FORM_INPUTS_LOADED: {
      const { formKey, inputs } = action;
      const {
        metadataOverrides
      } = state;
      const formInputs =
        editMetadataService.getFormInputsWithOverrides(formKey, inputs, metadataOverrides);
      const activeFormInputs = { [formKey]: formInputs };
      const { currentFormWithErrors, nextFormWithErrors } = getNavigationFormsWithErrors(formKey);
      return changeStateForNewActiveForm(state, {
        activeFormInputs, currentFormWithErrors, nextFormWithErrors
      });
    }
    case bundleEditMetadataConstants.METADATA_FORM_INPUT_EDITED: {
      const { inputName, newValue } = action;
      const activeFormEdits = { ...state.activeFormEdits, [inputName]: newValue };
      return {
        ...state,
        activeFormEdits
      };
    }
    case bundleEditMetadataConstants.METADATA_FORM_INSTANCE_DELETE_PROMPT_CONFIRM: {
      const { promptConfirm = true } = action;
      return {
        ...state,
        activeFormConfirmingDelete: promptConfirm
      };
    }
    case bundleEditMetadataConstants.METADATA_FORM_INSTANCE_DELETE_REQUEST: {
      return {
        ...state,
        activeFormDeleting: true
      };
    }
    case bundleEditMetadataConstants.METADATA_FORM_INSTANCE_DELETE_SUCCESS: {
      return {
        ...state,
        activeFormDeleting: false
      };
    }
    case bundleEditMetadataConstants.SET_METADATA_OVERRIDES: {
      const { metadataOverrides } = action;
      return {
        ...state,
        metadataOverrides
      };
    }
    case bundleEditMetadataConstants.SAVE_METADATA_REQUEST: {
      const { moveNextStep: moveNext, forceSave } = action;
      const { formKey: moveNextFormKey = null } = moveNext;
      const { currentFormWithErrors, nextFormWithErrors } = getNavigationFormsWithErrors(moveNextFormKey);
      return {
        ...state,
        requestingSaveMetadata: true,
        shouldSaveActiveForm: true,
        wasMetadataSaved: false,
        moveNext,
        forceSave,
        currentFormWithErrors,
        nextFormWithErrors
      };
    }
    case bundleEditMetadataConstants.SAVE_METADATA_SUCCESS: {
      return {
        ...state,
        requestingSaveMetadata: false,
        wasMetadataSaved: true,
        editedBundleId: action.bundleId,
        shouldSaveActiveForm: false
      };
    }
    case bundleEditMetadataConstants.SAVE_METADATA_FAILED: {
      const { error = {}, formKey } = action;
      const { field_issues: fieldIssues = [] } = error || {};
      const { formFieldIssues: formFieldIssuesAll } = state;
      const newFormFieldIssues = getFormFieldIssues(formKey, fieldIssues);
      const formFieldIssues = { ...formFieldIssuesAll, ...newFormFieldIssues };
      const errorTree = getErrorTree(formFieldIssues);
      const { currentFormWithErrors, nextFormWithErrors } = getNavigationFormsWithErrors(formKey);
      return {
        ...state,
        requestingSaveMetadata: false,
        wasMetadataSaved: false,
        couldNotSaveMetadataMessage: null, /* todo */
        formFieldIssues,
        errorTree,
        currentFormWithErrors,
        nextFormWithErrors
      };
    }
    case bundleConstants.UPDATE_BUNDLE: {
      if (!state.editingMetadata || action.bundle.id !== state.bundleToEdit.id) {
        return state;
      }
      const { bundle: bundleToEdit } = action;
      const { formFieldIssues, errorTree } = getFormErrorData(bundleToEdit);
      return {
        ...state,
        bundleToEdit,
        formFieldIssues,
        errorTree
      };
    } default: {
      return state;
    }
  }
  function getNavigationFormsWithErrors(formKey) {
    const {
      formFieldIssues,
      currentFormWithErrors: currentFormWithErrorsPrev,
      nextFormWithErrors: nextFormWithErrorsPrev
    } = state;
    const formErrorKeys = Object.keys(formFieldIssues);
    const formIndexWithError = formErrorKeys.indexOf(formKey);
    const currentFormWithErrors = formIndexWithError !== -1 ?
      formKey : null;
    const nextFormWithErrors = formIndexWithError !== -1 ?
      formErrorKeys[((formIndexWithError + 1) % formErrorKeys.length)] : nextFormWithErrorsPrev;
    return { currentFormWithErrors, nextFormWithErrors };
  }
}

function getFormErrorData(bundleToEdit) {
  const formsErrors = editMetadataService.getFormsErrors(bundleToEdit.formsErrorStatus);
  const formFieldIssues = Object.entries(formsErrors).reduce((acc, [formKey, errorStatus]) => {
    const myformFieldIssues = getFormFieldIssues(formKey, errorStatus.field_issues);
    return { ...acc, ...myformFieldIssues };
  }, {});
  const errorTree = getErrorTree(formFieldIssues);
  return {
    formsErrors, formFieldIssues, errorTree
  };
}

function getParentErrorBranches(formKey, formErrors) {
  const branchKeys = formKey.split('/').reduce((acc, part) => {
    if (acc.length === 0) {
      return [part];
    }
    const lastKey = acc[acc.length - 1];
    return [...acc, `${lastKey}/${part}`];
  }, []);
  const parentErrorBranches = branchKeys.reduce(
    (acc, branchKey) => ({ ...acc, [branchKey]: { [formKey]: formErrors } }),
    {}
  );
  return parentErrorBranches;
}

function getFormFieldIssues(formKey, fieldIssues) {
  const formFieldIssues = fieldIssues.reduce((acc, issue) => {
    const [name, machineRule, value, rule] = issue;
    const fieldError = { name, rule, value, machineRule };
    const { [formKey]: formErrors = {} } = acc;
    return { ...acc, [formKey]: { ...formErrors, [name]: fieldError } };
  }, {});
  return formFieldIssues;
}

function getErrorTree(formFieldIssues) {
  const errorTree = Object.keys(formFieldIssues).reduce(
    (accTree, formErrorEndpoint) => {
      const formErrors = formFieldIssues[formErrorEndpoint];
      const parentErrorBranches = getParentErrorBranches(formErrorEndpoint, formErrors);
      const combinedErrors = Object.keys(parentErrorBranches).reduce((accErrors, branchKey) => {
        const origErrors = accTree[branchKey] || {};
        const newErrors = parentErrorBranches[branchKey];
        return { ...accErrors, [branchKey]: { ...origErrors, ...newErrors } };
      }, {});
      return { ...accTree, ...combinedErrors };
    },
    {}
  );
  return errorTree;
}

export default bundleEditMetadata;
