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
    const url = utilities.buildRouteUrl(
      navigationConstants.NAVIGATION_ENTRY_UPLOAD_FORM,
      { bundleId }
    );
    history.push(url);
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
  history.push(navigationConstants.NAVIGATION_BUNDLES);
  return { type: uploadFormConstants.UPLOAD_FORM_CLOSED, bundleId };
}
