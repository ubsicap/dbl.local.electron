import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { withStyles } from '@material-ui/core/styles';
import EntryAppBar from '../components/EntryAppBar';
import EntryDrawer from '../components/EntryDrawer';
import EntryDialogBody from '../components/EntryDialogBody';
import { ux } from '../utils/ux';
import { closeEntryReports } from '../actions/report.actions';
import EnhancedTable from './EnhancedTable';
import { emptyObject } from '../utils/defaultValues';

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

const reports = [{ type: 'content checks' }];

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
          <EnhancedTable
            data={reports}
            title="Reports"
            columnConfig={{ name: 'type', label: 'type' }}
            orderBy={'type'}
            orderDirection={'asc'}
            onSelectedRowIds={this.handleSelectedRowIds}
            onChangeSort={this.handleChangeSort}
            selectedIds={[]}
          />
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
