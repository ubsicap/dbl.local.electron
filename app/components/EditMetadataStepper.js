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
import { fetchFormStructure } from '../actions/bundleEditMetadata.actions';

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
    formStructure: bundleEditMetadata.formStructure
  };
}

const mapDispatchToProps = {
  fetchFormStructure
};


type Props = {
    classes: {},
    fetchFormStructure: () => {},
    formStructure: []
};

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
  }

  handleStep = step => () => {
    this.setState({
      activeStep: step,
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

  getSteps = () => {
    return this.props.formStructure.map(section => section.name);
    // return ['Select campaign settings', 'Create an ad group', 'Create an ad'];
  };

  getStepContent = (step) => {
    const { formStructure } = this.props;
    const section = formStructure[step];
    const { template, contains } = section;
    if (contains) {
      const message = 'Another stepper';
      const hasForm = template === true;
      return `${message}${hasForm ? ' w/Details' : ''}`;
    }
    if (template) {
      return 'has a form';
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
                  <Typography>{this.getStepContent(index)}</Typography>
                  <div className={classes.actionsContainer}>
                    <div>
                      <Button
                        disabled={activeStep === 0}
                        onClick={this.handleBack}
                        className={classes.button}
                      >
                        Back
                      </Button>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={this.handleNext}
                        className={classes.button}
                      >
                        {activeStep === steps.length - 1 ? 'Finish' : 'Next'}
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
