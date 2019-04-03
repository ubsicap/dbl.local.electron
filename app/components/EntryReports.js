import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { withStyles } from '@material-ui/core/styles';
import EntryAppBar from '../components/EntryAppBar';
import EntryDrawer from '../components/EntryDrawer';
import EntryDialogBody from '../components/EntryDialogBody';
import { ux } from '../utils/ux';
import { closeEntryReports, selectReportsToRun } from '../actions/report.actions';
import EnhancedTable from './EnhancedTable';
import { utilities } from '../utils/utilities';
import { emptyObject, emptyArray } from '../utils/defaultValues';

const getBundlesById = (state) => state.bundles.addedByBundleIds || emptyObject;
const getSelectedReportIdsToRun = (state, props) =>
  utilities.getOrDefault(
    state.reports.selectedReportIdsToRun,
    props.match.params.bundleId,
    emptyArray
  );

function mapStateToProps(state, props) {
  const { bundleId } = props.match.params;
  const bundlesById = getBundlesById(state);
  const activeBundle = bundleId ? bundlesById[bundleId] : emptyObject;
  return {
    bundleId,
    activeBundle,
    selectedReportIdsToRun: getSelectedReportIdsToRun(state, props),
  };
}

const mapDispatchToProps = {
  closeEntryReports,
  selectReportsToRun
};

const materialStyles = theme => ({
  ...ux.getDblRowStyles(theme),
});

type Props = {
  bundleId: string,
  activeBundle: {},
  selectedReportIdsToRun: [],
  closeEntryReports: () => {},
  selectReportsToRun: () => {}
};

function createReportRowData(type) {
  return { id: type, type };
}
const reports = [createReportRowData('content checks')];

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

  handleSelectedRowIds = (selectedRowIds) => {
    this.props.selectReportsToRun(this.props.bundleId, selectedRowIds);
  }

  render() {
    const {
      activeBundle, bundleId
    } = this.props;
    const columnsConfig = ux.mapColumns(createReportRowData(), () => false, () => null);
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
            columnConfig={columnsConfig}
            orderBy="type"
            secondarySorts={emptyArray}
            orderDirection="asc"
            onSelectedRowIds={this.handleSelectedRowIds}
            onChangeSort={() => {}}
            selectedIds={this.props.selectedReportIdsToRun}
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
