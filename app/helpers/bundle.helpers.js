export const bundleHelpers = {
  getResourcesDetails,
  getAddedBundle
};
export default bundleHelpers;

export function getResourcesDetails(getState, id) {
  const bundle = getAddedBundle(getState, id);
  const { metadata } = bundle.raw;
  return metadata.manifest;
}

export function getAddedBundle(getState, bundleId) {
  const { bundles } = getState();
  const { addedByBundleIds = {} } = bundles;
  const addedBundles = addedByBundleIds[bundleId];
  return addedBundles;
}
