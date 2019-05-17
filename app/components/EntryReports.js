import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { withStyles } from '@material-ui/core/styles';
import CircularProgress from '@material-ui/core/CircularProgress';
import PlayCircleOutline from '@material-ui/icons/PlayCircleOutline';
import ConfirmButton from '../components/ConfirmButton';
import EntryAppBar from '../components/EntryAppBar';
import EntryDrawer from '../components/EntryDrawer';
import EntryDialogBody from '../components/EntryDialogBody';
import { ux } from '../utils/ux';
import { closeEntryReports, selectReportsToRun, startSelectedReports } from '../actions/report.actions';
import { reportConstants } from '../constants/report.constants';
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

const getReportsStarted = (state, props) =>
  utilities.getOrDefault(
    state.reports.reportsStarted,
    props.match.params.bundleId,
    emptyArray
  );

const getReportsCompleted = (state, props) =>
  utilities.getOrDefault(
    state.reports.reportsCompleted,
    props.match.params.bundleId,
    emptyArray
  );

function mapStateToProps(state, props) {
  const { bundleId } = props.match.params;
  const bundlesById = getBundlesById(state);
  const activeBundle = bundleId ? bundlesById[bundleId] : emptyObject;
  const reportsStarted = getReportsStarted(state, props);
  const reportsCompleted = getReportsCompleted(state, props);
  const areAnyReportsRunning = Object.values(reportsStarted)
    .filter(r => r.bundleId === bundleId)
    .some(r => !(r.referenceToken in reportsCompleted));
  return {
    bundleId,
    activeBundle,
    selectedReportIdsToRun: getSelectedReportIdsToRun(state, props),
    areAnyReportsRunning
  };
}

const mapDispatchToProps = {
  closeEntryReports,
  selectReportsToRun,
  startSelectedReports
};

const materialStyles = theme => ({
  ...ux.getDblRowStyles(theme),
  ...ux.getEntryUxStyles(theme)
});

type Props = {
  classes: {},
  bundleId: string,
  activeBundle: {},
  selectedReportIdsToRun: [],
  areAnyReportsRunning: boolean,
  closeEntryReports: () => {},
  selectReportsToRun: () => {},
  startSelectedReports: () => {},
};

function createReportRowData(id, type, description) {
  return { id, type, description };
}
const columnsConfig = ux.mapColumns(createReportRowData(), () => false, () => null);

const reports = [createReportRowData(reportConstants.ChecksUseContent, 'Checks Content Use', 'Checks entry for missing chapters etc...')];

class EntryReports extends PureComponent<Props> {
  props: Props;

  handleClose = () => {
    this.props.closeEntryReports(this.props.bundleId);
  };

  conditionallyRenderPrimaryActionButton = () => {
    const modeUi = this.modeUi();
    if (!modeUi.appBar.OkButtonIcon) {
      return (null);
    }
    const { classes, areAnyReportsRunning } = this.props;
    return (
      <ConfirmButton
        key="btnOk"
        {...modeUi.appBar.OkButtonProps}
      >
        {modeUi.appBar.OkButtonIcon}
        {modeUi.appBar.OkButtonLabel}
        {areAnyReportsRunning &&
        <CircularProgress
          className={classes.buttonProgress}
          size={50}
          color="secondary"
          variant="indeterminate"
        />}
      </ConfirmButton>);
  };

  handleClickRunReports = () => {
    this.props.startSelectedReports(this.props.bundleId);
  }

  modeUi = () => {
    const title = 'Reports';
    const { classes, selectedReportIdsToRun } = this.props;
    const hasSelectedReportsToRun = selectedReportIdsToRun.length > 0;
    const OkButtonProps = {
      classes,
      confirmingProps: { variant: 'contained' },
      color: hasSelectedReportsToRun ? 'secondary' : 'inherit',
      variant: hasSelectedReportsToRun ? 'contained' : 'text',
      onClick: this.handleClickRunReports,
      disabled: !hasSelectedReportsToRun
    };
    const modeUi =
      {
        appBar: {
          title, OkButtonLabel: `Run Reports (${selectedReportIdsToRun.length})`, OkButtonIcon: <PlayCircleOutline />, OkButtonProps
        }
      };
    return modeUi;
  }

  handleSelectedRowIds = (selectedRowIds) => {
    this.props.selectReportsToRun(this.props.bundleId, selectedRowIds);
  }

  render() {
    const { activeBundle } = this.props;
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
