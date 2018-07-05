const editMetadataService = {
  getHasFormFieldsChanged,
  getValue
};

export default editMetadataService;

function getHasFormFieldsChanged(fields, activeFormEdits) {
  if (Object.keys(activeFormEdits).length === 0) {
    return false;
  }
  const allFieldValues = fields.filter(field => field.name).reduce((acc, field) =>
    ({ ...acc, [field.name]: getValue(field, activeFormEdits) }), {});
  const originalFieldValues = fields.filter(field => field.name).reduce((acc, field) =>
    ({ ...acc, [field.name]: field.default }), {});
  const reallyChangedFields = Object.keys(allFieldValues)
    .filter(fieldKey => allFieldValues[fieldKey] !== originalFieldValues[fieldKey]);
  return reallyChangedFields.length !== 0;
}

function getValue(field, activeFormEdits) {
  const { [field.name]: stateValue } = activeFormEdits;
  if (stateValue === undefined || stateValue === null) {
    return field.default;
  }
  return stateValue;
}
