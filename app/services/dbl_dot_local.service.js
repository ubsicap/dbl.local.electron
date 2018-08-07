import { dblDotLocalConfig } from '../constants/dblDotLocal.constants';

export const dblDotLocalService = {
  health,
  htmlBaseUrl
};
export default dblDotLocalService;

const UX_API = 'ux';

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
  try {
    const response = await fetch(`${dblDotLocalConfig.getHttpDblDotLocalBaseUrl()}/${UX_API}/html-base-url`, requestOptions);
    return handlResponseAsReadable(response);
  } catch (error) {
    return handlResponseAsReadable(error);
  }
}

function handlResponseAsReadable(response) {
  if (!response.ok) {
    if (response.message === 'Failed to fetch') {
      const error = { text: () => response.message };
      return Promise.reject(error);
    }
    return Promise.reject(response);
  }
  return response;
}
