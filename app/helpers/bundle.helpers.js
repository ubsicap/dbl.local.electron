import immutableJs from 'immutable';
import { utilities } from '../utils/utilities';

export const bundleHelpers = {
  getStoredResourcePaths,
  getManifestResourcePaths,
  getAddedBundle,
  getApplicableMappersForResourcePath,
  buildFullUriWithOptionalMapper,
  getResourceUris,
  reduceAddedFilePaths
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

function buildFullUriWithOptionalMapper(uri, mapper) {
  return mapper ? `${uri}?mapper=${mapper}` : uri;
}

function getApplicableMappersForResourcePath(selectedMappers, resourcePath) {
  const applicableOutputMappers = Object.entries(selectedMappers)
    .filter(([, mapperUris]) => mapperUris.includes(resourcePath))
    .map(([mapperKey]) => mapperKey);
  return applicableOutputMappers;
}

function getResourceUris(resourcePaths, selectedMappers) {
  const resourceUris = resourcePaths.reduce((acc, resourcePath) => {
    const applicableOutputMappers = getApplicableMappersForResourcePath(
      selectedMappers,
      resourcePath
    );
    if (applicableOutputMappers.length === 0) {
      return acc.concat([resourcePath]);
    }
    const mappedUris = applicableOutputMappers.map(mapper =>
      buildFullUriWithOptionalMapper(resourcePath, mapper)
    );
    return acc.concat(mappedUris);
  }, []);
  return resourceUris;
}

function reduceAddedFilePaths(
  origAddedFilePaths,
  filePathsToRemove,
  fullToRelativePaths
) {
  const remainingAddedFilePaths = utilities.subtract(
    origAddedFilePaths,
    filePathsToRemove
  );
  const remainingAddedFilePathsSet = immutableJs.Set(remainingAddedFilePaths);
  const remainingFullToRelativePaths = Object.entries(fullToRelativePaths)
    .filter(([fullPath]) => remainingAddedFilePathsSet.has(fullPath))
    .reduce((acc, [fullPath, relativePath]) => {
      acc[fullPath] = relativePath;
      return acc;
    }, {});
  return { remainingAddedFilePaths, remainingFullToRelativePaths };
}
