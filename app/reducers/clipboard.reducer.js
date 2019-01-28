import { clipboardConstants } from '../constants/clipboard.constants';
import { bundleConstants } from '../constants/bundle.constants';

const initialState = {};

export function clipboard(state = initialState, action) {
  switch (action.type) {
    case clipboardConstants.CLIPBOARD_LISTENERS: {
      return {
        ...state,
        listeners: action.listeners
      };
    }
    case clipboardConstants.PASTE_SELECTED_ITEMS_TO_BUNDLE_REQUEST: {
      return {
        ...state,
        bundleIdTarget: action.bundleId,
        hasPastedSelectedItems: false
      };
    }
    case clipboardConstants.CLIPBOARD_HAS_STARTED_PASTE_ITEMS: {
      return {
        ...state,
        isPastingSelectedItems: true,
        hasPastedSelectedItems: false
      };
    }
    case clipboardConstants.CLIPBOARD_HAS_FINISHED_PASTE_ITEMS: {
      return {
        ...state,
        isPastingSelectedItems: false,
        hasPastedSelectedItems: true
      };
    }
    case clipboardConstants.SELECT_ITEMS_TO_PASTE: {
      const {
        bundleId, items, itemsType, getMedium, getDisplayAs
      } = action;
      return getNewStateWithSelectedResourcesToPaste(
        bundleId,
        items,
        itemsType,
        getMedium,
        getDisplayAs
      );
    }
    case bundleConstants.DELETE_SUCCESS: {
      const { selectedItemsToPaste: selectedResourcesToPasteOrig = {} } = state;
      const { id: bundleIdToRemove } = action;
      if (bundleIdToRemove === selectedResourcesToPasteOrig.bundleId) {
        return getNewStateWithSelectedResourcesToPaste(null, [], null);
      }
      return state;
    }
    default: {
      return state;
    }
  }

  function getNewStateWithSelectedResourcesToPaste(
    bundleId,
    items,
    itemsType,
    getMedium,
    getDisplayAs
  ) {
    const { selectedItemsToPaste: selectedResourcesToPasteOrig, ...restState } = state;
    if (bundleId) {
      return {
        ...restState,
        selectedItemsToPaste: {
          bundleId, items, itemsType, getMedium, getDisplayAs
        }
      };
    }
    /* remove selectedItemsToPaste */
    return restState;
  }
}

export default clipboard;

