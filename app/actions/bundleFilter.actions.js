import split from 'split-string';
import { findChunks } from 'highlight-words-core';
import waitUntil from 'node-wait-until';
import { Set } from 'immutable';
import { bundleFilterConstants } from '../constants/bundleFilter.constants';
import { workspaceUserSettingsStoreServices } from '../services/workspaces.service';
import { workspaceHelpers } from '../helpers/workspaces.helpers';

export const bundleFilterActions = {
  updateSearchInput,
  updateSearchResultsForBundleId,
  clearSearch,
  toggleEntryStar,
  setStarredEntries,
  toggleShowStarredEntries,
  saveFilters,
  setEntriesFilters,
  loadSearchInput,
  loadStarredEntries,
  loadEntriesFilters
};

export default bundleFilterActions;

const canceledState = { isCanceled: true };

function getAreBundlesLoading(getState) {
  const { bundles } = getState();
  if (bundles === undefined || bundles.loading === undefined) {
    return true;
  }
  const areLoading = bundles.loading;
  return areLoading;
}

export function updateSearchInput(searchInput) {
  return async (dispatch, getState) => {
    const trimmedSearchInput = searchInput.trim();
    const searchKeywords = split(trimmedSearchInput, { separator: ' ' });
    await waitUntil(async () => !getAreBundlesLoading(getState));
    const {
      workspaceFullPath,
      email
    } = workspaceHelpers.getCurrentWorkspaceFullPath(getState());
    workspaceUserSettingsStoreServices.saveBundlesSearchInput(
      workspaceFullPath,
      email,
      searchInput
    );
    const { bundles, bundlesFilter } = getState();
    if (trimmedSearchInput.length > 0) {
      const willRecomputeAllSearchResults =
        trimmedSearchInput !== bundlesFilter.searchInput;
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
      const searchResults = getAllSearchResults(bundles.items, searchKeywords);
      if (searchResults === canceledState) {
        return; // cancel these results
      }
      dispatch(updateSearchResults(searchResults));
    } else if (trimmedSearchInput !== (bundlesFilter.searchInput || '')) {
      dispatch(clearSearch());
    }

    function updateSearchResults(searchResults) {
      return {
        type: bundleFilterConstants.UPDATE_SEARCH_RESULTS,
        searchResults
      };
    }
  };
}

function getAllSearchResults(searchableBundles, searchKeywords) {
  const searchResults = Object.values(searchableBundles).reduce(
    (acc, searchableBundle) => {
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
    },
    { bundlesMatching: {}, chunks: {}, matches: {} }
  );
  return searchResults;
}

export function updateSearchResultsForBundleId(bundleId) {
  return (dispatch, getState) => {
    const { bundlesFilter } = getState();
    const { isSearchActive } = bundlesFilter;
    if (!isSearchActive) {
      return;
    }
    const { bundles } = getState();
    const { addedByBundleIds } = bundles;
    const searchableBundle = addedByBundleIds[bundleId];
    if (!searchableBundle) {
      return;
    }
    dispatch(updateSearchResultsForBundle(searchableBundle));
  };
}

function updateSearchResultsForBundle(searchableBundle) {
  return {
    type: 'OBSOLETE_NOOP',
    function: 'updateSearchResultsForBundle',
    searchableBundle
  };
  /*
  return (dispatch, getState) => {
    const { bundlesFilter } = getState();
    const { isSearchActive, searchKeywords } = bundlesFilter;
    if (!isSearchActive) {
      return;
    }
    const bundleSearchResults = getBundleSearchResults(
      searchableBundle,
      searchKeywords,
      {}
    );
    const { chunks, matches } = bundleSearchResults;
    if (Object.keys(matches).length > 0) {
      dispatch(addSearchMatch(searchableBundle, chunks, matches));
    } else {
      dispatch(removeSearchMatch(searchableBundle));
    }
  };

  function addSearchMatch(bundle, chunks, matches) {
    return {
      type: bundleFilterConstants.ADD_SEARCH_MATCH,
      bundle,
      chunks,
      matches
    };
  }

  function removeSearchMatch(bundle) {
    return {
      type: bundleFilterConstants.REMOVE_SEARCH_MATCH,
      bundle
    };
  }
  */
}
/*
findChunks({
  autoEscape,
  caseSensitive,
  sanitize,
  searchWords,
  textToHighlight})
*/
function getBundleSearchResults(
  searchableBundle,
  searchKeywords,
  chunksAcrossBundles
) {
  const bundleSearchResults = Object.values(searchableBundle.displayAs).reduce(
    (acc, searchable) => {
      let chunksForSearchable = chunksAcrossBundles[searchable];
      if (!chunksForSearchable) {
        const findChunkOptions = {
          autoEscape: true,
          searchWords: searchKeywords,
          textToHighlight: searchable
        };
        chunksForSearchable = findChunks(findChunkOptions);
      }
      const chunksInBundle = { [searchable]: chunksForSearchable };
      const hasMatches = chunksForSearchable.length > 0;
      const matches = hasMatches
        ? { ...acc.matches, ...chunksInBundle }
        : acc.matches;
      return {
        chunks: { ...acc.chunks, ...chunksInBundle },
        matches
      };
    },
    {
      chunks: {},
      matches: {}
    }
  );
  return bundleSearchResults;
}

function combineSearchResults(searchResults, bundle, chunks, matches) {
  const oldBundlesMatching = searchResults.bundlesMatching;
  const oldChunks = searchResults.chunks;
  const oldMatches = searchResults.matches;
  const key = bundle.id;
  const newMatches = matches;
  const newMatchingBundle = { [key]: newMatches };
  const newChunks = chunks;
  return {
    bundlesMatching: { ...oldBundlesMatching, ...newMatchingBundle },
    chunks: { ...oldChunks, ...newChunks },
    matches: { ...oldMatches, ...newMatches }
  };
}

export function clearSearch() {
  return { type: bundleFilterConstants.CLEAR_SEARCH_RESULTS };
}

export function toggleEntryStar(dblId) {
  return (dispatch, getState) => {
    const { bundlesFilter } = getState();
    const { starredEntries } = workspaceHelpers.getToggledStarredEntries(
      bundlesFilter,
      dblId
    );
    const { showStarredEntries = false } = bundlesFilter;
    workspaceHelpers.persistStarredEntries(
      getState(),
      starredEntries,
      showStarredEntries
    );
    dispatch(setStarredEntries(starredEntries));
  };
}

export function setStarredEntries(starredEntries) {
  return {
    type: bundleFilterConstants.SET_STARRED_ENTRIES,
    starredEntries
  };
}

// TODO: Obsoleted
export function toggleShowStarredEntries() {
  return (dispatch, getState) => {
    const showStarredEntries = !getState().bundlesFilter.showStarredEntries;
    const entriesFilters = {
      showStarredEntries
    };
    const {
      workspaceFullPath,
      email
    } = workspaceHelpers.getCurrentWorkspaceFullPath(getState());
    /* enabled filters can be 'include' or 'exclude' or 'disabled' */
    workspaceUserSettingsStoreServices.saveEntriesFilters(
      workspaceFullPath,
      email,
      entriesFilters
    );
    dispatch(setEntriesFilters(entriesFilters));
  };
}

export function saveFilters(columns) {
  const entriesFilters = { columns };
  const thunk = (dispatch, getState) => {
    const {
      workspaceFullPath,
      email
    } = workspaceHelpers.getCurrentWorkspaceFullPath(getState());
    workspaceUserSettingsStoreServices.saveEntriesFilters(
      workspaceFullPath,
      email,
      entriesFilters
    );
    dispatch({
      type: bundleFilterConstants.SAVE_ENTRIES_FILTERS_TO_DISK,
      entriesFilters
    });
    // For some reason, changing entriesFilters here results in putting MuiDatatables in a weird state.
    dispatch(setEntriesFilters(entriesFilters));
  };
  thunk.meta = {
    debounce: {
      time: 2500,
      key: 'BUNDLE_FILTER_SAVE_FILTERS_DEBOUNCED'
    }
  };
  return thunk;
}

export function setEntriesFilters(entriesFilters) {
  return {
    type: bundleFilterConstants.SET_ENTRIES_FILTERS,
    entriesFilters
  };
}

export function loadStarredEntries() {
  return (dispatch, getState) => {
    const currentState = getState();
    const {
      workspaceFullPath,
      email
    } = workspaceHelpers.getCurrentWorkspaceFullPath(currentState);
    const starredEntries = workspaceUserSettingsStoreServices.loadStarredEntries(
      workspaceFullPath,
      email
    );
    dispatch(setStarredEntries(Set(starredEntries)));
  };
}

export function loadEntriesFilters() {
  return (dispatch, getState) => {
    const currentState = getState();
    const {
      workspaceFullPath,
      email
    } = workspaceHelpers.getCurrentWorkspaceFullPath(currentState);
    const entriesFilters = workspaceUserSettingsStoreServices.loadEntriesFilters(
      workspaceFullPath,
      email
    );
    dispatch(setEntriesFilters(entriesFilters));
  };
}

export function loadSearchInput() {
  return (dispatch, getState) => {
    const currentState = getState();
    const {
      workspaceFullPath,
      email
    } = workspaceHelpers.getCurrentWorkspaceFullPath(currentState);
    const savedSearchInput = workspaceUserSettingsStoreServices.loadBundlesSearchInput(
      workspaceFullPath,
      email
    );
    const { bundles } = currentState;
    dispatch(updateSearchInputBasic(savedSearchInput, bundles));
  };
}

function updateSearchInputBasic(searchInput, bundles) {
  return {
    type: bundleFilterConstants.UPDATE_SEARCH_INPUT,
    searchInput,
    searchInputRaw: searchInput,
    searchKeywords: [searchInput],
    willRecomputeAllSearchResults: false,
    bundles
  };
}

export function saveSearchInput(searchInput) {
  const thunk = (dispatch, getState) => {
    const currentState = getState();
    const {
      workspaceFullPath,
      email
    } = workspaceHelpers.getCurrentWorkspaceFullPath(currentState);
    workspaceUserSettingsStoreServices.saveBundlesSearchInput(
      workspaceFullPath,
      email,
      searchInput
    );
    dispatch({
      type: bundleFilterConstants.SAVE_ENTRIES_SEARCH_INPUT_TO_DISK,
      searchInput
    });
    // const { bundles } = currentState;
    // dispatch(updateSearchInputBasic(searchInput, bundles));
  };
  thunk.meta = {
    debounce: {
      time: 2500,
      key: 'BUNDLE_FILTER_SAVE_SEARCH_INPUT_DEBOUNCED'
    }
  };
  return thunk;
}
