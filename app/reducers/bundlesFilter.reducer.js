import { bundleFilterConstants } from '../constants/bundleFilter.constants';

export function bundlesFilter(state = { isSearchActive: false }, action) {
  switch (action.type) {
    case bundleFilterConstants.UPDATE_SEARCH_INPUT: {
      const bundles = { ...action.bundles };
      return {
        isSearchActive: true,
        searchInput: action.searchInput,
        searchKeywords: action.searchKeywords,
        bundles,
        searchResults: {
          chunks: {},
          foundChunks: {},
          bundlesMatching: {},
        }
      };
    } case bundleFilterConstants.UPDATE_SEARCH_RESULTS: {
      return {
        ...state,
        searchResults: { ...action.searchResults }
      };
    } case bundleFilterConstants.CLEAR_SEARCH_RESULTS:
      return {
        isSearchActive: false,
        searchInput: '',
        searchKeywords: [],
        searchResults: {}
      };
    default:
      return state;
  }
}
export default bundlesFilter;
