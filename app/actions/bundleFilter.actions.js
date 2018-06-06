import split from 'split-string';
import { findChunks } from 'highlight-words-core';
import { bundleFilterConstants } from '../constants/bundleFilter.constants';

export const bundleFilterActions = {
  updateSearchInput,
  clearSearch
};

export default bundleFilterActions;

export function updateSearchInput(searchInput) {
  return (dispatch, getState) => {
    const trimmedSearchInput = searchInput.trim();
    const searchKeywords = split(searchInput, { separator: ' ' });
    const { bundles } = getState();
    if (trimmedSearchInput.length > 0) {
      dispatch({
        type: bundleFilterConstants.UPDATE_SEARCH_INPUT,
        searchInput: trimmedSearchInput,
        searchKeywords,
        bundles
      });
      const searchResults = getAllSearchResults(bundles.items, searchKeywords);
      dispatch(updateSearchResults(searchResults));
    } else {
      dispatch(clearSearch());
    }
  };

  /*
  findChunks({
    autoEscape,
    caseSensitive,
    sanitize,
    searchWords,
    textToHighlight})
  */
  function getAllSearchResults(searchableBundles, searchKeywords) {
    const searchResults = Object.values(searchableBundles).reduce((acc, searchableBundle) => {
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
  /*
  if (Object.keys(matchesInBundle).length > 0) {
    dispatch(addSearchMatch(searchableBundle, chunksInBundle, matchesInBundle));
  } else {
    dispatch(removeSearchMatch(searchableBundle));
  }
  */
}

export function addSearchMatch(bundle, chunks, matches) {
  return {
    type: bundleFilterConstants.ADD_SEARCH_MATCH, bundle, chunks, matches
  };
}

export function removeSearchMatch(bundle) {
  return {
    type: bundleFilterConstants.REMOVE_SEARCH_MATCH, bundle
  };
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


export function updateSearchResults(searchResults) {
  return {
    type: bundleFilterConstants.UPDATE_SEARCH_RESULTS, searchResults
  };
}

export function clearSearch() {
  return { type: bundleFilterConstants.CLEAR_SEARCH_RESULTS };
}
