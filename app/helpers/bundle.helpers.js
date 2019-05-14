export const bundleHelpers = {
  getResourcesDetails,
  getAddedBundle,
  getRawBundleResourcesDetails
};
export default bundleHelpers;

export function getResourcesDetails(getState, id) {
  const bundle = getAddedBundle(getState, id);
  return getRawBundleResourcesDetails(bundle.raw);
}

// TODO: make a separate helper for raw bundles than for getState?
export function getRawBundleResourcesDetails(rawBundle) {
  const { metadata } = rawBundle;
  return metadata.manifest;
}

export function getAddedBundle(getState, bundleId) {
  const { bundles } = getState();
  const { addedByBundleIds = {} } = bundles;
  const addedBundles = addedByBundleIds[bundleId];
  return addedBundles;
}
