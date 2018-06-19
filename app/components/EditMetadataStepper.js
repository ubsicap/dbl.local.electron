import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import { connect } from 'react-redux';
import { compose } from 'recompose';
// import { createSelector } from 'reselect';
import Stepper from '@material-ui/core/Stepper';
import Step from '@material-ui/core/Step';
import StepLabel from '@material-ui/core/StepLabel';
import StepContent from '@material-ui/core/StepContent';
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import { fetchFormStructure, fetchFormInputs } from '../actions/bundleEditMetadata.actions';

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

/*
const getIsSearchActive = (state) => state.bundlesFilter.isSearchActive;
const emptyBundleMatches = {};
const getEmptryBundleMatches = () => emptyBundleMatches;

const getBundleMatches = (state, props) =>
  (state.bundlesFilter.searchResults && state.bundlesFilter.searchResults.bundlesMatching ?
    (state.bundlesFilter.searchResults.bundlesMatching[props.bundleId] || emptyBundleMatches)
    : emptyBundleMatches);

const makeShouldShowRow = () => createSelector(
  [getIsSearchActive, getBundleMatches],
  (isActiveSearch, bundleMatches) => !isActiveSearch || Object.keys(bundleMatches).length > 0
);
*/

function mapStateToProps(state) {
  const { bundleEditMetadata } = state;
  return {
    bundleId: bundleEditMetadata.editingMetadata,
    formStructure: bundleEditMetadata.formStructure,
    myStructurePath: '',
    formInputs: bundleEditMetadata.formInputs,
    shouldLoadDetails: false
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
    myStructurePath: string,
    formInputs: {},
    shouldLoadDetails: boolean
};

function formatSectionName(section) {
  if (!section) {
    return '';
  }
  return (section.name !== '{0}' ? section.name : `Add ${section.id}`);
}

function formatSectionNameAffixed(section, prefix, postfix) {
  if (!section) {
    return '';
  }
  return (prefix || '') + formatSectionName(section) + (postfix || '');
}

class EditMetadataStepper extends React.Component<Props> {
  props: Props;
  state = {
    activeStep: 0,
    completed: {},
  };

  componentDidMount() {
    if (this.props.formStructure.length === 0) {
      this.props.fetchFormStructure();
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

  getSteps = () => this.props.formStructure.map(formatSectionName);
  isLastStep = (activeStep, steps) => activeStep === steps.length - 1;
  getBackSection = () => this.props.formStructure[this.state.activeStep - 1];
  getNextSection = () => this.props.formStructure[this.state.activeStep + 1];
  getBackSectionName = (prefix, postfix) =>
    formatSectionNameAffixed(this.getBackSection(), prefix, postfix);
  getNextSectionName = (prefix, postfix) =>
    formatSectionNameAffixed(this.getNextSection(), prefix, postfix);

  getStepContent = (step) => {
    const { formStructure, formInputs } = this.props;
    const section = formStructure[step];
    const { template, contains, id } = section;
    const formKey = `${this.props.myStructurePath}/${id}`;
    if (contains) {
      const hasTemplate = template === true;
      return (
        <EditMetadataStepper
          bundleId={this.props.bundleId}
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
      const myForm = formInputs[formKey];
      if (myForm) {
        return JSON.stringify(myForm);
      }
      this.props.fetchFormInputs(this.props.bundleId, formKey);
      return 'Loading form...';
    }
    return 'what??';
  }

  render() {
    const { classes } = this.props;
    const steps = this.getSteps();
    const { activeStep } = this.state;

    return (
      <div className={classes.root}>
        <Stepper nonLinear activeStep={activeStep} orientation="vertical">
          {steps.map((label, index) => {
            return (
              <Step key={label}>
                <StepLabel
                  onClick={this.handleStep(index)}
                  completed={this.state.completed[index]}
                >
                  {label}
                </StepLabel>
                <StepContent>
                  {this.getStepContent(index)}
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

export default compose(
  withStyles(materialStyles, { name: 'EditMetadataStepper' }),
  connect(
    mapStateToProps,
    mapDispatchToProps
  ),
)(EditMetadataStepper);
