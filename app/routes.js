/* eslint flowtype-errors/show-errors: 0 */
import React from 'react';
import { Switch, Route, Redirect } from 'react-router';
import App from './containers/App';
import BundlesPage from './containers/BundlesPage';
import LoginForm from './components/LoginForm';
import EditMetadataDialog from './components/EditEntryMetadataDialog';
import ManageBundleManifestResourcesDialog from './components/ManageBundleManifestResourcesDialog';
import { PrivateRoute } from './components/PrivateRoute';
import { navigationConstants } from './constants/navigation.constants';

export default () => (
  <App>
    <Switch>
      <Route path={navigationConstants.NAVIGATION_LOGIN} component={LoginForm} />
      <Redirect exact from="/" to={navigationConstants.NAVIGATION_BUNDLES} />
      <PrivateRoute exact path={navigationConstants.NAVIGATION_BUNDLES} component={BundlesPage} />
      <PrivateRoute exact path={navigationConstants.NAVIGATION_BUNDLE_EDIT_METADATA} component={EditMetadataDialog} />
      <PrivateRoute exact path={navigationConstants.NAVIGATION_BUNDLE_EDIT_METADATA_SECTION} component={EditMetadataDialog} />
      <PrivateRoute exact path={navigationConstants.NAVIGATION_BUNDLE_MANAGE_RESOURCES} component={ManageBundleManifestResourcesDialog} />
      <Route exact path={navigationConstants.NAVIGATION_BUNDLE_EDIT_METADATA_DEMO} component={EditMetadataDialog} />
      <Route exact path={navigationConstants.NAVIGATION_BUNDLES_DEMO} component={BundlesPage} />
    </Switch>
  </App>
);

const renderMergedProps = (component, ...rest) => {
  const finalProps = Object.assign({}, ...rest);
  return (
    React.createElement(component, finalProps)
  );
};

const PropsRoute = ({ component, ...rest }) => (
  <Route
    {...rest}
    render={routeProps => renderMergedProps(component, routeProps, rest)}
  />
);
