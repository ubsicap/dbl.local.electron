import { clipboardConstants } from '../constants/clipboard.constants';
import { bundleService } from '../services/bundle.service';
import { fetchFormStructure } from '../actions/bundleEditMetadata.actions';

export const clipboardActions = {
  selectItemsToPaste,
  pasteItems,
  clearClipboard
};

export function selectItemsToPaste(bundleId, items, type) {
  return (dispatch, getState) => {
    dispatch({
      type: clipboardConstants.SELECT_STORED_RESOURCES_TO_PASTE,
      bundleId,
      items,
      itemsType: type,
      getMedium: () => getState().bundles.addedByBundleIds[bundleId].medium,
      getDisplayAs: () => getState().bundles.addedByBundleIds[bundleId].displayAs
    });
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
    if (selectedItemsToPaste.itemsType === 'resources') {
      await bundleService.copyResources(
        bundleId, selectedItemsToPaste.bundleId,
        selectedItemsToPaste.items
      );
    } else if (selectedItemsToPaste.itemsType === 'metadata sections') {
      await bundleService.waitStopCreateMode(bundleId);
      await bundleService.copyMetadata(
        bundleId, selectedItemsToPaste.bundleId,
        selectedItemsToPaste.items
      );
      try {
        await bundleService.waitMode(getState, bundleId, 'store');
        dispatch(fetchFormStructure(bundleId));
      } catch (error) {
        console.log(error);
      }
    }
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
