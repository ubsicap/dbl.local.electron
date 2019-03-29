import { reportConstants } from '../constants/report.constants';

const initialState = {};

export function reports(state = initialState, action) {
  switch (action.type) {
    case reportConstants.REPORT_LISTENERS: {
      return {
        ...state,
        listeners: action.listeners
      };
    }
    case reportConstants.REPORT_STARTED: {
      const { reportsStarted: reportsStartedOrig = {} } = state;
      const { referenceToken, date, reportType } = action;
      const reportsStarted =
        { ...reportsStartedOrig, [referenceToken]: { date, referenceToken, reportType } };
      return {
        ...state,
        reportsStarted
      };
    }
    case reportConstants.REPORT_COMPLETED: {
      const { reportsCompleted: reportsCompletedOrig = {} } = state;
      const { referenceToken, reportId, date } = action;
      const reportsCompleted =
        { ...reportsCompletedOrig, [referenceToken]: { date, referenceToken, reportId } };
      return {
        ...state,
        reportsCompleted
      };
    }
    default: {
      return state;
    }
  }
}

export default reports;

