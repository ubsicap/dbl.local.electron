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
import { fetchFormStructure, fetchFormInputs } from '../actions/bundleEditMetadata.actions';
import EditMetadataForm from './EditMetadataForm';

const materialStyles = theme => ({
  root: {
    width: '90%',
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

const getFormStructure = (state) => state.bundleEditMetadata.formStructure;

const makeGetSteps = () => createSelector(
  [getFormStructure, state => state.shouldLoadDetails],
  (formStructure, shouldLoadDetails) => {
    const msgLoadingForm = 'loading form...';
    const steps = formStructure
      .reduce((accSteps, section) => {
        const instanceSteps = Object.keys(section.instances || {})
          .reduce((accInstances, instanceKey, index) => {
            const label = `${section.id} ${index + 1}`;
            const content = msgLoadingForm;
            const instance = section.instances[instanceKey];
            return [...accInstances,
              {
                label, content, template: true, ...instance
              }];
          }, []);
        const label = formatSectionName(section);
        const content = msgLoadingForm;
        return [
          ...accSteps,
          ...instanceSteps,
          {
            ...section, label, content
          }];
      }, []);
    if (shouldLoadDetails) {
      return [detailsStep, ...steps];
    }
    return steps;
  }
);

function mapStateToProps(state) {
  const { bundleEditMetadata } = state;
  const getSteps = makeGetSteps();
  const steps = getSteps(state);
  return {
    bundleId: bundleEditMetadata.editingMetadata,
    formStructure: getFormStructure(state),
    myStructurePath: '',
    formInputs: bundleEditMetadata.formInputs,
    shouldLoadDetails: false,
    steps
  };
}

const mapDispatchToProps = {
  fetchFormStructure,
  fetchFormInputs
};


type Props = {
    classes: {},
    fetchFormStructure: () => {},
    fetchFormInputs: () => {},
    bundleId: string,
    formStructure: [],
    steps: [],
    myStructurePath: string,
    formInputs: {},
    shouldLoadDetails: boolean
};

function formatSectionName(section) {
  if (!section) {
    return '';
  }
  return (!section.name.includes('{0}') ? section.name : `Add ${section.id}`);
}

function formatSectionNameAffixed(section, prefix, postfix) {
  if (!section) {
    return '';
  }
  return (prefix || '') + formatSectionName(section) + (postfix || '');
}

class _EditMetadataStepper extends React.Component<Props> {
  props: Props;
  state = {
    activeStep: 0,
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

  handleStep = step => () => {
    this.setState({
      activeStep: this.state.activeStep !== step ? step : null,
    });
  };

  handleNext = () => {
    this.setState({
      activeStep: this.state.activeStep + 1,
    });
  };

  handleBack = () => {
    this.setState({
      activeStep: this.state.activeStep - 1,
    });
  };

  handleReset = () => {
    this.setState({
      activeStep: 0,
    });
  };

  isLastStep = (activeStep, steps) => activeStep === steps.length - 1;
  getFormStructureIndex = (stepIndex) => (!this.props.shouldLoadDetails ? stepIndex : stepIndex - 1);
  getStep = (stepIndex) => this.props.steps[stepIndex];
  getBackSection = () => this.getStep(this.state.activeStep - 1);
  getNextSection = () => this.getStep(this.state.activeStep + 1);
  getBackSectionName = (prefix, postfix) =>
    formatSectionNameAffixed(this.getBackSection(), prefix, postfix);
  getNextSectionName = (prefix, postfix) =>
    formatSectionNameAffixed(this.getNextSection(), prefix, postfix);

  getStepContent = (step) => {
    const { formInputs, bundleId } = this.props;
    const { template, contains, id } = step;
    const formKey = id !== '_myDetails' ? `${this.props.myStructurePath}/${id}` : this.props.myStructurePath;
    if (contains) {
      const hasTemplate = template === true;
      return (
        <EditMetadataStepper
          key={formKey}
          bundleId={bundleId}
          myStructurePath={formKey}
          shouldLoadDetails={hasTemplate}
          formStructure={contains}
          formInputs={formInputs}
          classes={this.props.classes}
          fetchFormStructure={this.props.fetchFormStructure}
          fetchFormInputs={this.props.fetchFormInputs}
        />);
    }
    if (template) {
      const myInputs = (formInputs[formKey] || {});
      return (<EditMetadataForm
        bundleId={bundleId}
        formKey={formKey}
        inputs={myInputs}
        fetchFormInputs={this.props.fetchFormInputs}
      />);
    }
    return 'what??';
  }

  render() {
    const { classes, steps = [] } = this.props;
    const { activeStep } = this.state;

    return (
      <div className={classes.root}>
        <Stepper nonLinear activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => {
            return (
              <Step key={step.label}>
                <StepLabel
                  onClick={this.handleStep(index)}
                  completed={this.state.completed[index]}
                >
                  {step.label}
                </StepLabel>
                <StepContent>
                  {this.getStepContent(step)}
                  <div className={classes.actionsContainer}>
                    <div>
                      <Button
                        disabled={activeStep === 0}
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
                        {this.isLastStep(activeStep, steps) ? 'Finish' : `Next${this.getNextSectionName(' (', ')')}`}
                      </Button>
                    </div>
                  </div>
                </StepContent>
              </Step>
            );
          })}
        </Stepper>
        {activeStep === steps.length && (
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

const EditMetadataStepper = compose(
  withStyles(materialStyles, { name: '_EditMetadataStepper' }),
  connect(
    mapStateToProps,
    mapDispatchToProps
  ),
)(_EditMetadataStepper);

export default EditMetadataStepper;
