import React from 'react';
import { Route, Redirect } from 'react-router-dom';
import navigationConstants from '../constants/navigation.constants';

type Props = {
    component: React.Node,
    location: {}
};

/*
 * From https://github.com/cornflourblue/react-redux-registration-login-example/blob/master/src/_components/PrivateRoute.jsx
 */
export const PrivateRoute = ({ component: Component, ...rest }: Props) => (
  <Route
    {...rest}
    render={props => (
        localStorage.getItem('user')
            ? <Component {...props} />
            : <Redirect to={{ pathname: navigationConstants.NAVIGATION_WORKSPACES, state: { from: props.location } }} />
    )}
  />
);

export default PrivateRoute;
