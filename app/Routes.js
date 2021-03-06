import React from 'react';
import { Switch, Route, Redirect } from 'react-router';
import App from './containers/App';
import BundlesPage from './containers/BundlesPage';
import LoginForm from './components/LoginForm';
import EditMetadataDialog from './components/EditEntryMetadataDialog';
import ManageBundleManifestResourcesDialog from './components/ManageBundleManifestResourcesDialog';
import { PrivateRoute } from './components/PrivateRoute';
import { navigationConstants } from './constants/navigation.constants';
import WorkspacesPage from './containers/WorkspacesPage';
import EntryReports from './components/EntryReports';
import EntryUploadForm from './components/EntryUploadForm';
import SubmitHelpTicket from './components/SubmitHelpTicket';


export default () => (
  <App>
    <Switch>
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
      <Route
        exact
        path={navigationConstants.NAVIGATION_SUBMIT_HELP_TICKET}
        component={SubmitHelpTicket}
      />
      <PrivateRoute
        exact
        path={navigationConstants.NAVIGATION_BUNDLES}
        component={BundlesPage}
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
      <PrivateRoute
        exact
        path={navigationConstants.NAVIGATION_ENTRY_UPLOAD_FORM}
        component={EntryUploadForm}
      />
    </Switch>
  </App>
);

/*
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
