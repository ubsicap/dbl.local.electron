import { clipboardConstants } from '../constants/clipboard.constants';
import { bundleConstants } from '../constants/bundle.constants';

const initialState = {};

export function clipboard(state = initialState, action) {
  switch (action.type) {
    case clipboardConstants.SELECT_STORED_RESOURCES_TO_PASTE: {
      const { bundleId, uris, itemsType } = action;
      return getNewStateWithSelectedResourcesToPaste(bundleId, uris, itemsType);
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

  function getNewStateWithSelectedResourcesToPaste(bundleId, uris, itemsType) {
    const { selectedItemsToPaste: selectedResourcesToPasteOrig, ...restState } = state;
    if (bundleId) {
      return {
        ...restState,
        selectedItemsToPaste: { bundleId, uris, itemsType }
      };
    }
    /* remove selectedItemsToPaste */
    return restState;
  }
}

export default clipboard;

