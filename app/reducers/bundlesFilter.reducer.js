import { Set } from 'immutable';
import { bundleFilterConstants } from '../constants/bundleFilter.constants';
import { bundleConstants } from '../constants/bundle.constants';

function areArraysEqual(a1, a2) {
  return JSON.stringify(a1 || []) === JSON.stringify(a2 || []);
}

const initialSearchResults = {
  bundlesMatching: {},
  matches: {}
};

export function bundlesFilter(state =
  {
    isSearchActive: false,
    starredEntries: Set(),
  }, action) {
  switch (action.type) {
    case bundleFilterConstants.UPDATE_SEARCH_INPUT: {
      const hasKeywordsChanged = !areArraysEqual(state.searchKeywords, action.searchKeywords);
      const searchKeywords = hasKeywordsChanged ? action.searchKeywords : state.searchKeywords;
      const isLoading = action.willRecomputeAllSearchResults;
      const searchResults = isLoading ? initialSearchResults : state.searchResults;
      const { bundles } = isLoading ? action : state;
      return {
        ...state,
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
      const oldMatches = state.searchResults.matches;
      const key = action.bundle.id;
      const newMatchingBundle = { [key]: action.matches };
      const newMatches = action.matches;
      return {
        ...state,
        searchResults: {
          bundlesMatching: { ...oldBundlesMatching, ...newMatchingBundle },
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
    } case bundleFilterConstants.CLEAR_SEARCH_RESULTS: {
      return {
        ...state,
        isSearchActive: false,
        searchInput: '',
        searchInputRaw: '',
        searchKeywords: [],
        searchResults: {}
      };
    } case bundleFilterConstants.SET_STARRED_ENTRIES: {
      const { starredEntries } = action;
      return {
        ...state,
        starredEntries
      };
    } case bundleFilterConstants.SET_ENTRIES_FILTERS: {
      const { entriesFilters } = action;
      return {
        ...state,
        ...entriesFilters
      };
    } case bundleConstants.DELETE_SUCCESS: {
      const { deletedBundle, appStateSnapshot } = action;
      const { allBundles } = appStateSnapshot.bundles;
      const dblIdsInBundles = allBundles.map(item => item.dblId);
      const dblIdsObsolete = state.starredEntries.subtract(dblIdsInBundles);
      const hasMoreThanOneMatchingDblId =
        allBundles.some(b => b.dblId === deletedBundle.dblId && b.id !== deletedBundle.id);
      if (hasMoreThanOneMatchingDblId && dblIdsObsolete.length === 0) {
        return state;
      }
      const starredEntriesCleaned = state.starredEntries.subtract(dblIdsObsolete);
      const starredEntries = starredEntriesCleaned.delete(deletedBundle.dblId);
      return {
        ...state,
        starredEntries
      };
    } default: {
      return state;
    }
  }
}
export default bundlesFilter;
