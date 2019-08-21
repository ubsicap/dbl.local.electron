import { history } from '../store/configureStore';
import { uploadFormConstants } from '../constants/uploadForm.constants';
import { navigationConstants } from '../constants/navigation.constants';
import { utilities } from '../utils/utilities';
import { fetchActiveFormInputs } from '../actions/bundleEditMetadata.actions';

export const uploadFormActions = {
  openUploadForm,
  closeUploadForm
};

export function openUploadForm(bundleId) {
  return dispatch => {
    dispatch(fetchActiveFormInputs(bundleId, '/archiveStatus'));
    const url = utilities.buildRouteUrl(
      navigationConstants.NAVIGATION_ENTRY_UPLOAD_FORM,
      { bundleId }
    );
    history.push(url);
    dispatch({ type: uploadFormConstants.UPLOAD_FORM_OPENED, bundleId });
  };
}

export function closeUploadForm(bundleId) {
  history.push(navigationConstants.NAVIGATION_BUNDLES);
  return { type: uploadFormConstants.UPLOAD_FORM_CLOSED, bundleId };
}
