import dblDotLocalConfigConstants from '../constants/dblDotLocal.constants';

const initialState = {
  dblBaseUrl: null
};

export function dblDotLocalConfig(state = initialState, action) {
  switch (action.type) {
    case dblDotLocalConfigConstants.HTML_BASE_URL_RESPONSE:
    {
      const { dblBaseUrl } = action;
      // dblDotLocalConfig.HTML_BASE_URL_RESPONSE, dblBaseUrl
      return {
        dblBaseUrl
      };
    }
    default:
      return state;
  }
}

export default dblDotLocalConfig;
