export const clipboardHelpers = {
  getUnsupportedMetadataSections,
  getIsMetadataSectionCompatibleForPasting
};
export default clipboardHelpers;

function getUnsupportedMetadataSections() {
  return ['publications'];
}

function getIsMetadataSectionCompatibleForPasting(sourceMedium, targetMedium, sectionName) {
  if (sourceMedium === targetMedium) {
    return true;
  }
  return !['type', 'format'].includes(sectionName);
}
