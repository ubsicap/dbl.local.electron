import React, { Component } from 'react';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { createSelector } from 'reselect';
import EditMetadataForm from './EditMetadataForm';
import { emptyObject } from '../utils/defaultValues';
import { fetchActiveFormInputs } from '../actions/bundleEditMetadata.actions';

type Props = {
  classes: {},
  bundleId: string,
  archiveStatusFormInputs: {},
  fetchToActiveFormInputs: () => {}
};

const archiveStatusFormKey = 'archiveStatus';
const getActiveFormInputs = state => state.bundleEditMetadata.activeFormInputs;
const getArchiveStatusFormInputs = createSelector(
  [getActiveFormInputs],
  activeFormInputs => activeFormInputs[archiveStatusFormKey] || emptyObject
);

function mapStateToProps(state, props) {
  const { bundleId } = props.match.params;
  const archiveStatusFormInputs = getArchiveStatusFormInputs(state);
  return {
    bundleId,
    archiveStatusFormInputs
  };
}

const mapDispatchToProps = {
  fetchToActiveFormInputs: fetchActiveFormInputs
};

class EntryUploadForm extends Component<Props> {
  props: Props;

  componentDidMount() {
    const { fetchToActiveFormInputs, bundleId } = this.props;
    fetchToActiveFormInputs(bundleId, archiveStatusFormKey);
  }

  render() {
    const { bundleId, archiveStatusFormInputs } = this.props;
    return (
      <EditMetadataForm
        key={archiveStatusFormKey}
        bundleId={bundleId}
        formKey={archiveStatusFormKey}
        isFactory={false}
        formErrors={false}
        inputs={archiveStatusFormInputs}
        isActiveForm
      />
    );
  }
}

export default compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(EntryUploadForm);
