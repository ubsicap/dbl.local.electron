import React, { PureComponent } from 'react';
import { Button } from '@material-ui/core';
import Save from '@material-ui/icons/Save';
import Undo from '@material-ui/icons/Undo';
import { withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import { ux } from '../utils/ux';

type Props = {
  classes: {},
  handleUndo: () => {},
  handleSave: () => {}
};

const materialStyles = theme => ({
  root: {},
  ...ux.getEditMetadataStyles(theme)
});

class UndoSaveButtons extends PureComponent<Props> {
  props: Props;

  render() {
    const { classes = {}, handleUndo, handleSave } = this.props;
    return (
      <div>
        <Button className={classes.button} onClick={handleUndo}>
          <Undo className={classNames(classes.leftIcon, classes.iconSmall)} />
          Undo
        </Button>
        <Button
          variant="contained"
          color="primary"
          className={classes.button}
          onClick={handleSave}
        >
          <Save className={classNames(classes.leftIcon, classes.iconSmall)} />
          Save
        </Button>
      </div>
    );
  }
}

export default withStyles(materialStyles, { withTheme: true })(UndoSaveButtons);
