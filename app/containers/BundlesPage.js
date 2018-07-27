import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import Bundles from '../components/Bundles';
import MenuAppBar from '../components/MenuAppBar';
import { loadHtmlBaseUrl } from '../actions/dblDotLocalConfig.actions';

type Props = {
  loadHtmlBaseUrl: () => {}
};

const mapDispatchToProps = {
  loadHtmlBaseUrl,
};

class BundlesPage extends PureComponent<Props> {
  props: Props;
  componentDidMount() {
    this.props.loadHtmlBaseUrl();
  }

  render() {
    return (
      <div data-tid="container">
        <MenuAppBar />
        <Bundles />
      </div>
    );
  }
}

export default connect(
  null,
  mapDispatchToProps,
)(BundlesPage);
