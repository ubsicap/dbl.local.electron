import { clipboardConstants } from '../constants/clipboard.constants';
import { bundleService } from '../services/bundle.service';

export const clipboardActions = {
  selectItemsToPaste,
  pasteResources,
  clearClipboard
};

export function selectItemsToPaste(bundleId, uris) {
  return {
    type: clipboardConstants.SELECT_STORED_RESOURCES_TO_PASTE,
    bundleId,
    uris
  };
}

export function clearClipboard() {
  return selectItemsToPaste(null, []);
}

export function pasteResources(bundleId) {
  return async (dispatch, getState) => {
    if (!bundleId) {
      return;
    }
    const { selectedItemsToPaste = null } = getState().clipboard;
    if (!selectedItemsToPaste) {
      return;
    }
    if (bundleId === selectedItemsToPaste.bundleId) {
      return;
    }
    await bundleService.waitStartCreateMode(bundleId);
    await bundleService.copyResources(
      bundleId, selectedItemsToPaste.bundleId,
      selectedItemsToPaste.uris
    );
    await bundleService.waitStopCreateMode(bundleId);
    dispatch(success(bundleId, selectedItemsToPaste.uris));
    dispatch(clearClipboard()); // clear it after pasting
    function success(_bundleId, uris) {
      return {
        type: clipboardConstants.PASTE_SELECTED_STORED_RESOURCES_TO_BUNDLE,
        bundleId: _bundleId,
        uris
      };
    }
  };
}
