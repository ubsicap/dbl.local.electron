import { history } from '../store/configureStore';
import { uploadFormConstants } from '../constants/uploadForm.constants';
import { navigationConstants } from '../constants/navigation.constants';
import { bundleService } from '../services/bundle.service';
import { utilities } from '../utils/utilities';
import { fetchActiveFormInputs } from './bundleEditMetadata.actions';

export const uploadFormActions = {
  openUploadForm,
  closeUploadForm
};

export function openUploadForm(bundleId) {
  return (dispatch, getState) => {
    dispatch(fetchActiveFormInputs(bundleId, '/archiveStatus'));
    const openUploadFormUrl = utilities.buildRouteUrl(
      navigationConstants.NAVIGATION_ENTRY_UPLOAD_FORM,
      { bundleId }
    );
    dispatch({
      type: navigationConstants.NAVIGATION_ACTIVITY,
      url: openUploadFormUrl,
      bundle: bundleId
    });
    history.push(openUploadFormUrl);
    const bundleToEdit = bundleService.getCurrentBundleState(
      getState,
      bundleId
    );
    dispatch({
      type: uploadFormConstants.UPLOAD_FORM_OPENED,
      bundleId,
      bundleToEdit
    });
  };
}

export function closeUploadForm(bundleId) {
  return dispatch => {
    dispatch({
      type: navigationConstants.NAVIGATION_ACTIVITY,
      url: navigationConstants.NAVIGATION_BUNDLES,
      bundle: bundleId /* assume user would want to send feedback for uploads */
    });
    history.push(navigationConstants.NAVIGATION_BUNDLES);
    dispatch({ type: uploadFormConstants.UPLOAD_FORM_CLOSED, bundleId });
  };
}
