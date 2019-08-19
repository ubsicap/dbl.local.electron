import React, { Component } from 'react';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { createSelector } from 'reselect';
import EditMetadataForm from './EditMetadataForm';
import { emptyObject } from '../utils/defaultValues';
import { fetchActiveFormInputs } from '../actions/bundleEditMetadata.actions';
import { uploadBundle } from '../actions/bundle.actions';
import { closeUploadForm } from '../actions/uploadForm.actions';
import EntryAppBar from './EntryAppBar';
import EntryDrawer from './EntryDrawer';
import EntryDialogBody from './EntryDialogBody';
import ConfirmButton from './ConfirmButton';
import { ux } from '../utils/ux';

type Props = {
  classes: {},
  bundleId: string,
  activeBundle: {},
  archiveStatusFormInputs: {},
  fetchToActiveFormInputs: () => {},
  closeEntryUploadForm: () => {},
  uploadEntryBundle: () => {}
};

const archiveStatusFormKey = 'archiveStatus';
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

function mapStateToProps(state, props) {
  const bundleId = getBundleId(state, props);
  const activeBundle = getActiveBundle(state, props);
  const archiveStatusFormInputs = getArchiveStatusFormInputs(state);
  return {
    bundleId,
    archiveStatusFormInputs,
    activeBundle
  };
}

const mapDispatchToProps = {
  fetchToActiveFormInputs: fetchActiveFormInputs,
  uploadEntryBundle: uploadBundle,
  closeEntryUploadForm: closeUploadForm
};

class EntryUploadForm extends Component<Props> {
  props: Props;

  componentDidMount() {
    const { fetchToActiveFormInputs, bundleId } = this.props;
    fetchToActiveFormInputs(bundleId, archiveStatusFormKey);
  }

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
    const { classes } = this.props;
    const OkButtonProps = {
      classes,
      confirmingProps: { variant: 'contained' },
      color: 'inherit',
      variant: 'text',
      onClick: this.handleClickUpload
    };

    const modeUi = {
      appBar: {
        title,
        OkButtonLabel: `Upload`,
        OkButtonIcon: ux.getModeIcon('upload'),
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

  render() {
    const { bundleId, archiveStatusFormInputs, activeBundle } = this.props;
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
          <EditMetadataForm
            key={archiveStatusFormKey}
            bundleId={bundleId}
            formKey={archiveStatusFormKey}
            isFactory={false}
            formErrors={false}
            inputs={archiveStatusFormInputs}
            isActiveForm
          />
        </EntryDialogBody>
      </div>
    );
  }
}

export default compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(EntryUploadForm);
