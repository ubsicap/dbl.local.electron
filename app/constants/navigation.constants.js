export const navigationConstants = {
  NAVIGATION_WORKSPACES: '/workspaces',
  NAVIGATION_WORKSPACE_LOGIN: '/workspaces/:workspaceName/login',
  NAVIGATION_SUBMIT_HELP_TICKET: '/workspaces/helpTicket',
  NAVIGATION_UNKNOWN_WORKSPACE_LOGIN: '/unknown/workspace/login',
  NAVIGATION_BUNDLES: '/bundles',
  NAVIGATION_BUNDLE_EDIT_METADATA: '/bundles/:bundleId/edit-metadata',
  NAVIGATION_BUNDLE_EDIT_METADATA_SECTION:
    '/bundles/:bundleId/edit-metadata/:section',
  NAVIGATION_BUNDLE_EDIT_METADATA_FORMKEY:
    '/bundles/:bundleId/edit-metadata:formKey',
  NAVIGATION_BUNDLE_MANAGE_RESOURCES:
    '/bundles/:bundleId/manage-resources/:mode',
  NAVIGATION_ENTRY_REPORTS: '/entries/:bundleId/reports',
  NAVIGATION_ENTRY_UPLOAD_FORM: '/entries/:bundleId/uploadForm'
};

export default navigationConstants;
