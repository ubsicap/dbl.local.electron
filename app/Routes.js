import React from 'react';
import { Route, Redirect } from 'react-router';
import CacheRoute, { CacheSwitch } from 'react-router-cache-route';
import { PrivateRoute } from './components/PrivateRoute';
import App from './containers/App';
import BundlesPage from './containers/BundlesPage';
import LoginForm from './components/LoginForm';
import EditMetadataDialog from './components/EditEntryMetadataDialog';
import ManageBundleManifestResourcesDialog from './components/ManageBundleManifestResourcesDialog';
import { navigationConstants } from './constants/navigation.constants';
import WorkspacesPage from './containers/WorkspacesPage';
import EntryReports from './components/EntryReports';

export default () => (
  <App>
    <CacheSwitch>
      <Route
        exact
        path={navigationConstants.NAVIGATION_WORKSPACES}
        component={WorkspacesPage}
      />
      <Route
        exact
        path={navigationConstants.NAVIGATION_WORKSPACE_LOGIN}
        component={LoginForm}
      />
      <Route
        exact
        path={navigationConstants.NAVIGATION_UNKNOWN_WORKSPACE_LOGIN}
        component={LoginForm}
      />
      <Redirect exact from="/" to={navigationConstants.NAVIGATION_WORKSPACES} />
      <CacheRoute
        exact
        path={navigationConstants.NAVIGATION_BUNDLES}
        component={BundlesPage}
        when="always"
        behavior={isCached => {
          console.log(`cached ? ${isCached}`);
          return {};
        }}
      />
      <PrivateRoute
        exact
        path={navigationConstants.NAVIGATION_BUNDLE_EDIT_METADATA}
        component={EditMetadataDialog}
      />
      <PrivateRoute
        exact
        path={navigationConstants.NAVIGATION_BUNDLE_EDIT_METADATA_SECTION}
        component={EditMetadataDialog}
      />
      <PrivateRoute
        exact
        path={navigationConstants.NAVIGATION_BUNDLE_EDIT_METADATA_FORMKEY}
        component={EditMetadataDialog}
      />
      <PrivateRoute
        exact
        path={navigationConstants.NAVIGATION_BUNDLE_MANAGE_RESOURCES}
        component={ManageBundleManifestResourcesDialog}
      />
      <PrivateRoute
        exact
        path={navigationConstants.NAVIGATION_ENTRY_REPORTS}
        component={EntryReports}
      />
    </CacheSwitch>
  </App>
);

/* from electron-react-boilerplate
const renderMergedProps = (component, ...rest) => {
  const finalProps = Object.assign({}, ...rest);
  return React.createElement(component, finalProps);
};

const PropsRoute = ({ component, ...rest }) => (
  <Route
    {...rest}
    render={routeProps => renderMergedProps(component, routeProps, rest)}
  />
);
*/
