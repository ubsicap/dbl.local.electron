import { bundleFilterConstants } from '../constants/bundleFilter.constants';

function areArraysEqual(a1, a2) {
  return JSON.stringify(a1 || []) === JSON.stringify(a2 || []);
}

const initialSearchResults = {
  bundlesMatching: {},
  chunks: {},
  matches: {}
};

export function bundlesFilter(state = { isSearchActive: false }, action) {
  switch (action.type) {
    case bundleFilterConstants.UPDATE_SEARCH_INPUT: {
      const hasKeywordsChanged = !areArraysEqual(state.searchKeywords, action.searchKeywords);
      const searchKeywords = hasKeywordsChanged ? action.searchKeywords : state.searchKeywords;
      const isLoading = action.willRecomputeAllSearchResults;
      const searchResults = isLoading ? initialSearchResults : state.searchResults;
      const { bundles } = isLoading ? action : state;
      return {
        isSearchActive: true,
        isLoading,
        searchInput: action.searchInput,
        searchInputRaw: action.searchInputRaw,
        searchKeywords,
        bundles,
        searchResults
      };
    } case bundleFilterConstants.UPDATE_SEARCH_RESULTS: {
      return {
        ...state,
        isLoading: false,
        searchResults: { ...action.searchResults }
      };
    } case bundleFilterConstants.ADD_SEARCH_MATCH: {
      const oldBundlesMatching = state.searchResults.bundlesMatching;
      const oldChunks = state.searchResults.chunks;
      const oldMatches = state.searchResults.matches;
      const key = action.bundle.id;
      const newMatchingBundle = { [key]: action.bundle };
      const newChunks = action.chunks;
      const newMatches = action.matches;
      return {
        ...state,
        searchResults: {
          bundlesMatching: { ...oldBundlesMatching, ...newMatchingBundle },
          chunks: { ...oldChunks, ...newChunks },
          matches: { ...oldMatches, ...newMatches }
        }
      };
    } case bundleFilterConstants.REMOVE_SEARCH_MATCH: {
      const oldBundlesMatching = state.searchResults.bundlesMatching;
      const keyToRemove = action.bundle.id;
      const { [keyToRemove]: bundleRemoved, ...reducedBundlesMatching } = oldBundlesMatching;
      if (bundleRemoved === undefined) {
        return state;
      }
      return {
        ...state,
        searchResults: {
          ...state.searchResults,
          bundlesMatching: reducedBundlesMatching
        }
      };
    } case bundleFilterConstants.CLEAR_SEARCH_RESULTS:
      return {
        isSearchActive: false,
        searchInput: '',
        searchInputRaw: '',
        searchKeywords: [],
        searchResults: {}
      };
    default:
      return state;
  }
}
export default bundlesFilter;
