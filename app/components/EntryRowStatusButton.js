import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import Badge from '@material-ui/core/Badge';
import Button from '@material-ui/core/Button';
import FileDownload from '@material-ui/icons/CloudDownload';
import Folder from '@material-ui/icons/Folder';
import InfoIcon from '@material-ui/icons/Info';
import { openJobSpecInBrowser } from '../actions/bundle.actions';
import { openResourceManager } from '../actions/bundleManageResources.actions';
import { ux } from '../utils/ux';
import MediumIcon from './MediumIcon';

type Props = {
  classes: {},
  bundleId: string,
  dblId: string,
  revision: string,
  medium: string,
  task: string,
  mode: string,
  status: string,
  displayAs: {},
  parent: ?{},
  isUploading?: ?boolean,
  openEntryResourceManager: () => {},
  openEntryJobSpecInBrowser: () => {}
};

const mapDispatchToProps = {
  openEntryResourceManager: openResourceManager,
  openEntryJobSpecInBrowser: openJobSpecInBrowser
};

class EntryRowStatusButton extends PureComponent<Props> {
  props: Props;

  showStatusAsText = () => {
    if (this.getIsUploading()) {
      return false;
    }
    const { status } = this.props;
    return ['IN_PROGRESS'].includes(status);
  };

  showStoredButton = () => {
    const { task, status } = this.props;
    return (
      (task === 'DOWNLOAD' && status === 'COMPLETED') || status === 'DRAFT'
    );
  };

  showDownloadButton = () => {
    const { task, status } = this.props;
    return task === 'DOWNLOAD' && status === 'NOT_STARTED';
  };

  getIsUploading = () => {
    const { isUploading = false, task, status } = this.props;
    return isUploading || (task === 'UPLOAD' && status === 'IN_PROGRESS');
  };

  handleClickManageResources = mode => event => {
    const { bundleId, openEntryResourceManager } = this.props;
    openEntryResourceManager(bundleId, mode, true);
    event.stopPropagation();
  };

  handleClickUploadInfo = () => {
    const { bundleId, openEntryJobSpecInBrowser } = this.props;
    openEntryJobSpecInBrowser(bundleId);
  };

  pickBackgroundColor = isForRow => {
    const { classes, status, revision, parent, dblId, mode } = this.props;
    return ux.getDblRowBackgroundColor(
      isForRow,
      classes,
      status,
      revision,
      parent,
      dblId,
      mode
    );
  };

  render() {
    const { medium, status, displayAs, classes } = this.props;
    const isUploading = this.getIsUploading();
    const resourceManagerMode = status === 'DRAFT' ? 'addFiles' : 'download';
    return (
      <div>
        {this.showStoredButton() && (
          <Button
            variant="text"
            size="small"
            className={classNames(classes.button, this.pickBackgroundColor())}
            onClick={this.handleClickManageResources(resourceManagerMode)}
          >
            <Badge
              badgeContent={
                <MediumIcon
                  medium={medium}
                  iconProps={{
                    className: classNames(classes.leftIcon, classes.iconSmaller)
                  }}
                />
              }
            >
              <Folder
                className={classNames(classes.leftIcon, classes.iconSmall)}
              />
            </Badge>
            {displayAs.status}
          </Button>
        )}
        {isUploading && (
          <Button
            variant="text"
            size="small"
            className={classNames(classes.button, this.pickBackgroundColor())}
            onClick={this.handleClickUploadInfo}
          >
            <InfoIcon
              className={classNames(classes.leftIcon, classes.iconSmall)}
            />
            {displayAs.status}
          </Button>
        )}
        {this.showStatusAsText() && (
          <div style={{ paddingRight: '20px', paddingTop: '6px' }}>
            {displayAs.status}
          </div>
        )}
        {this.showDownloadButton() && (
          <Button
            variant="outlined"
            size="small"
            className={classes.button}
            onClick={this.handleClickManageResources('download')}
          >
            <FileDownload
              className={classNames(classes.leftIcon, classes.iconSmall)}
            />
            {displayAs.status}
          </Button>
        )}
      </div>
    );
  }
}

EntryRowStatusButton.defaultProps = {
  isUploading: null
};

const materialStyles = theme => ux.getDblRowStyles(theme);

export default compose(
  withStyles(materialStyles),
  connect(
    null,
    mapDispatchToProps
  )
)(EntryRowStatusButton);
