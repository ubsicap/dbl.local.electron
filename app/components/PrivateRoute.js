import React from 'react';
import { Route, Redirect } from 'react-router-dom';

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
            : <Redirect to={{ pathname: '/login', state: { from: props.location } }} />
    )}
  />
);

export default PrivateRoute;
