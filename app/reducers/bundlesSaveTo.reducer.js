import { bundleResourceManagerConstants } from '../constants/bundleResourceManager.constants';

export function bundlesSaveTo(state = {}, action) {
  switch (action.type) {
    case bundleResourceManagerConstants.SAVETOREQUEST: {
      const resourcePathsBytesSaved = action.resourcePaths.reduce(
        (acc, resourcePath) => {
          acc[resourcePath] = 0;
          return acc;
        },
        {}
      );
      return {
        ...state,
        isExporting: true,
        savedToHistory: {
          ...state.savedToHistory,
          ...{
            [action.id]: {
              folderName: action.folderName,
              bundleBytesToSave: action.bundleBytesToSave,
              bundleBytesSaved: 0,
              resourcePathsBytesSaved
            }
          }
        }
      };
    }
    case bundleResourceManagerConstants.SAVETOUPDATED: {
      const bundleToUpdate = state.savedToHistory[action.id];
      const originalResourcePathsBytesTransfered =
        bundleToUpdate.resourcePathsBytesSaved;
      const resourcePathBytesTransferedOriginal =
        originalResourcePathsBytesTransfered[action.resourcePath];
      const isExporting = action.bundleBytesSaved !== action.bundleBytesToSave;
      const resourceBytesDiff =
        action.resourceTotalBytesSaved - resourcePathBytesTransferedOriginal;
      const bundleBytesSaved =
        bundleToUpdate.bundleBytesSaved + resourceBytesDiff;
      const resourcePathsBytesSaved = {
        ...originalResourcePathsBytesTransfered,
        [action.resourcePath]: action.resourceTotalBytesSaved
      };
      const updatedBundle = {
        ...bundleToUpdate,
        bundleBytesSaved,
        resourcePathsBytesSaved
      };
      return {
        ...state,
        isExporting,
        savedToHistory: {
          ...state.savedToHistory,
          [action.id]: updatedBundle
        }
      };
    }
    case bundleResourceManagerConstants.SAVETOFAILURE:
      return {
        error: action.error
      };
    default:
      return state;
  }
}
export default bundlesSaveTo;
