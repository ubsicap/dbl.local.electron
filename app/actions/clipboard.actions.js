import waitUntil from 'node-wait-until';
import { clipboardConstants } from '../constants/clipboard.constants';
import { bundleService } from '../services/bundle.service';
import { fetchFormStructure } from '../actions/bundleEditMetadata.actions';
import { clipboardHelpers } from '../helpers/clipboard';

export const clipboardActions = {
  selectItemsToPaste,
  pasteItems,
  clearClipboard,
  setupClipboardListeners
};

export function selectItemsToPaste(bundleId, items, type) {
  return (dispatch, getState) => {
    dispatch({
      type: clipboardConstants.SELECT_ITEMS_TO_PASTE,
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
    const { clipboard } = getState();
    const { selectedItemsToPaste = null } = clipboard;
    if (!selectedItemsToPaste) {
      return;
    }
    if (bundleId === selectedItemsToPaste.bundleId) {
      return;
    }
    dispatch(request(bundleId, selectedItemsToPaste.items));
    if (selectedItemsToPaste.itemsType === 'resources') {
      await bundleService.copyResources(
        bundleId, selectedItemsToPaste.bundleId,
        selectedItemsToPaste.items
      );
    } else if (selectedItemsToPaste.itemsType === 'metadata sections') {
      const targetBundle = getState().bundles.addedByBundleIds[bundleId];
      const sectionsToPaste = selectedItemsToPaste.items
        .filter(sectionName => clipboardHelpers.getIsMetadataSectionCompatibleForPasting(selectedItemsToPaste.getMedium(), targetBundle.medium, sectionName));
      await bundleService.waitStopCreateMode(bundleId);
      await bundleService.copyMetadata(
        bundleId, selectedItemsToPaste.bundleId,
        sectionsToPaste
      );
      // wait for eventSource listeners to change the state
      await waitUntil(async () => getState().clipboard.hasPastedSelectedItems);
      dispatch(fetchFormStructure(bundleId, true, false));
    }
    dispatch(success(bundleId, selectedItemsToPaste.items));
    dispatch(clearClipboard()); // clear it after pasting
  };

  function request(_bundleId, items) {
    return {
      type: clipboardConstants.PASTE_SELECTED_ITEMS_TO_BUNDLE_REQUEST,
      bundleId: _bundleId,
      items
    };
  }
  function success(_bundleId, items) {
    return {
      type: clipboardConstants.PASTE_SELECTED_ITEMS_TO_BUNDLE_SUCCESS,
      bundleId: _bundleId,
      items
    };
  }
}

export function setupClipboardListeners() {
  return (dispatch, getState) => {
    const { authentication: { eventSource } } = getState();
    if (!eventSource) {
      console.error('EventSource undefined');
      return;
    }
    const dispatchListenStorerExecuteTask = (e) => dispatch(listenStorerExecuteTask(e));
    const dispatchListenStorerChangeMode = (e) => dispatch(listenStorerChangeMode(e));

    const listeners = {
      'storer/execute_task': dispatchListenStorerExecuteTask,
      'storer/change_mode': dispatchListenStorerChangeMode,
    };
    Object.keys(listeners).forEach((evType) => {
      const handler = listeners[evType];
      eventSource.addEventListener(evType, handler);
    });
    return dispatch({ type: clipboardConstants.CLIPBOARD_LISTENERS, listeners });
  };
}

/* clipboard listenStorerExecuteTask:
  {"args": ["018868cf-7e57-44b0-a8d0-c8d73c5ba133", "copyMetadata"],
   "component": "storer", "type": "execute_task"}
 */
function listenStorerExecuteTask(event) {
  return (dispatch, getState) => {
    const { clipboard } = getState();
    const { selectedItemsToPaste = null, bundleIdTarget } = clipboard;
    if (!selectedItemsToPaste || !bundleIdTarget) {
      return;
    }
    const data = JSON.parse(event.data);
    const [bundleId, task] = data.args;
    if (bundleId !== bundleIdTarget) {
      return;
    }
    console.log(`clipboard listenStorerExecuteTask: ${event.data}`);
    if (['copyMetadata', 'copyResources'].includes(task)) {
      dispatch({ type: clipboardConstants.CLIPBOARD_HAS_STARTED_PASTE_ITEMS, task });
    }
  };
}

/* clipboard listenStorerChangeMode:
  {"args": ["018868cf-7e57-44b0-a8d0-c8d73c5ba133", "storeTask"],
  "component": "storer", "type": "change_mode"}
* clipboard listenStorerChangeMode:
  {"args": ["018868cf-7e57-44b0-a8d0-c8d73c5ba133", "store"],
    "component": "storer", "type": "change_mode"}
*/
function listenStorerChangeMode(event) {
  return (dispatch, getState) => {
    const { clipboard } = getState();
    const { selectedItemsToPaste = null, isPastingSelectedItems, bundleIdTarget } = clipboard;
    if (!selectedItemsToPaste || !bundleIdTarget || !isPastingSelectedItems) {
      return;
    }
    const data = JSON.parse(event.data);
    const [bundleId, mode] = data.args;
    if (bundleId !== bundleIdTarget) {
      return;
    }
    console.log(`clipboard listenStorerChangeMode: ${event.data}`);
    if (mode === 'store') {
      dispatch({ type: clipboardConstants.CLIPBOARD_HAS_FINISHED_PASTE_ITEMS });
      const { authentication: { eventSource } } = getState();
      const { listeners } = clipboard;
      Object.keys(listeners).forEach((evType) => {
        const handler = listeners[evType];
        eventSource.removeEventListener(evType, handler);
      });
    }
  };
}
