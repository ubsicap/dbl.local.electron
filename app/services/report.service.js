import { dblDotLocalService } from '../services/dbl_dot_local.service';
import { reportConstants } from '../constants/report.constants';

export const reportService = {
  checksUseContent,
  setupReportListeners
};
export default reportService;

/*
  [2019-03-27 15:28:54,214] INFO pywsgi: 127.0.0.1 - - [2019-03-27 15:28:54] "POST /session/add-tasks HTTP/1.1" 200 118 0.014043
  [2019-03-27 15:28:54,344] INFO storer: storer, execute_task, session-7240264, useContent
  [2019-03-27 15:28:54,348] INFO storer: storer, change_mode, session-7240264, use
  [2019-03-27 15:28:54,356] INFO storer: storer, report, 1a01, 13375b5d-5b8a-4d8a-8f0f-32397484fa17
  [2019-03-27 15:28:54,360] INFO storer: storer, change_mode, session-7240264, store
  [2019-03-27 15:33:22,759] INFO pywsgi: 127.0.0.1 - - [2019-03-27 15:33:22] "GET /report/13375b5d-5b8a-4d8a-8f0f-32397484fa17 HTTP/1.1" 200 415 0.002006
*/
function checksUseContent(reference, bundleId) {
  return dblDotLocalService.sessionAddTasks(`<tasks>
  <useContent>
      <class>ChecksUseContent</class>
      <data>
          <reference>${reference}</reference>
          <bundle_id>${bundleId}</bundle_id>
      </data>
  </useContent>
</tasks>`);
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

/*
  [2019-03-27 15:28:54,356] INFO storer: storer, report, 1a01, 13375b5d-5b8a-4d8a-8f0f-32397484fa17
 */
function listenStorerReport(event) {
  return (dispatch, getState) => {
    const { reports } = getState();
    const data = JSON.parse(event.data);
    const [bundleId, task] = data.args;
    if (bundleId !== bundleIdTarget) {
      return;
    }
    console.log(`report listenStorerExecuteTask: ${event.data}`);
    if (['copyMetadata', 'copyResources'].includes(task)) {
      dispatch({ type: reportConstants.REPORT_COMPLETED, task });
    }
  };
}