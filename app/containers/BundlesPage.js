import React, { PureComponent } from 'react';
import Bundles from '../components/Bundles';
import MenuAppBar from '../components/MenuAppBar';

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
