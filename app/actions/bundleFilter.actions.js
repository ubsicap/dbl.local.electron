import split from 'split-string';
import { findChunks } from 'highlight-words-core';
import { bundleFilterConstants } from '../constants/bundleFilter.constants';

export const bundleFilterActions = {
  updateSearchInput,
  updateSearchResultsForBundle,
  updateSearchResultsForBundleId,
  clearSearch
};

export default bundleFilterActions;

const canceledState = { isCanceled: true };

export function updateSearchInput(searchInput) {
  return (dispatch, getState) => {
    const trimmedSearchInput = searchInput.trim();
    const searchKeywords = split(trimmedSearchInput, { separator: ' ' });
    const { bundles, bundlesFilter } = getState();
    if (trimmedSearchInput.length > 0 && !bundles.loading) {
      const willRecomputeAllSearchResults = trimmedSearchInput !== bundlesFilter.searchInput;
      dispatch({
        type: bundleFilterConstants.UPDATE_SEARCH_INPUT,
        searchInput: trimmedSearchInput,
        searchInputRaw: searchInput,
        searchKeywords,
        willRecomputeAllSearchResults,
        bundles
      });
      if (!willRecomputeAllSearchResults) {
        return; // don't try to find new results yet
      }
      const searchResults = getAllSearchResults(bundles.items, searchKeywords, getState);
      if (searchResults === canceledState) {
        return; // cancel these results
      }
      dispatch(updateSearchResults(searchResults));
    } else {
      dispatch(clearSearch());
    }

    function updateSearchResults(searchResults) {
      return {
        type: bundleFilterConstants.UPDATE_SEARCH_RESULTS, searchResults
      };
    }
  };

  function shouldCancelResults(getState, searchKeywords) {
    const { bundlesFilter } = getState();
    const { isSearchActive, searchKeywords: oldSearchKeywords } = bundlesFilter;
    return !isSearchActive || oldSearchKeywords !== searchKeywords;
  }

  function getAllSearchResults(searchableBundles, searchKeywords, getState) {
    const searchResults = Object.values(searchableBundles).reduce((acc, searchableBundle) => {
      if (shouldCancelResults(getState, searchKeywords)) {
        return canceledState; // cancel results
      }
      const bundleSearchResults = getBundleSearchResults(
        searchableBundle,
        searchKeywords,
        acc.chunks
      );
      const { chunks, matches } = bundleSearchResults;
      if (Object.keys(matches).length > 0) {
        return combineSearchResults(acc, searchableBundle, chunks, matches);
      }
      return acc;
    }, { bundlesMatching: {}, chunks: {}, matches: {} });
    return searchResults;
  }
}

export function updateSearchResultsForBundleId(bundleId) {
  return (dispatch, getState) => {
    const { bundles } = getState();
    const searchableBundle = bundles.items.find(bundle => bundle.id === bundleId);
    dispatch(updateSearchResultsForBundle(searchableBundle));
  };
}

export function updateSearchResultsForBundle(searchableBundle) {
  return (dispatch, getState) => {
    const { bundlesFilter } = getState();
    const { isSearchActive, searchKeywords } = bundlesFilter;
    if (!isSearchActive) {
      return;
    }
    const bundleSearchResults = getBundleSearchResults(searchableBundle, searchKeywords, {});
    const { chunks, matches } = bundleSearchResults;
    if (Object.keys(matches).length > 0) {
      dispatch(addSearchMatch(searchableBundle, chunks, matches));
    } else {
      dispatch(removeSearchMatch(searchableBundle));
    }
  };

  function addSearchMatch(bundle, chunks, matches) {
    return {
      type: bundleFilterConstants.ADD_SEARCH_MATCH, bundle, chunks, matches
    };
  }

  function removeSearchMatch(bundle) {
    return {
      type: bundleFilterConstants.REMOVE_SEARCH_MATCH, bundle
    };
  }
}
/*
findChunks({
  autoEscape,
  caseSensitive,
  sanitize,
  searchWords,
  textToHighlight})
*/
function getBundleSearchResults(searchableBundle, searchKeywords, chunksAcrossBundles) {
  const bundleSearchResults = Object.values(searchableBundle.displayAs).reduce((acc, searchable) => {
    let chunksForSearchable = chunksAcrossBundles[searchable];
    if (!chunksForSearchable) {
      chunksForSearchable = findChunks({
        searchWords: searchKeywords,
        textToHighlight: searchable
      });
    }
    const chunksInBundle = { [searchable]: chunksForSearchable };
    const hasMatches = chunksForSearchable.length > 0;
    const matches = hasMatches ? { ...acc.matches, ...chunksInBundle } : acc.matches;
    return {
      chunks: { ...acc.chunks, ...chunksInBundle },
      matches
    };
  }, {
    chunks: {},
    matches: {}
  });
  return bundleSearchResults;
}

function combineSearchResults(searchResults, bundle, chunks, matches) {
  const oldBundlesMatching = searchResults.bundlesMatching;
  const oldChunks = searchResults.chunks;
  const oldMatches = searchResults.matches;
  const key = bundle.id;
  const newMatchingBundle = { [key]: bundle };
  const newChunks = chunks;
  const newMatches = matches;
  return {
    bundlesMatching: { ...oldBundlesMatching, ...newMatchingBundle },
    chunks: { ...oldChunks, ...newChunks },
    matches: { ...oldMatches, ...newMatches }
  };
}

export function clearSearch() {
  return { type: bundleFilterConstants.CLEAR_SEARCH_RESULTS };
}
