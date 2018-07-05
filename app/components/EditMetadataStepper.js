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
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import { fetchFormStructure, saveMetadataSuccess, saveMetadata } from '../actions/bundleEditMetadata.actions';
import EditMetadataForm from './EditMetadataForm';

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
});

const detailsStep = {
  id: '_myDetails',
  name: 'Details',
  label: 'Details',
  content: '',
  template: true
};

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
        const instanceSteps = Object.keys(section.instances || {})
          .reduce((accInstances, instanceKey) => {
            const label = `${section.id} ${instanceKey}`;
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
    } = bundleEditMetadata;
    const steps = getSteps(state, props);
    const { activeFormInputs } = bundleEditMetadata;
    const formStructure = getFormStructure(state, props);
    const bundleId = bundleEditMetadata.editingMetadata;
    return {
      bundleId,
      formStructure,
      activeFormInputs,
      steps,
      requestingSaveMetadata,
      wasMetadataSaved,
      moveNext
    };
  };
  return mapStateToProps;
};

const mapDispatchToProps = {
  fetchFormStructure,
  saveMetadataSuccess,
  saveMetadata
};

function getStepFormKey(stepId, structurePath) {
  return (stepId !== detailsStep.id ? `${structurePath}/${stepId}` : structurePath);
}

type Props = {
    classes: {},
    fetchFormStructure: () => {},
    saveMetadataSuccess: () => {},
    saveMetadata: () => {},
    bundleId: ?string,
    formStructure: [],
    steps: [],
    myStructurePath: string,
    activeFormInputs: {},
    shouldLoadDetails: boolean,
    requestingSaveMetadata: boolean,
    wasMetadataSaved: boolean,
    moveNext: ?{}
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

class _EditMetadataStepper extends React.Component<Props> {
  props: Props;
  state = {
    activeStepIndex: 0,
    completed: {}
  };

  componentDidMount() {
    if (this.props.formStructure.length === 0 && this.props.myStructurePath.length === 0) {
      this.props.fetchFormStructure(this.props.bundleId);
    }
  }

  componentWillReceiveProps(nextProps) {
    const { requestingSaveMetadata, wasMetadataSaved, moveNext } = nextProps;
    if (requestingSaveMetadata && !this.props.requestingSaveMetadata) {
      const activeStep = this.getStep(this.state.activeStepIndex);
      if (!activeStep) {
        this.props.saveMetadataSuccess(); // nothing to save
      }
    } else if (wasMetadataSaved && moveNext &&
      !requestingSaveMetadata && this.props.requestingSaveMetadata) {
      const step = this.getStep(moveNext.newStepIndex);
      if (step && step.formKey === moveNext.formKey && step.id === moveNext.id) {
        const nextStepIndex = (moveNext.newStepIndex !==
          this.state.activeStepIndex ? moveNext.newStepIndex : null);
        this.setState({ activeStepIndex: nextStepIndex });
      } else if (this.props.myStructurePath === moveNext.formKey) {
        this.setState({ activeStepIndex: this.props.steps.length });
      }
    }
  }

  trySaveFormAndMoveStep = (newStepIndex) => {
    const nextStep = this.getStep(newStepIndex);
    const { formKey, id } = nextStep || {};
    this.props.saveMetadata(null, null, null, { newStepIndex, formKey, id });
  };

  handleStep = stepIndex => () => {
    this.trySaveFormAndMoveStep(stepIndex);
  };

  handleNext = () => {
    this.trySaveFormAndMoveStep(this.state.activeStepIndex + 1);
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
    const step = this.getStep(stepIndex);
    const { activeFormInputs, bundleId } = this.props;
    const { template, contains, formKey, formErrors, isFactory } = step;
    if (contains) {
      const hasTemplate = template === true;
      return (
        <EditMetadataStepperComposed
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

  render() {
    const { bundleId, classes, steps = [] } = this.props;
    const { activeStepIndex } = this.state;
    if (!bundleId) {
      return (null);
    }
    return (
      <div className={classes.root}>
        <Stepper nonLinear activeStep={activeStepIndex} orientation="vertical">
          {steps.map((step, index) => {
            return (
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
                    <div>
                      <Button
                        disabled={activeStepIndex === 0}
                        onClick={this.handleBack}
                        className={classes.button}
                      >
                        Back{this.getBackSectionName(' (', ')')}
                      </Button>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={this.handleNext}
                        className={classes.button}
                      >
                        {this.isLastStep(activeStepIndex, steps) ? 'Finish' : `Next${this.getNextSectionName(' (', ')')}`}
                      </Button>
                    </div>
                  </div>
                </StepContent>
              </Step>
            );
          })}
        </Stepper>
        {activeStepIndex === steps.length && (
          <Paper square elevation={0} className={classes.resetContainer}>
            <Typography>All steps completed - you&quot;re finished</Typography>
            <Button onClick={this.handleReset} className={classes.button}>
              Reset
            </Button>
          </Paper>
        )}
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
