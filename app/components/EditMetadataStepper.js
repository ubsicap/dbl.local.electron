import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { createSelector } from 'reselect';
import Stepper from '@material-ui/core/Stepper';
import Step from '@material-ui/core/Step';
import StepLabel from '@material-ui/core/StepLabel';
import StepContent from '@material-ui/core/StepContent';
import Button from '@material-ui/core/Button';
import Save from '@material-ui/icons/Save';
import Undo from '@material-ui/icons/Undo';
import Delete from '@material-ui/icons/Delete';
import Tooltip from '@material-ui/core/Tooltip';
import Warning from '@material-ui/icons/Warning';
import NavigateNext from '@material-ui/icons/NavigateNext';
import NavigateBefore from '@material-ui/icons/NavigateBefore';
import Check from '@material-ui/icons/Check';
import ExpandLessIcon from '@material-ui/icons/ExpandLess';
import classNames from 'classnames';
import { fetchFormStructure, saveMetadataSuccess, setArchivistStatusOverrides,
  saveFieldValuesForActiveForm, fetchActiveFormInputs,
  promptConfirmDeleteInstanceForm, deleteInstanceForm, updateFormFieldIssues } from '../actions/bundleEditMetadata.actions';
import EditMetadataForm from './EditMetadataForm';
import editMetadataService from '../services/editMetadata.service';
import { utilities } from '../utils/utilities';

const materialStyles = theme => ({
  root: {
  },
  button: {
    marginTop: theme.spacing.unit,
    marginRight: theme.spacing.unit,
  },
  actionsContainer: {
    marginBottom: theme.spacing.unit * 2,
  },
  resetContainer: {
    padding: theme.spacing.unit * 3,
  },
  leftIcon: {
    marginRight: theme.spacing.unit,
  },
  rightIcon: {
    marginLeft: theme.spacing.unit,
  },
  iconSmall: {
    fontSize: 20,
  },
});

const detailsStep = {
  id: '_myDetails',
  name: 'Details',
  label: 'Details',
  content: '',
  template: true
};

const getActiveFormInputs = (state) => state.bundleEditMetadata.activeFormInputs;
const getActiveFormEdits = (state) => state.bundleEditMetadata.activeFormEdits;
const getFormStructure = (state, props) =>
  props.formStructure || state.bundleEditMetadata.formStructure;

const emptyErrorTree = {};
const getErrorTree = (state) => state.bundleEditMetadata.errorTree || emptyErrorTree;

const emptyFormFieldIssues = {};
const getStructurePath = (state, props) => props.myStructurePath;
const getShouldLoadDetails = (state, props) => props.shouldLoadDetails;
const getFormFieldIssues = (state) => state.bundleEditMetadata.formFieldIssues
  || emptyFormFieldIssues;

function getErrorsInForm(formFieldIssues, formKey, errorTree) {
  const { [formKey]: formIssues = emptyFormFieldIssues } = formFieldIssues;
  const { [formKey]: stepErrors = emptyFormFieldIssues } = errorTree;
  return formIssues !== emptyFormFieldIssues ? formIssues : stepErrors;
}

const makeGetSteps = () => createSelector(
  [getFormStructure, getShouldLoadDetails, getStructurePath, getFormFieldIssues, getErrorTree],
  (formStructure, shouldLoadDetails, myStructurePath, formFieldIssues, errorTree) => {
    const msgLoadingForm = 'loading form...';
    const steps = formStructure
      .reduce((accSteps, section) => {
        const instances = Object.keys(section.instances || {});
        const instanceSteps = instances
          .reduce((accInstances, instanceKey) => {
            const label = `${section.id} ${instanceKey}`;
            const { arity, present } = section;
            const instanceOf = section.id;
            const content = msgLoadingForm;
            const instance = section.instances[instanceKey];
            const id = `${section.id}/${instanceKey}`;
            const formKey = getStepFormKey(id, myStructurePath);
            const formErrors = getErrorsInForm(formFieldIssues, formKey, errorTree);
            return [...accInstances,
              {
                id,
                formKey,
                label,
                content,
                formErrors,
                template: true,
                isFactory: false,
                isInstance: true,
                instances,
                arity,
                present,
                instanceOf,
                ...instance
              }];
          }, []);
        const formKey = getStepFormKey(section.id, myStructurePath);
        const formErrors = getErrorsInForm(formFieldIssues, formKey, errorTree);
        const label = formatStepLabel(section);
        const isFactory = getIsFactory(section);
        const content = msgLoadingForm;
        return [
          ...accSteps,
          ...instanceSteps,
          {
            ...section, formKey, label, isFactory, content, formErrors
          }];
      }, []);
    if (shouldLoadDetails) {
      const formKey = getStepFormKey(detailsStep.id, myStructurePath);
      const formErrors = getErrorsInForm(formFieldIssues, formKey, emptyErrorTree);
      return [{ ...detailsStep, formKey, formErrors, isFactory: false }, ...steps];
    }
    return steps;
  }
);

const makeMapStateToProps = () => {
  const getSteps = makeGetSteps();
  const mapStateToProps = (state, props) => {
    const { bundleEditMetadata } = state;
    const {
      requestingSaveMetadata = false,
      wasMetadataSaved = false,
      moveNext = null,
      activeFormConfirmingDelete = false
    } = bundleEditMetadata;
    const steps = getSteps(state, props);
    const formStructure = getFormStructure(state, props);
    const activeFormInputs = getActiveFormInputs(state);
    const activeFormEdits = getActiveFormEdits(state);
    return {
      formStructure,
      activeFormInputs,
      activeFormEdits,
      steps,
      requestingSaveMetadata,
      wasMetadataSaved,
      moveNext,
      activeFormConfirmingDelete
    };
  };
  return mapStateToProps;
};

const mapDispatchToProps = {
  fetchFormStructure,
  setArchivistStatusOverrides,
  saveMetadataSuccess,
  saveFieldValuesForActiveForm,
  fetchActiveFormInputs,
  promptConfirmDeleteInstanceForm,
  deleteInstanceForm,
  updateFormFieldIssues
};

function getStepFormKey(stepId, structurePath) {
  return (stepId !== detailsStep.id ? `${structurePath}/${stepId}` : structurePath);
}

function shouldDisableDelete(step) {
  return step.instances && step.arity && !(['?', '*'].includes(step.arity)) && step.instances.length === 1;
}

type Props = {
    classes: {},
    fetchFormStructure: () => {},
    saveMetadataSuccess: () => {},
    saveFieldValuesForActiveForm: () => {},
    fetchActiveFormInputs: () => {},
    promptConfirmDeleteInstanceForm: () => {},
    deleteInstanceForm: () => {},
    setArchivistStatusOverrides: () => {},
    updateFormFieldIssues: () => {},
    bundleId: string,
    formStructure: [],
    steps: [],
    myStructurePath: string,
    activeFormInputs: {},
    activeFormEdits: {},
    shouldLoadDetails: boolean,
    requestingSaveMetadata: boolean,
    wasMetadataSaved: boolean,
    moveNext: ?{},
    activeFormConfirmingDelete: ?boolean
};

function getIsFactory(section) {
  return section.name.includes('{0}');
}

function formatStepLabel(step) {
  if (!step) {
    return '';
  }
  if (step.label) {
    return step.label;
  }
  const section = step;
  return !getIsFactory(section) ? section.name : `Add ${section.id}`;
}

function formatSectionNameAffixed(section, prefix, postfix) {
  if (!section) {
    return '';
  }
  return (prefix || '') + formatStepLabel(section) + (postfix || '');
}

function findFormKeyStepIndex(steps, formKey) {
  return steps.reduce((acc, step, stepIdx) => {
    const { formKey: lastFormKey = '' } = acc;
    if ((step.formKey === formKey || formKey.includes(`${step.formKey}/`)) &&
      step.formKey.length > lastFormKey.length) {
      return { newActiveStepIndex: stepIdx, formKey: step.formKey };
    }
    return acc;
  }, { newActiveStepIndex: -1, formKey: '' });
}

class _EditMetadataStepper extends React.Component<Props> {
  props: Props;
  constructor(props) {
    super(props);
    this.state = {
      activeStepIndex: -1,
      completed: {}
    };
    const { moveNext } = this.props;
    const { formKey: moveNextFormKey = null } = moveNext || {};
    if (!moveNextFormKey) {
      this.state.activeStepIndex = 0;
    } else {
      const { steps } = this.props;
      const { newActiveStepIndex } = findFormKeyStepIndex(steps, moveNextFormKey);
      this.state.activeStepIndex = newActiveStepIndex !== -1 ? newActiveStepIndex : 0;
    }
  }

  componentDidMount() {
    if (this.props.formStructure.length === 0 && this.props.myStructurePath.length === 0) {
      this.props.setArchivistStatusOverrides(this.props.bundleId);
      this.props.fetchFormStructure(this.props.bundleId);
    }
  }

  componentWillReceiveProps(nextProps) {
    const {
      bundleId,
      requestingSaveMetadata, wasMetadataSaved,
      moveNext: nextMoveNext,
      steps: nextSteps,
      activeFormEdits: nextActiveFormEdits
    } = nextProps;
    const { formKey: nextMoveNextFormKey = null } = nextMoveNext || {};
    if (requestingSaveMetadata && !this.props.requestingSaveMetadata) {
      const activeStep = this.getStep(this.state.activeStepIndex);
      if (!activeStep) {
        this.props.saveMetadataSuccess(); // nothing to save
      }
    } else if (wasMetadataSaved &&
      nextMoveNext && nextMoveNext.newStepIndex !== null && nextMoveNext.newStepIndex >= 0 &&
      !requestingSaveMetadata && this.props.requestingSaveMetadata) {
      const step = this.getStep(nextMoveNext.newStepIndex);
      if (step && step.formKey === nextMoveNext.formKey && step.id === nextMoveNext.id) {
        const nextStepIndex = (nextMoveNext.newStepIndex !==
          this.state.activeStepIndex ? nextMoveNext.newStepIndex : null);
        this.setState({ activeStepIndex: nextStepIndex });
      } else if (this.props.myStructurePath === nextMoveNext.formKey) {
        this.setState({ activeStepIndex: this.props.steps.length });
      }
    } else if (nextMoveNextFormKey) {
      this.trySetActiveStepToMoveNextFormKey(nextSteps, nextMoveNextFormKey);
    } else if (!utilities.areEqualObjectsDeep(nextActiveFormEdits, this.props.activeFormEdits)) {
      const hasNextFormChanged = this.computeHasActiveFormChanged(nextActiveFormEdits);
      if (!hasNextFormChanged) {
        const hasLastFormChanged = this.computeHasActiveFormChanged(this.props.activeFormEdits);
        if (hasLastFormChanged) {
          // user has effectively undone their changes manually. so reset the state of the errors.
          this.props.updateFormFieldIssues(bundleId);
        }
      }
    }
  }

  trySetActiveStepToMoveNextFormKey = (steps, nextMoveNextFormKey) => {
    const { newActiveStepIndex } = findFormKeyStepIndex(steps, nextMoveNextFormKey);
    if (newActiveStepIndex !== -1 && this.state.activeStepIndex !== newActiveStepIndex) {
      this.setState({ activeStepIndex: newActiveStepIndex });
    }
  }

  trySaveFormAndMoveStep = (newStepIndex) => {
    const nextStep = this.getStep(newStepIndex);
    const { formKey, id } = nextStep || {};
    this.props.saveFieldValuesForActiveForm({ moveNext: { newStepIndex, formKey, id } });
  };

  handleStep = stepIndex => () => {
    this.trySaveFormAndMoveStep(stepIndex);
  };

  handleSave = () => this.props.saveFieldValuesForActiveForm();

  handleForceSave = () => this.props.saveFieldValuesForActiveForm({ forceSave: true });

  handleUndo = stepIndex => () => {
    const { bundleId } = this.props;
    const step = this.getStep(stepIndex);
    const { formKey } = step;
    this.props.fetchActiveFormInputs(bundleId, formKey, true);
  };

  handleDeleteForm = step => () => {
    const { bundleId, activeFormConfirmingDelete = false } = this.props;
    const { formKey } = step;
    if (activeFormConfirmingDelete) {
      this.props.deleteInstanceForm(bundleId, formKey);
    } else {
      this.props.promptConfirmDeleteInstanceForm(bundleId, formKey);
    }
  };

  handleNext = () => {
    const { activeStepIndex } = this.state;
    const { steps } = this.props;
    const isLastStep = this.isLastStep(activeStepIndex, steps);
    const nextOffset = isLastStep ? 0 : 1;
    this.trySaveFormAndMoveStep(this.state.activeStepIndex + nextOffset);
  };

  handleBack = () => {
    this.trySaveFormAndMoveStep(this.state.activeStepIndex - 1);
  };

  handleReset = () => {
    this.setState({
      activeStepIndex: 0,
    });
  };

  hasErrorsInStepsOrForms = (step) => this.hasStepFormErrors(step);
  hasStepFormErrors = (step) => step && Object.keys(step.formErrors).length > 0;
  isLastStep = (stepIndex, steps) => stepIndex === steps.length - 1;
  getFormStructureIndex = (stepIndex) => (!this.props.shouldLoadDetails ? stepIndex : stepIndex - 1);
  getStep = (stepIndex) => (stepIndex < this.props.steps.length ? this.props.steps[stepIndex] : null);
  getBackSection = () => this.getStep(this.state.activeStepIndex - 1);
  getNextSection = () => this.getStep(this.state.activeStepIndex + 1);
  getBackSectionName = (prefix, postfix) =>
    formatSectionNameAffixed(this.getBackSection(), prefix, postfix);
  getNextSectionName = (prefix, postfix) =>
    formatSectionNameAffixed(this.getNextSection(), prefix, postfix);
  getStepContent = (stepIndex) => {
    const { activeFormInputs, bundleId } = this.props;
    const step = this.getStep(stepIndex);
    const { template, contains, formKey, formErrors, isFactory } = step;
    if (contains && !isFactory) {
      const hasTemplate = template === true;
      return (
        <EditMetadataStepperComposed
          bundleId={bundleId}
          key={formKey}
          myStructurePath={formKey}
          shouldLoadDetails={hasTemplate}
          formStructure={contains}
        />);
    }
    if (template) {
      const myInputs = (activeFormInputs[formKey] || {});
      return (<EditMetadataForm
        key={formKey}
        bundleId={bundleId}
        formKey={formKey}
        isFactory={isFactory}
        formErrors={formErrors}
        inputs={myInputs}
        isActiveForm={this.state.activeStepIndex === stepIndex}
      />);
    }
    return 'what??';
  }

  getIsActiveIndex = (stepIndex) => {
    const { activeStepIndex } = this.state;
    return stepIndex === activeStepIndex;
  }

  getActiveFormFields = () => {
    const { activeFormInputs } = this.props;
    const step = this.getStep(this.state.activeStepIndex);
    const { formKey } = step;
    const { [formKey]: inputs = {} } = activeFormInputs;
    const { fields = [] } = inputs;
    return fields;
  }

  getHasFormChanged = (stepIndex) => {
    const { activeFormEdits } = this.props;
    const isActiveForm = this.getIsActiveIndex(stepIndex);
    if (!isActiveForm)
      return false;
    const hasFormChanged = this.computeHasActiveFormChanged(activeFormEdits);
    return hasFormChanged;
  }

  computeHasActiveFormChanged = (activeFormEdits) => {
    const fields = this.getActiveFormFields();
    const hasFormChanged = editMetadataService.getHasFormFieldsChanged(fields, activeFormEdits);
    return hasFormChanged;
  }

  renderStepContentActionsContainer = (stepIndex) => {
    const { classes, steps = [] } = this.props;
    const { activeStepIndex } = this.state;
    const hasFormChanged = this.getHasFormChanged(stepIndex);
    const hasFieldContent = activeStepIndex === stepIndex ?
      this.getActiveFormFields().some(f => f.default && f.default.length) : false;
    const step = this.getStep(stepIndex);
    const { contains, isInstance = false, present } = step;
    // if form has errors but there are no changes, it's possible that
    // we just need to clear the errors. However, it is possible
    // that the original metadata has errors, in which case, the errors should still
    // be reported. So, just present the Save button to all the user to reload the form
    // and clear recent errors (or continue to show the original errors.)
    // const hasFormErrors = this.hasStepFormErrors(step);
    const isLastStep = this.isLastStep(activeStepIndex, steps);
    if ((hasFormChanged /* ||  hasFormErrors */) && !contains) {
      return (
        <div>
          <Button
            className={classes.button}
            onClick={this.handleUndo(stepIndex)}
          >
            <Undo className={classNames(classes.leftIcon, classes.iconSmall)} />
            Undo
          </Button>
          <Button
            variant="contained"
            color="primary"
            className={classes.button}
            onClick={this.handleSave}
          >
            <Save className={classNames(classes.leftIcon, classes.iconSmall)} />
            Save
          </Button>
        </div>
      );
    }
    return (
      <div>
        <Button
          disabled={activeStepIndex === 0}
          onClick={this.handleBack}
          className={classes.button}
        >
          {this.getBackSectionName('', '')}
          <NavigateBefore className={classNames(classes.rightIcon, classes.iconSmall)} />
        </Button>
        {(isInstance /* || (present !== undefined && present ) */) && this.renderDeleteButton(step)}
        {!hasFormChanged && hasFieldContent && (present !== undefined && !present) && this.renderAddButton(step)}
        <Button
          variant="outlined"
          color="default"
          onClick={this.handleNext}
          className={classes.button}
        >
          {isLastStep ?
            ([<ExpandLessIcon key="Hide" className={classNames(classes.leftIcon, classes.iconSmall)} />, 'Hide'])
            :
            ([<NavigateNext key="Next" className={classNames(classes.leftIcon, classes.iconSmall)} />, this.getNextSectionName('', '')])
          }
        </Button>
      </div>);
  }

  renderDeleteIconAndText = () => {
    const { classes, activeFormConfirmingDelete = false } = this.props;
    return (activeFormConfirmingDelete ?
      [<Warning key="btnDeleteNow" className={classNames(classes.leftIcon, classes.iconSmall)} />, 'Confirm'] :
      [<Delete key="btnPromptConfirmDelete" className={classNames(classes.leftIcon, classes.iconSmall)} />, 'Delete']
    );
  }

  renderDeleteButton = (step) => {
    const { classes, activeFormConfirmingDelete = false } = this.props;
    const disableDelete = shouldDisableDelete(step);
    const deleteBtn = (
      <Button
        disabled={disableDelete}
        onClick={this.handleDeleteForm(step)}
        color={activeFormConfirmingDelete ? 'secondary' : 'default'}
        className={classes.button}
      >
        {this.renderDeleteIconAndText()}
      </Button>);
    if (disableDelete) {
      return (
        <Tooltip title={`Requires at least one ${step.instanceOf}`}>
          <span>{deleteBtn}</span>
        </Tooltip>);
    }
    return deleteBtn;
  }

  renderAddButton = () => {
    const { classes } = this.props;
    const addBtn = (
      <Button
        onClick={this.handleForceSave}
        variant="contained"
        color="secondary"
        className={classes.button}
      >
        <Check className={classNames(classes.leftIcon, classes.iconSmall)} />
        Add
      </Button>);
    return addBtn;
  }

  render() {
    const { bundleId, classes, steps = [] } = this.props;
    const { activeStepIndex } = this.state;
    if (!bundleId) {
      return (null);
    }
    return (
      <div className={classes.root}>
        <Stepper nonLinear activeStep={activeStepIndex} orientation="vertical">
          {steps.map((step, index) =>
            (
              <Step key={step.label}>
                <StepLabel
                  onClick={this.handleStep(index)}
                  completed={this.state.completed[index]}
                  error={this.hasErrorsInStepsOrForms(step)}
                >
                  {step.label}
                </StepLabel>
                <StepContent>
                  {this.getStepContent(index)}
                  <div className={classes.actionsContainer}>
                    {this.renderStepContentActionsContainer(index)}
                  </div>
                </StepContent>
              </Step>
            ))}
        </Stepper>
      </div>
    );
  }
}

const EditMetadataStepperComposed = compose(
  withStyles(materialStyles, { name: '_EditMetadataStepper' }),
  connect(
    makeMapStateToProps,
    mapDispatchToProps
  ),
)(_EditMetadataStepper);

export default EditMetadataStepperComposed;
