import sort from 'fast-sort';

const { shell } = require('electron');

export const utilities = {
  areEqualArrays,
  areEqualArraysDeep,
  areEqualObjectsDeep,
  areEqualCollections,
  onOpenLink,
  sleep,
  union,
  difference,
  buildRouteUrl
};
export default utilities;

export function union(arrayA, arrayB = []) {
  const u = new Set(arrayA);
  arrayB.forEach(item => u.add(item));
  return [...u];
}

export function difference(arrayA, arrayB = []) {
  const diff = new Set(arrayA);
  arrayB.forEach(item => diff.delete(item));
  return diff;
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
  return a1 === a2 || (a1.length === a2.length && JSON.stringify(a1) === JSON.stringify(a2));
}

export function areEqualObjectsDeep(o1, o2) {
  return o1 === o2 ||
  (areEqualArraysDeep(Object.keys(o1), Object.keys(o2)) &&
   areEqualArraysDeep(Object.values(o1), Object.values(o2)));
}

export function areEqualCollections(c1, c2) {
  return areEqualArrays(c1, c2, (c) => sort(c).asc());
}

function onOpenLink(url) {
  return (event) => {
    event.preventDefault();
    event.stopPropagation();
    shell.openExternal(url);
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function buildRouteUrl(routeUrl, params) {
  const url = Object.entries(params).reduce(
    (acc, [key, value]) => (acc.replace(`:${key}`, value)),
    routeUrl
  );
  return url;
}
