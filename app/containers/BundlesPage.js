import React, { PureComponent } from 'react';
import Bundles from '../components/Bundles';
import MenuAppBar from '../components/MenuAppBar';
import styles from './BundlesPage.css';

type Props = {};

export default class BundlesPage extends PureComponent<Props> {
  props: Props;

  render() {
    return (
      <div className={styles.container} style={{ paddingTop: '68px' }} data-tid="container">
        <MenuAppBar />
        <Bundles />
      </div>
    );
  }
}
