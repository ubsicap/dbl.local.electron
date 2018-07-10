import React, { PureComponent } from 'react';
import classNames from 'classnames';
import Bundles from '../components/Bundles';
import MenuAppBar from '../components/MenuAppBar';
import styles from './BundlesPage.css';
import appBarStyles from '../components/AppBar.css';

type Props = {};

export default class BundlesPage extends PureComponent<Props> {
  props: Props;

  render() {
    return (
      <div data-tid="container">
        <MenuAppBar />
        <Bundles />
      </div>
    );
  }
}
