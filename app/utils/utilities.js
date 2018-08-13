import sort from 'fast-sort';

const { shell } = require('electron');

export const utilities = {
  areEqualArrays,
  areEqualArraysDeep,
  areEqualCollections,
  onOpenLink,
  sleep
};
export default utilities;

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
