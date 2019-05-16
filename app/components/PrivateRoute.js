import React from 'react';
import { Route, Redirect } from 'react-router-dom';
import CacheRoute from 'react-router-cache-route';
import { navigationConstants } from '../constants/navigation.constants';

type InnerProps = {
  location: {}
};

function renderComponent(Component) {
  return {
    render: (props: InnerProps) => {
      if (localStorage.getItem('user')) {
        return <Component {...props} />;
      }
      const { location } = props;
      return (
        <Redirect
          to={{
            pathname: navigationConstants.NAVIGATION_WORKSPACES,
            state: { from: location }
          }}
        />
      );
    }
  };
}

type Props = {
  component: React.Node,
  location: {},
  cached?: boolean
};

/*
 * From https://github.com/cornflourblue/react-redux-registration-login-example/blob/master/src/_components/PrivateRoute.jsx
 */
export const PrivateRoute = ({
  component: Component,
  cached,
  ...rest
}: Props) => {
  if (cached) {
    return (
      <CacheRoute
        {...rest}
        {...renderComponent(Component)}
        when="always"
        behavior={isCached => {
          console.log(`cached ? ${isCached}`);
          return {};
        }}
      />
    );
  }
  return <Route {...rest} {...renderComponent(Component)} />;
};

PrivateRoute.defaultProps = {
  cached: false
};

export default PrivateRoute;
