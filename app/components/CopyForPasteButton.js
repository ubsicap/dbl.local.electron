import React, { Component } from 'react';
import classNames from 'classnames';
import FileCopyIcon from '@material-ui/icons/FileCopy';
import ConfirmButton from './ConfirmButton';

type Props = {
  onClick: () => {},
  classes: {},
  selectedItems: []
};

export default class CopyForPasteButton extends Component<Props> {
  props: Props;

  render() {
    const { classes, selectedItems, ...restProps } = this.props;
    return (
      <ConfirmButton classes={classes} {...restProps}>
        <FileCopyIcon className={classNames(classes.leftIcon)} />
        Copy For Paste {selectedItems.length ? `(${selectedItems.length})` : ''}
      </ConfirmButton>
    );
  }
}
