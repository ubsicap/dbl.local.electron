// @flow
import log from 'electron-log';
import { navigationConstants } from '../constants/navigation.constants';

/*
    dispatch({
      type: 'NAVIGATION_ACTIVITY',
      workspace: '',
      bundle: undefined,
      url: loginUrl,
    });
 */

const initialState = [];

export function navigation(state = initialState, action) {
  switch (action.type) {
    case navigationConstants.NAVIGATION_ACTIVITY: {
      const { type, ...activity } = action;
      const prevActivity = state[state.length - 1];
      if (
        !prevActivity ||
        (!activity.bundle && activity.workspace !== undefined)
      ) {
        log.info({ navigation: activity });
        return [...state, activity]; // workspace navigation
      }
      const bundleActivity = {
        ...activity,
        bundle:
          activity.bundle === undefined ? prevActivity.bundle : activity.bundle,
        workspace: prevActivity.workspace
      };
      log.info({ navigation: bundleActivity });
      return [...state, bundleActivity];
    }
    default:
      return state;
  }
}

export default navigation;
