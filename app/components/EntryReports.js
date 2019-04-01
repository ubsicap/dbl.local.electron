import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { withStyles } from '@material-ui/core/styles';
import EntryAppBar from '../components/EntryAppBar';
import EntryDrawer from '../components/EntryDrawer';
import EntryDialogBody from '../components/EntryDialogBody';
import { ux } from '../utils/ux';
import { closeEntryReports } from '../actions/report.actions';
import { emptyArray, emptyObject } from '../utils/defaultValues';

const getBundlesById = (state) => state.bundles.addedByBundleIds || emptyObject;

function mapStateToProps(state, props) {
  const { bundleId } = props.match.params;
  const bundlesById = getBundlesById(state);
  const activeBundle = bundleId ? bundlesById[bundleId] : emptyObject;
  return {
    bundleId,
    activeBundle
  };
}

const mapDispatchToProps = {
  closeEntryReports
};

const materialStyles = theme => ({
  ...ux.getDblRowStyles(theme),
});

type Props = {
  bundleId: string,
  activeBundle: {},
  closeEntryReports: () => {}
};

class EntryReports extends PureComponent<Props> {
  props: Props;

  handleClose = () => {
    this.props.closeEntryReports(this.props.bundleId);
  };

  conditionallyRenderPrimaryActionButton = () => (null);

  modeUi = () => {
    const title = 'Reports';
    return { appBar: { title, OkButtonLabel: '', OkButtonIcon: (null) } };
  }

  render() {
    const {
      activeBundle, bundleId
    } = this.props;
    const modeUi = this.modeUi();
    return (
      <div>
        <EntryAppBar
          origBundle={activeBundle}
          mode="reports"
          modeUi={modeUi}
          actionButton={this.conditionallyRenderPrimaryActionButton()}
          handleClose={this.handleClose}
        />
        <EntryDrawer
          activeBundle={activeBundle}
        />
        <EntryDialogBody>
          <div>hello world</div>
        </EntryDialogBody>
      </div>
    );
  }
}

export default compose(
  withStyles(materialStyles),
  connect(
    mapStateToProps,
    mapDispatchToProps
  ),
)(EntryReports);
