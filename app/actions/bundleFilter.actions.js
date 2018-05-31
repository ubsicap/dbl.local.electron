import split from 'split-string';
import { findChunks } from 'highlight-words-core';
import { bundleFilterConstants } from '../constants/bundleFilter.constants';

export const bundleFilterActions = {
  updateSearchInput,
  addSearchResults,
  clearSearch
};

export default bundleFilterActions;

export function updateSearchInput(searchInput, bundles) {
  return dispatch => {
    const trimmedSearchInput = searchInput.trim();
    const searchKeywords = split(searchInput, { separator: ' ' });
    if (trimmedSearchInput.length > 0) {
      dispatch({
        type: bundleFilterConstants.UPDATE_SEARCH_INPUT,
        searchInput: trimmedSearchInput,
        searchKeywords,
        bundles
      });
      updateAllSearchMatches(dispatch, bundles.items, searchKeywords);
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
  function updateAllSearchMatches(dispatch, searchableBundles, searchKeywords) {
    let searchResults = {
      chunks: {},
      foundChunks: {},
      bundlesMatching: {},
    };
    const chunksAcrossBundles = {};
    searchableBundles.forEach((searchableBundle) => {
      const chunksInBundle = {};
      const matchesInBundle = {};
      Object.values(searchableBundle.displayAs).forEach((searchable) => {
        let chunksForSearchable = chunksAcrossBundles[searchable];
        if (!chunksForSearchable) {
          chunksForSearchable = findChunks({
            searchWords: searchKeywords,
            textToHighlight: searchable
          });
          chunksAcrossBundles[searchable] = chunksForSearchable;
        }
        chunksInBundle[searchable] = chunksForSearchable;
        if (chunksForSearchable.length > 0) {
          matchesInBundle[searchable] = chunksForSearchable;
        }
      });
      if (Object.keys(matchesInBundle).length > 0) {
        searchResults = addSearchResults(searchResults, searchableBundle, chunksInBundle, matchesInBundle);
      }
    });
    dispatch(updateSearchResults(searchResults));
  }
}

function addSearchResults(searchResults, bundle, chunks, matches) {
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
