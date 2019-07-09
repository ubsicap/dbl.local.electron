import { bundleResourceManagerConstants } from '../constants/bundleResourceManager.constants';

export function bundlesSaveTo(state = {}, action) {
  switch (action.type) {
    case bundleResourceManagerConstants.SAVETO_REQUEST: {
      const {
        filesToTransfer,
        filesTransferred,
        bundleBytesToSave,
        bundleBytesSaved
      } = action;
      return {
        ...state,
        isExporting: true,
        savedToHistory: {
          ...state.savedToHistory,
          ...{
            [action.id]: {
              folderName: action.folderName,
              bundleBytesToSave,
              bundleBytesSaved,
              filesToTransfer,
              filesTransferred
            }
          }
        }
      };
    }
    case bundleResourceManagerConstants.SAVETO_UPDATED: {
      const historyToUpdate = state.savedToHistory[action.id];
      const {
        filesToTransfer,
        filesTransferred,
        bundleBytesToSave,
        bundleBytesSaved
      } = action;
      const isExporting =
        action.filesTransferred.length !== action.filesToTransfer.length;
      return {
        ...state,
        isExporting,
        savedToHistory: {
          ...state.savedToHistory,
          ...{
            [action.id]: {
              ...historyToUpdate,
              bundleBytesToSave,
              bundleBytesSaved,
              filesToTransfer,
              filesTransferred
            }
          }
        }
      };
    }
    case bundleResourceManagerConstants.SAVETO_FAILURE:
      return {
        error: action.error
      };
    default:
      return state;
  }
}
export default bundlesSaveTo;
