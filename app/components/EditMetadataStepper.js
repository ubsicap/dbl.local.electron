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
import { fetchFormStructure, fetchFormInputs, saveMetadataSuccess } from '../actions/bundleEditMetadata.actions';
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

const emptyFormFieldIssues = {};
const getStructurePath = (state, props) => props.myStructurePath;
const getShouldLoadDetails = (state, props) => props.shouldLoadDetails;
const getFormFieldIssues = (state) => state.bundleEditMetadata.formFieldIssues
  || emptyFormFieldIssues;

function getErrorsInForm(formFieldIssues, formKey) {
  const { [formKey]: formIssues = emptyFormFieldIssues } = formFieldIssues;
  return formIssues;
}

const makeGetSteps = () => createSelector(
  [getFormStructure, getShouldLoadDetails, getStructurePath, getFormFieldIssues],
  (formStructure, shouldLoadDetails, myStructurePath, formFieldIssues) => {
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
            const formErrors = getErrorsInForm(formFieldIssues, formKey);
            return [...accInstances,
              {
                id, formKey, label, content, formErrors, template: true, ...instance
              }];
          }, []);
        const formKey = getStepFormKey(section.id, myStructurePath);
        const formErrors = getErrorsInForm(formFieldIssues, formKey);
        const label = formatStepLabel(section);
        const content = msgLoadingForm;
        return [
          ...accSteps,
          ...instanceSteps,
          {
            ...section, formKey, label, content, formErrors
          }];
      }, []);
    if (shouldLoadDetails) {
      const formKey = getStepFormKey(detailsStep.id, myStructurePath);
      const formErrors = getErrorsInForm(formFieldIssues, formKey);
      return [{ ...detailsStep, formKey, formErrors }, ...steps];
    }
    return steps;
  }
);

const makeMapStateToProps = () => {
  const getSteps = makeGetSteps();
  const mapStateToProps = (state, props) => {
    const { bundleEditMetadata } = state;
    const { requestingSaveMetadata = false } = bundleEditMetadata;
    const steps = getSteps(state, props);
    const { formInputs } = bundleEditMetadata;
    const formStructure = getFormStructure(state, props);
    const bundleId = bundleEditMetadata.editingMetadata;
    return {
      bundleId,
      formStructure,
      formInputs,
      steps,
      requestingSaveMetadata
    };
  };
  return mapStateToProps;
};

const mapDispatchToProps = {
  fetchFormStructure,
  fetchFormInputs,
  saveMetadataSuccess
};

function getStepFormKey(stepId, structurePath) {
  return (stepId !== '_myDetails' ? `${structurePath}/${stepId}` : structurePath);
}

type Props = {
    classes: {},
    fetchFormStructure: () => {},
    fetchFormInputs: () => {},
    saveMetadataSuccess: () => {},
    bundleId: ?string,
    formStructure: [],
    steps: [],
    myStructurePath: string,
    formInputs: {},
    shouldLoadDetails: boolean,
    requestingSaveMetadata: boolean
};

function formatStepLabel(step) {
  if (!step) {
    return '';
  }
  if (step.label) {
    return step.label;
  }
  const section = step;
  return (!section.name.includes('{0}') ? section.name : `Add ${section.id}`);
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
    completed: {},
  };

  componentDidMount() {
    if (this.props.formStructure.length === 0) {
      this.props.fetchFormStructure(this.props.bundleId);
    }
    if (this.props.shouldLoadDetails) {
      this.props.fetchFormInputs(this.props.bundleId, this.props.myStructurePath);
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.requestingSaveMetadata && !prevProps.requestingSaveMetadata) {
      const activeStep = this.getStep(this.state.activeStepIndex);
      if (!activeStep) {
        this.props.saveMetadataSuccess(); // nothing to save
      }
    }
  }

  trySaveFormAndMoveStep = (newStepIndex) => {
    this.setState({
      activeStepIndex: newStepIndex,
    });
  };

  handleStep = stepIndex => () => {
    this.trySaveFormAndMoveStep(this.state.activeStepIndex !== stepIndex ? stepIndex : null);
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
    const { formInputs, bundleId } = this.props;
    const { template, contains, formKey, formErrors } = step;
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
      const myInputs = (formInputs[formKey] || {});
      return (<EditMetadataForm
        key={formKey}
        bundleId={bundleId}
        formKey={formKey}
        formErrors={formErrors}
        inputs={myInputs}
        fetchFormInputs={this.props.fetchFormInputs}
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
                  error={Object.keys(step.formErrors).length > 0}
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
