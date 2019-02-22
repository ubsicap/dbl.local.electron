export const navigationConstants = {
  NAVIGATION_WORKSPACES: '/workspaces',
  NAVIGATION_WORKSPACE_LOGIN: '/workspaces/:workspaceName/login',
  NAVIGATION_UNKNOWN_WORKSPACE_LOGIN: '/unknown/workspace/login',
  NAVIGATION_BUNDLES: '/bundles',
  NAVIGATION_BUNDLE_EDIT_METADATA: '/bundles/:bundleId/edit-metadata/doZoom/:doZoom',
  NAVIGATION_BUNDLE_EDIT_METADATA_SECTION: '/bundles/:bundleId/edit-metadata/:section',
  NAVIGATION_BUNDLE_EDIT_METADATA_FORMKEY: '/bundles/:bundleId/edit-metadata:formKey',
  NAVIGATION_BUNDLE_MANAGE_RESOURCES: '/bundles/:bundleId/manage-resources/:mode/doZoom/:doZoom',
};

export default navigationConstants;
