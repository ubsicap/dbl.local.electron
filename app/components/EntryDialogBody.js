import React, { Component } from 'react';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import { ux } from '../utils/ux';

type Props = {
  classes: {},
  children: React.Node,
  openDrawer: boolean
};

const materialStyles = theme => ({
  ...ux.getEntryDrawerStyles(theme),
});

function mapStateToProps(state) {
  return {
    openDrawer: state.entryAppBar.openDrawer || false
  };
}

class EntryDialogBody extends Component<Props> {
  props: Props;

  render() {
    const { classes, openDrawer } = this.props;
    return (
      <main className={classNames(classes.content, {
            [classes.contentShift]: openDrawer,
          })}
      >
        {this.props.children}
      </main>
    );
  }
}

export default compose(
  withStyles(materialStyles),
  connect(
    mapStateToProps,
    null
  )
)(EntryDialogBody);
