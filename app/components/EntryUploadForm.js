import React, { Component } from 'react';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import CardActions from '@material-ui/core/CardActions';
import classNames from 'classnames';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { withStyles } from '@material-ui/core/styles';
import { Button } from '@material-ui/core';
import Grid from '@material-ui/core/Grid';
import Checkbox from '@material-ui/core/Checkbox';
import { green } from '@material-ui/core/colors';
import Typography from '@material-ui/core/Typography';
import OpenInNew from '@material-ui/icons/OpenInNew';
import { createSelector } from 'reselect';
import EditMetadataForm from './EditMetadataForm';
import { emptyObject } from '../utils/defaultValues';
import { reportConstants } from '../constants/report.constants';
import {
  fetchActiveFormInputs,
  saveFieldValuesForActiveForm,
  openMetadataFile
} from '../actions/bundleEditMetadata.actions';
import { startReport } from '../actions/report.actions';
import { uploadBundle } from '../actions/bundle.actions';
import { closeUploadForm } from '../actions/uploadForm.actions';
import EntryAppBar from './EntryAppBar';
import EntryDrawer from './EntryDrawer';
import EntryDialogBody from './EntryDialogBody';
import ConfirmButton from './ConfirmButton';
import { ux } from '../utils/ux';
import editMetadataService from '../services/editMetadata.service';
import UndoSaveButtons from './UndoSaveButtons';

type Props = {
  classes: {},
  bundleId: string,
  activeBundle: {},
  activeFormEdits: {},
  archiveStatusFormInputs: {},
  formErrors: {},
  fetchToActiveFormInputs: () => {},
  closeEntryUploadForm: () => {},
  uploadEntryBundle: () => {},
  saveActiveFormFieldValues: () => {},
  openEntryMetadataFile: () => {},
  runReport: () => {}
};

const materialStyles = theme => ({
  root: {},
  ...ux.getEditMetadataStyles(theme),
  title: {
    fontSize: 14
  },
  layout: {
    width: 'auto',
    marginLeft: theme.spacing.unit * 3,
    marginRight: theme.spacing.unit * 3,
    [theme.breakpoints.up(1100 + theme.spacing.unit * 3 * 2)]: {
      width: 1100,
      marginLeft: 'auto',
      marginRight: 'auto'
    }
  },
  cardGrid: {
    padding: `${theme.spacing.unit * 8}px 0`
  },
  card: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column'
  }
});

const archiveStatusFormKey = '/archiveStatus';
const getActiveFormEdits = state => state.bundleEditMetadata.activeFormEdits;
const getActiveFormInputs = state => state.bundleEditMetadata.activeFormInputs;
const getArchiveStatusFormInputs = createSelector(
  [getActiveFormInputs],
  activeFormInputs => activeFormInputs[archiveStatusFormKey] || emptyObject
);

const getBundlesById = state => state.bundles.addedByBundleIds || emptyObject;
const getBundleId = (state, props) => props.match.params.bundleId;

const getActiveBundle = createSelector(
  [getBundlesById, getBundleId],
  (bundlesById, bundleId) => bundlesById[bundleId]
);

const getFormFieldIssues = state =>
  state.bundleEditMetadata.formFieldIssues || emptyObject;

const getFormErrors = createSelector(
  [getFormFieldIssues],
  formFieldIssues => {
    const {
      [archiveStatusFormKey]: formIssues = emptyObject
    } = formFieldIssues;
    return formIssues;
  }
);

function mapStateToProps(state, props) {
  const bundleId = getBundleId(state, props);
  const activeBundle = getActiveBundle(state, props);
  const archiveStatusFormInputs = getArchiveStatusFormInputs(state);
  const activeFormEdits = getActiveFormEdits(state);
  const formErrors = getFormErrors(state);
  return {
    bundleId,
    archiveStatusFormInputs,
    activeFormEdits,
    activeBundle,
    formErrors
  };
}

const mapDispatchToProps = {
  fetchToActiveFormInputs: fetchActiveFormInputs,
  uploadEntryBundle: uploadBundle,
  openEntryMetadataFile: openMetadataFile,
  closeEntryUploadForm: closeUploadForm,
  saveActiveFormFieldValues: saveFieldValuesForActiveForm,
  runReport: startReport
};

class EntryUploadForm extends Component<Props> {
  props: Props;

  state = {};

  onClickUploadBundle = event => {
    const { bundleId, uploadEntryBundle } = this.props;
    uploadEntryBundle(bundleId);
    event.stopPropagation();
  };

  handleClose = () => {
    const { bundleId, closeEntryUploadForm } = this.props;
    closeEntryUploadForm(bundleId);
  };

  modeUi = () => {
    const title = 'Upload to DBL';
    const { classes, formErrors } = this.props;
    const { hasCheckedContentUse, hasCheckedMetadataXml } = this.state;
    const hasFormErrors = Object.keys(formErrors).length > 0;
    const OkButtonProps = {
      classes,
      confirmingProps: { variant: 'contained' },
      color: 'inherit',
      variant: 'text',
      onClick: this.handleClickUpload,
      disabled:
        hasFormErrors || !(hasCheckedContentUse && hasCheckedMetadataXml)
    };

    const modeUi = {
      appBar: {
        title,
        OkButtonLabel: `Upload`,
        OkButtonIcon: ux.getModeIcon('upload', {
          color: 'inherit',
          className: classes.leftIcon
        }),
        OkButtonProps
      }
    };
    return modeUi;
  };

  conditionallyRenderPrimaryActionButton = () => {
    const modeUi = this.modeUi();
    if (!modeUi.appBar.OkButtonIcon) {
      return null;
    }
    return (
      <ConfirmButton key="btnOk" {...modeUi.appBar.OkButtonProps}>
        {modeUi.appBar.OkButtonIcon}
        {modeUi.appBar.OkButtonLabel}
      </ConfirmButton>
    );
  };

  getActiveFormFields = () => {
    const { archiveStatusFormInputs } = this.props;
    const { fields = [] } = archiveStatusFormInputs;
    return fields;
  };

  computeHasActiveFormChanged = activeFormEdits => {
    const fields = this.getActiveFormFields();
    const hasFormChanged = editMetadataService.getHasFormFieldsChanged(
      fields,
      activeFormEdits
    );
    return hasFormChanged;
  };

  handleUndo = () => {
    const { bundleId, fetchToActiveFormInputs } = this.props;
    fetchToActiveFormInputs(bundleId, archiveStatusFormKey, true);
  };

  handleSave = () => {
    const { saveActiveFormFieldValues } = this.props;
    saveActiveFormFieldValues();
  };

  renderRightsHolders = () => {
    const {
      activeBundle: { raw: rawBundle },
      classes
    } = this.props;
    const {
      metadata: { agencies }
    } = rawBundle;
    const rightsHolders = agencies.filter(a => a.type === 'rightsHolder');
    return rightsHolders.map(rh => (
      <Card className={classes.card} key={rh.uid}>
        <CardActions>
          <Grid container direction="column" justify="center">
            <Grid item>
              <Typography noWrap>
                <span style={{ fontWeight: 'bold' }}>{rh.abbr}</span>
              </Typography>
            </Grid>
            <Grid item>
              <Typography noWrap>{rh.name}</Typography>
            </Grid>
          </Grid>
        </CardActions>
      </Card>
    ));
  };

  renderSaveUndoButtons = () => {
    const { activeFormEdits } = this.props;
    const hasFormChanged = this.computeHasActiveFormChanged(activeFormEdits);
    if (!hasFormChanged) {
      return null;
    }
    return (
      <UndoSaveButtons
        handleUndo={this.handleUndo}
        handleSave={this.handleSave}
      />
    );
  };

  handleRunReportChecksContentUse = () => {
    const { runReport, bundleId } = this.props;
    runReport(bundleId, reportConstants.ChecksUseContent);
    this.setState({ hasCheckedContentUse: true });
  };

  handleOpenMetadataXml = () => {
    const { openEntryMetadataFile, bundleId } = this.props;
    openEntryMetadataFile(bundleId);
    this.setState({ hasCheckedMetadataXml: true });
  };

  render() {
    const {
      bundleId,
      archiveStatusFormInputs,
      activeBundle,
      formErrors,
      classes
    } = this.props;
    const {
      hasCheckedContentUse = false,
      hasCheckedMetadataXml = false
    } = this.state;
    const modeUi = this.modeUi();
    return (
      <div>
        <EntryAppBar
          origBundle={activeBundle}
          mode="upload"
          modeUi={modeUi}
          actionButton={this.conditionallyRenderPrimaryActionButton()}
          handleClose={this.handleClose}
        />
        <EntryDrawer activeBundle={activeBundle} />
        <EntryDialogBody>
          <div className={classNames(classes.layout, classes.cardGrid)}>
            <Grid container spacing={40}>
              <Grid item key="archiveStatus" sm={12} md={12} lg={12}>
                <Card className={classes.card}>
                  <CardContent>
                    <Typography variant="h6" noWrap gutterBottom>
                      Archive Status
                    </Typography>
                    <EditMetadataForm
                      key={archiveStatusFormKey}
                      bundleId={bundleId}
                      formKey={archiveStatusFormKey}
                      isFactory={false}
                      formErrors={formErrors}
                      inputs={archiveStatusFormInputs}
                      isActiveForm
                    />
                  </CardContent>
                  <CardActions>{this.renderSaveUndoButtons()}</CardActions>
                </Card>
              </Grid>
              <Grid item key="rightsHolders" sm={12} md={12} lg={12}>
                <Card className={classes.card}>
                  <CardContent>
                    <Typography variant="h6" noWrap gutterBottom>
                      Rightsholders
                    </Typography>
                    {this.renderRightsHolders()}
                  </CardContent>
                </Card>
              </Grid>
              <Grid item key="Checks" sm={12} md={12} lg={12}>
                <Card className={classes.card}>
                  <CardContent>
                    <Typography variant="h6" noWrap gutterBottom>
                      Checks
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Grid container direction="column" spacing={24}>
                      <Grid item>
                        <GreenCheckbox
                          checked={hasCheckedContentUse}
                          disabled={!hasCheckedContentUse}
                        />
                        <Button
                          variant="outlined"
                          onClick={this.handleRunReportChecksContentUse}
                        >
                          {ux.getModeIcon('reports', {
                            className: classes.leftIcon
                          })}
                          Run Checks Content Use Report
                        </Button>
                      </Grid>
                      <Grid item>
                        <GreenCheckbox
                          checked={hasCheckedMetadataXml}
                          disabled={!hasCheckedMetadataXml}
                        />
                        <Button
                          variant="outlined"
                          onClick={this.handleOpenMetadataXml}
                        >
                          <OpenInNew className={classes.leftIcon} />
                          Review metadata.xml
                        </Button>
                      </Grid>
                    </Grid>
                  </CardActions>
                </Card>
              </Grid>
            </Grid>
          </div>
        </EntryDialogBody>
      </div>
    );
  }
}

const GreenCheckbox = withStyles({
  root: {
    color: green[400],
    '&$checked': {
      color: green[600]
    }
  },
  checked: {}
})(props => <Checkbox color="default" {...props} />);

export default compose(
  withStyles(materialStyles),
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(EntryUploadForm);
