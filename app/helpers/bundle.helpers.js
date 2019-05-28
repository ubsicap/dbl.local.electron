export const bundleHelpers = {
  getStoredResourcePaths,
  getManifestResourcePaths,
  getAddedBundle
};
export default bundleHelpers;

export function getStoredResourcePaths(getState, id) {
  const bundle = getAddedBundle(getState, id);
  return [...bundle.storedResourcePaths]; // clone to avoid corruption
}

export function getManifestResourcePaths(getState, id) {
  const bundle = getAddedBundle(getState, id);
  return [...bundle.manifestResourcePaths]; // clone to avoid corruption
}

export function getAddedBundle(getState, bundleId) {
  const { bundles } = getState();
  const { addedByBundleIds = {} } = bundles;
  const addedBundles = addedByBundleIds[bundleId];
  return addedBundles;
}
