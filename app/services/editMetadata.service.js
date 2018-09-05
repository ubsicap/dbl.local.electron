const editMetadataService = {
  getHasFormFieldsChanged,
  getValue,
  getFormFieldValues,
  getKeyField,
  getIsRequired,
  getFormInputsWithOverrides
};

export default editMetadataService;

function getHasFormFieldsChanged(fields, activeFormEdits) {
  if (Object.keys(activeFormEdits).length === 0) {
    return false;
  }
  const editableFields = fields.filter(field => field.name);
  const allFieldValues = editableFields.reduce((acc, field) =>
    ({ ...acc, [field.name]: getValue(field, activeFormEdits) }), {});
  const originalFieldValues = editableFields.reduce((acc, field) =>
    ({ ...acc, [field.name]: `${field.default}` }), {});
  const reallyChangedFields = Object.keys(allFieldValues)
    .filter(fieldKey => allFieldValues[fieldKey] !== originalFieldValues[fieldKey]);
  return reallyChangedFields.length !== 0;
}

function getValue(field, activeFormEdits) {
  const { [field.name]: stateValue } = activeFormEdits;
  if (stateValue === undefined || stateValue === null) {
    return `${field.default}`;
  }
  return stateValue;
}

function getIsRequired(field) {
  return field.nValues !== '?' || field.type === 'key';
}

function getFormFieldValues(bundleId, formKey, fields, activeFormEdits) {
  // get the values for all required fields and all non-empty values optional fields.
  const keyField = getKeyField(fields);
  const fieldValues = fields.filter(field => field.name && field !== keyField)
    .reduce((acc, field) => {
      const value = getValue(field, activeFormEdits);
      const isRequired = getIsRequired(field);
      if (isRequired || value.length > 0) {
        const { type } = field;
        return { ...acc, [field.name]: { type, value } };
      }
      return acc;
    }, {});
  return fieldValues;
}

function getKeyField(fields) {
  const [keyField] = fields.filter(field => field.type === 'key');
  return keyField;
}


function getFormInputsWithOverrides(formKey, inputs, metadataOverrides) {
  const { [formKey]: formOverrides } = metadataOverrides || {};
  if (!formOverrides) {
    return inputs;
  }
  const overriddenFields = inputs.fields.map((field) => {
    const inputOverrides = formOverrides[field.name];
    if (!inputOverrides) {
      return field;
    }
    const overridenField = { ...field, ...inputOverrides, isOverridden: true };
    return overridenField;
  });
  return { ...inputs, fields: overriddenFields };
}
