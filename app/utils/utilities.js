export const utilities = {
  areEqualArrays,
  areEqualArraysDeep,
};
export default utilities;

/* from https://stackoverflow.com/a/19746771 */
export function areEqualArrays(a1, a2) {
  return a1 === a2 || (a1.length === a2.length && a1.every((v, i) => v === a2[i]));
}

export function areEqualArraysDeep(a1, a2) {
  return a1 === a2 || (a1.length === a2.length && JSON.stringify(a1) === JSON.stringify(a2));
}
