import sort from 'fast-sort';
import upath from 'upath';
import path from 'path';
import immutableJs from 'immutable';

const { shell } = require('electron');

export const utilities = {
  areEqualArrays,
  areEqualArraysDeep,
  areEqualObjectsDeep,
  areEqualCollections,
  getUnionOfValues,
  haveEqualKeys,
  haveEqualKeysLength,
  onOpenLink,
  normalizeLinkPath,
  convertUrlToLocalPath,
  sleep,
  union,
  intersect,
  subtract,
  buildRouteUrl,
  calculatePercentage,
  formatBytesByKbs,
  formatContainer,
  getOrDefault,
  getFilePathResourceData,
  formatUri,
  distinct
};
export default utilities;

export function union(arrayA, arrayB = []) {
  const u = immutableJs.Set(arrayA);
  return u.union(arrayB).toArray();
}

export function intersect(arrayA, arrayB = []) {
  const u = immutableJs.Set(arrayA);
  return u.intersect(arrayB).toArray();
}

export function subtract(arrayA, arrayB = []) {
  const diff = immutableJs.Set(arrayA);
  return diff.subtract(arrayB).toArray();
}

export function distinct(array, key) {
  if (!key) {
    return [...new Set(array)];
  }
  const { filtered } = array.reduce(
    (acc, item) => {
      const keyValue = item[key];
      if (acc.visited.has(keyValue)) {
        return acc;
      }
      acc.visited.add(keyValue);
      acc.filtered.push(item);
      return acc;
    },
    { visited: new Set(), filtered: [] }
  );
  return filtered;
}

/* from https://stackoverflow.com/a/19746771 */
export function areEqualArrays(a1, a2, funcSort) {
  if (a1 === a2) {
    return true;
  }
  if (a1.length !== a2.length) {
    return false;
  }
  const [c1, c2] = funcSort ? [funcSort(a1), funcSort(a2)] : [a1, a2];
  return c1.every((v, i) => v === c2[i]);
}

export function areEqualArraysDeep(a1, a2) {
  return (
    a1 === a2 ||
    (a1.length === a2.length && JSON.stringify(a1) === JSON.stringify(a2))
  );
}

export function haveEqualKeysLength(o1, o2) {
  return Object.keys(o1).length === Object.keys(o2).length;
}

function haveEqualKeys(o1, o2) {
  return areEqualArraysDeep(Object.keys(o1), Object.keys(o2));
}

export function areEqualObjectsDeep(o1, o2) {
  return (
    o1 === o2 ||
    (haveEqualKeys(o1, o2) &&
      areEqualArraysDeep(Object.values(o1), Object.values(o2)))
  );
}

export function areEqualCollections(c1, c2) {
  return areEqualArrays(c1, c2, c => sort(c).asc());
}

function getUnionOfValues(obj) {
  return Object.values(obj).reduce(
    (acc, values) => acc.union(values),
    immutableJs.Set()
  );
}

function onOpenLink(url) {
  return event => {
    event.preventDefault();
    event.stopPropagation();
    shell.openExternal(url);
  };
}

function normalizeLinkPath(filepath) {
  const normalized = upath.normalize(filepath.replace('file://', ''));
  const u = new URL(`file://${normalized}`);
  const urlPath = u.href.replace('file://', '');
  const osUrlPath = process.platform === 'win32' ? urlPath.substr(1) : urlPath;
  return osUrlPath.replace(/\(/g, '%28').replace(/\)/g, '%29');
}

function convertUrlToLocalPath(url) {
  const decodedUrl = decodeURIComponent(normalizeLinkPath(url));
  const osPath =
    process.platform === 'win32'
      ? path.win32.normalize(decodedUrl)
      : path.posix.normalize(decodedUrl);
  return osPath;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function buildRouteUrl(routeUrl, params) {
  const url = Object.entries(params).reduce(
    (acc, [key, value]) => acc.replace(`:${key}`, value),
    routeUrl
  );
  return url;
}

function calculatePercentage(completed, total) {
  return parseFloat(((completed / total) * 100).toFixed(2));
}

function formatBytesByKbs(bytes) {
  return Math.round(Number(bytes) / 1024).toLocaleString();
}

function formatContainer(containerInput) {
  const trimmed = containerInput.trim();
  if (trimmed === '' || trimmed === '/' || trimmed === '.') {
    return '/';
  }
  const prefix = containerInput[0] !== '/' ? '/' : '';
  const postfix = containerInput.slice(-1) !== '/' ? '/' : '';
  return `${prefix}${containerInput}${postfix}`;
}

function getOrDefault(obj, prop, defaultValue) {
  if (!obj) {
    return defaultValue;
  }
  return obj[prop] || defaultValue;
}

function getFilePathResourceData(
  filePath,
  fullToRelativePaths,
  editedContainers = {}
) {
  const fileName = path.basename(filePath);
  const editedContainer = utilities.getOrDefault(
    editedContainers,
    filePath,
    null
  );
  const relativePath = upath.normalizeTrim(
    utilities.getOrDefault(fullToRelativePaths, filePath, '')
  );
  const relativeFolder = formatContainer(path.dirname(relativePath));
  const container = editedContainer || relativeFolder;
  const uri = utilities.formatUri(container, fileName);
  return {
    fileName,
    relativeFolder,
    container,
    uri
  };
}

function formatUri(container, name) {
  return `${container.substr(1)}${name}`;
}
