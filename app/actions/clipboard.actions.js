import { clipboardConstants } from '../constants/clipboard.constants';
import { bundleService } from '../services/bundle.service';

export const clipboardActions = {
  selectItemsToPaste,
  pasteItems,
  clearClipboard
};

export function selectItemsToPaste(bundleId, items, type) {
  return {
    type: clipboardConstants.SELECT_STORED_RESOURCES_TO_PASTE,
    bundleId,
    items,
    itemsType: type
  };
}

export function clearClipboard() {
  return selectItemsToPaste(null, []);
}

export function pasteItems(bundleId) {
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
      selectedItemsToPaste.items
    );
    await bundleService.waitStopCreateMode(bundleId);
    dispatch(success(bundleId, selectedItemsToPaste.items));
    dispatch(clearClipboard()); // clear it after pasting
    function success(_bundleId, items) {
      return {
        type: clipboardConstants.PASTE_SELECTED_STORED_RESOURCES_TO_BUNDLE,
        bundleId: _bundleId,
        items
      };
    }
  };
}
