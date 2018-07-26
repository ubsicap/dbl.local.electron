import { dblDotLocalConfig } from '../constants/dblDotLocal.constants';

export const dblDotLocalService = {
  health
};
export default dblDotLocalService;

function health(method = 'GET') {
  const requestOptions = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  return fetch(`${dblDotLocalConfig.getHttpDblDotLocalBaseUrl()}/health`, requestOptions);
}
