export const servicesHelpers = {
  handleResponseAsReadable
};
export default servicesHelpers;

function handleResponseAsReadable(response) {
  if (!response.ok) {
    if (response.message === 'Failed to fetch' || typeof response.text !== 'function') {
      const error = { text: () => response.message };
      return Promise.reject(error);
    }
    return Promise.reject(response);
  }
  return response;
}
