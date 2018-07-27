import { dblDotLocalConfig } from '../constants/dblDotLocal.constants';

export const dblDotLocalService = {
  health,
  htmlBaseUrl
};
export default dblDotLocalService;

const UTILS_API = 'utils';

function health(method = 'GET') {
  const requestOptions = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  return fetch(`${dblDotLocalConfig.getHttpDblDotLocalBaseUrl()}/health`, requestOptions);
}

async function htmlBaseUrl() {
  const requestOptions = {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  };
  const response = await fetch(`${dblDotLocalConfig.getHttpDblDotLocalBaseUrl()}/${UTILS_API}/html-base-url`, requestOptions);
  return handlResponseAsReadable(response);
}

function handlResponseAsReadable(response) {
  if (!response.ok) {
    return Promise.reject(response);
  }
  return response;
}
