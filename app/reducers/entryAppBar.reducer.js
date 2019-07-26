import { entryAppBarConstants } from '../constants/entryAppBar.constants';
import { bundleEditMetadataConstants } from '../constants/bundleEditMetadata.constants';

const initialState = {
  openDrawer: false
};

export function entryAppBar(state = initialState, action) {
  switch (action.type) {
    case entryAppBarConstants.RESET_ENTRY_APP_BAR:
    case entryAppBarConstants.OPEN_ENTRY:
    case entryAppBarConstants.CLOSE_ENTRY: {
      return initialState;
    }
    case bundleEditMetadataConstants.METADATA_FILE_CHECKSUM_COMPUTED: {
      const { metadataFile, metadataFileChecksum } = action;
      return {
        ...state,
        metadataFile,
        metadataFileChecksum
      };
    }
    case entryAppBarConstants.OPEN_ENTRY_DRAWER: {
      return {
        ...state,
        openDrawer: true
      };
    }
    case entryAppBarConstants.CLOSE_ENTRY_DRAWER: {
      return {
        ...state,
        openDrawer: false,
      };
    }
    default:
      return state;
  }
}

export default entryAppBar;

