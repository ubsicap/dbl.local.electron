import uuidv1 from 'uuid/v1';
import { history } from '../store/configureStore';
import { reportConstants } from '../constants/report.constants';
import { navigationConstants } from '../constants/navigation.constants';
import { reportService } from '../services/report.service';
import { browserWindowService } from '../services/browserWindow.service';
import { utilities } from '../utils/utilities';

export const reportActions = {
  openEntryReports,
  closeEntryReports,
  setupReportListeners,
  startReport,
  selectReportsToRun,
  startSelectedReports,
};

export function openEntryReports(bundleId) {
  return dispatch => {
    const url =
    utilities.buildRouteUrl(
      navigationConstants.NAVIGATION_ENTRY_REPORTS,
      { bundleId }
    );
    history.push(url);
    dispatch({ type: reportConstants.ENTRY_REPORTS_OPENED, bundleId });
  };
}

export function closeEntryReports(bundleId) {
  history.push(navigationConstants.NAVIGATION_BUNDLES);
  return { type: reportConstants.ENTRY_REPORTS_CLOSED, bundleId };
}

export function setupReportListeners() {
  return (dispatch, getState) => {
    const { authentication: { eventSource } } = getState();
    if (!eventSource) {
      console.error('EventSource undefined');
      return;
    }
    const dispatchListenStorerReport = (e) => dispatch(listenStorerReport(e));

    const listeners = {
      'storer/report': dispatchListenStorerReport
    };
    Object.keys(listeners).forEach((evType) => {
      const handler = listeners[evType];
      eventSource.addEventListener(evType, handler);
    });
    return dispatch({ type: reportConstants.REPORT_LISTENERS_STARTED, listeners });
  };
}

export function startReport(bundleId, reportType) {
  return async (dispatch) => {
    const uuid1 = uuidv1();
    const referenceToken = uuid1.substr(0, 5);
    dispatch({
      type: reportConstants.REPORT_STARTED, bundleId, referenceToken, reportType
    });
    switch (reportType) {
      case reportConstants.ChecksUseContent: {
        await reportService.checksUseContent({ bundleId, reference: referenceToken });
        break;
      }
      default: {
        throw new Error(`Unhandled reportType: ${reportType}`);
      }
    }
  };
}

export function startSelectedReports(bundleId) {
  return (dispatch, getState) => {
    const { selectedReportIdsToRun } = getState().reports;
    const selectedReportIdsToRunNow = selectedReportIdsToRun[bundleId] || [];
    selectedReportIdsToRunNow.forEach(reportId => {
      dispatch(startReport(bundleId, reportId));
    });
    dispatch(selectReportsToRun([])); // finished starting selected reports
  };
}

/*
  [2019-03-27 15:28:54,356] INFO storer: storer, report, 1a01, 13375b5d-5b8a-4d8a-8f0f-32397484fa17
 */
function listenStorerReport(event) {
  return async (dispatch, getState) => {
    const data = JSON.parse(event.data);
    const [referenceToken, reportId] = data.args;
    const { reportsStarted = {} } = getState().reports;
    const { bundleId } = reportsStarted[referenceToken];
    const { addedByBundleIds } = getState().bundles;
    const bundle = addedByBundleIds[bundleId];
    const {
      name, dblId, revision, languageAndCountry
    } = bundle.displayAs;
    const title = `Report - Checks - ${bundle.medium} (${languageAndCountry}) ${name} ${dblId}, ${revision}`;
    const reportFilePath = await reportService.saveReportToFile(bundleId, referenceToken, reportId, title);
    browserWindowService.openFileInChromeBrowser(reportFilePath, false);
    dispatch({
      type: reportConstants.REPORT_COMPLETED, referenceToken, reportId, date: Date.now()
    });
  };
}

export function selectReportsToRun(bundleId, selectedReportIds) {
  return { type: reportConstants.REPORTS_SELECTED_TO_RUN, bundleId, selectedReportIds };
}
