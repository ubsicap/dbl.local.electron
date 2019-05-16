export const bundleHelpers = {
  getResourcePaths,
  getResourcesDetails,
  getAddedBundle,
  getRawBundleResourcesDetails
};
export default bundleHelpers;

export function getStoredResourcePaths(getState, id) {
  const bundle = getAddedBundle(getState, id);
  return Object.keys(bundle.storedFiles);
}

export function getResourcePaths(getState, id) {
  return Object.keys(getResourcesDetails(getState, id)) || [];
}

export function getResourcesDetails(getState, id) {
  const bundle = getAddedBundle(getState, id);
  return getRawBundleResourcesDetails(bundle.raw);
}

export function getAddedBundle(getState, bundleId) {
  const { bundles } = getState();
  const { addedByBundleIds = {} } = bundles;
  const addedBundles = addedByBundleIds[bundleId];
  return addedBundles;
}

// TODO: make a separate helper for raw bundles than for getState?
export function getRawBundleResourcesDetails(rawBundle) {
  const { metadata } = rawBundle;
  return metadata.manifest;
}
