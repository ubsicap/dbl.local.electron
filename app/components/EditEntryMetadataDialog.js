import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { createSelector } from 'reselect';
import { withStyles } from '@material-ui/core/styles';
import Badge from '@material-ui/core/Badge';
import Button from '@material-ui/core/Button';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import { Map } from 'immutable';
import Checkbox from '@material-ui/core/Checkbox';
import NavigateNext from '@material-ui/icons/NavigateNext';
import Save from '@material-ui/icons/Save';
import classNames from 'classnames';
import Tooltip from '@material-ui/core/Tooltip';
import { updateBundle } from '../actions/bundle.actions';
import {
  closeEditMetadata,
  saveFieldValuesForActiveForm,
  computeMetadataChecksum
} from '../actions/bundleEditMetadata.actions';
import {
  computeWorkspaceTemplateChecksum,
  saveAsTemplate
} from '../actions/workspace.actions';
import { pasteItems, selectItemsToPaste } from '../actions/clipboard.actions';
import editMetadataService from '../services/editMetadata.service';
import EditMetadataStepper from './EditMetadataStepper';
import { clipboardHelpers } from '../helpers/clipboard';
import EntryAppBar from './EntryAppBar';
import EntryDrawer from './EntryDrawer';
import EntryDialogBody from './EntryDialogBody';
import PasteButton from './PasteButton';
import { ux } from '../utils/ux';
import { emptyObject } from '../utils/defaultValues';
import CopyForPasteButton from './CopyForPasteButton';
import ConfirmButton from './ConfirmButton';

const getFormsErrors = editMetadataService.makeGetFormsErrors();
const getCurrentWorkspace = state => state.workspace || emptyObject;

const getCurrentMetadataFileChecksum = state =>
  state.entryAppBar.metadataFileChecksum;

const getTemplateChecksum = createSelector(
  [getCurrentWorkspace],
  currentWorkspace => {
    const { templateChecksum } = currentWorkspace || emptyObject;
    return templateChecksum;
  }
);

const getCanSaveAsTemplate = createSelector(
  [getCurrentMetadataFileChecksum, getTemplateChecksum],
  (currentMetadataChecksum, templateChecksum) => {
    return (
      currentMetadataChecksum && currentMetadataChecksum !== templateChecksum
    );
  }
);

const getTemplateExists = createSelector(
  [getCurrentMetadataFileChecksum, getTemplateChecksum],
  (currentMetadataChecksum, templateChecksum) => {
    return Boolean(templateChecksum);
  }
);

function mapStateToProps(state, props) {
  const { bundleEditMetadata, bundles, clipboard } = state;
  const { bundleId } = props.match.params;
  const { selectedItemsToPaste } = clipboard;
  const {
    currentFormWithErrors,
    nextFormWithErrors,
    formStructure
  } = bundleEditMetadata;
  const { addedByBundleIds } = bundles;
  const selectedBundle = bundleId ? addedByBundleIds[bundleId] : {};
  const formsErrors = getFormsErrors(state, selectedBundle);
  const currentFormNumWithErrors =
    Object.keys(formsErrors).indexOf(currentFormWithErrors) + 1;
  const {
    requestingSaveMetadata = false,
    wasMetadataSaved = false,
    couldNotSaveMetadataMessage = null,
    moveNext = null
  } = bundleEditMetadata;
  return {
    open: Boolean(bundleId || false),
    bundleId,
    selectedBundle,
    requestingSaveMetadata,
    wasMetadataSaved,
    moveNext,
    couldNotSaveMetadataMessage,
    formsErrors,
    currentFormNumWithErrors,
    nextFormWithErrors,
    formStructure,
    selectedItemsToPaste,
    canSaveAsTemplate: getCanSaveAsTemplate(state, props),
    templateExists: getTemplateExists(state, props)
  };
}

const mapDispatchToProps = {
  closeEditMetadata,
  saveFieldValuesForActiveForm,
  updateBundle,
  pasteItems,
  selectSectionItemsToPaste: selectItemsToPaste,
  saveMetadataAsTemplate: saveAsTemplate,
  computeMediumTemplateChecksum: computeWorkspaceTemplateChecksum,
  computeEntryMetadataChecksum: computeMetadataChecksum
};

const materialStyles = theme => ({
  ...ux.getDblRowStyles(theme),
  ...ux.getEntryDrawerStyles(theme),
  appBar: {
    position: 'sticky'
  },
  toolBar: {
    paddingLeft: '0px'
  },
  flex: {
    flex: 1
  },
  leftIcon: {
    marginRight: theme.spacing.unit
  },
  iconSmall: {
    fontSize: 20
  },
  badge: {
    marginRight: theme.spacing.unit * 2,
    marginLeft: theme.spacing.unit
  }
});

type Props = {
  bundleId: string,
  selectedBundle: {},
  formsErrors: {},
  currentFormNumWithErrors: number,
  nextFormWithErrors: ?string,
  closeEditMetadata: () => {},
  updateBundle: () => {},
  classes: {},
  saveFieldValuesForActiveForm: () => {},
  wasMetadataSaved: boolean,
  moveNext: ?{},
  couldNotSaveMetadataMessage: ?string,
  requestingSaveMetadata: boolean,
  formStructure: {},
  selectedItemsToPaste: ?{},
  pasteItems: () => {},
  canSaveAsTemplate: boolean,
  templateExists: boolean,
  saveMetadataAsTemplate: () => {},
  computeMediumTemplateChecksum: () => {},
  computeEntryMetadataChecksum: () => {},
  selectSectionItemsToPaste: () => {}
};

class EditEntryMetadataDialog extends PureComponent<Props> {
  props: Props;

  state = {
    sectionSelections: {}
  };

  componentDidMount() {
    const {
      selectedBundle,
      computeMediumTemplateChecksum,
      computeEntryMetadataChecksum
    } = this.props;
    computeMediumTemplateChecksum(selectedBundle.medium);
    computeEntryMetadataChecksum(selectedBundle.id);
  }

  componentDidUpdate(prevProps) {
    const {
      moveNext,
      wasMetadataSaved,
      couldNotSaveMetadataMessage
    } = this.props;
    if (
      moveNext &&
      moveNext.exit &&
      wasMetadataSaved &&
      !prevProps.wasMetadataSaved
    ) {
      this.props.closeEditMetadata(this.props.bundleId);
      this.props.updateBundle(this.props.bundleId);
    } else if (
      couldNotSaveMetadataMessage &&
      couldNotSaveMetadataMessage !== prevProps.couldNotSaveMetadataMessage
    ) {
      // TODO: post confirm message.
      // if confirmed: this.props.closeEditMetadata();
    }
  }

  handleClose = () => {
    this.props.saveFieldValuesForActiveForm({ moveNext: { exit: true } });
  };

  navigateToNextErrror = () => {
    const { nextFormWithErrors } = this.props;
    const moveNext = nextFormWithErrors
      ? { formKey: nextFormWithErrors }
      : null;
    this.props.saveFieldValuesForActiveForm({ moveNext });
  };

  handlePasteMetadataSections = () => {
    const { bundleId } = this.props;
    this.props.pasteItems(bundleId);
  };

  conditionallyRenderPrimaryActionButton = () => {
    const { classes, formsErrors, selectedItemsToPaste, bundleId } = this.props;
    const {
      items: sectionsToPaste = [],
      itemsType,
      bundleId: bundleIdOnClipboard
    } = selectedItemsToPaste || {};
    if (
      selectedItemsToPaste &&
      itemsType === 'metadata sections' &&
      bundleId !== bundleIdOnClipboard &&
      sectionsToPaste.length > 0
    ) {
      return (
        <PasteButton
          key="btnPasteMetadataSections"
          classes={classes}
          color="secondary"
          variant="contained"
          onClick={this.handlePasteMetadataSections}
          selectedItemsToPaste={selectedItemsToPaste}
        />
      );
    }
    const formsErrorsCount = Object.keys(formsErrors).length;
    if (!formsErrorsCount) {
      const { requestingSaveMetadata } = this.props;
      return (
        <Button
          key="btnSave"
          color="inherit"
          disable={requestingSaveMetadata.toString()}
          onClick={this.handleClose}
        >
          <Save
            key="iconSave"
            className={classNames(classes.leftIcon, classes.iconSmall)}
          />
          Save
        </Button>
      );
    }
    const { currentFormNumWithErrors } = this.props;
    return (
      <Tooltip title="Navigate to next form with error">
        <Button
          key="btnGotoError"
          color="secondary"
          variant="contained"
          onClick={this.navigateToNextErrror}
        >
          {currentFormNumWithErrors || ''}
          <Badge
            key="badge"
            className={classes.badge}
            badgeContent={formsErrorsCount}
            color="error"
          >
            <NavigateNext
              style={{ background: '#F8F6AE' }}
              color="action"
              key="navigateNext"
              className={classNames(classes.iconSmall)}
            />
          </Badge>
          Next
        </Button>
      </Tooltip>
    );
  };

  handleSaveAsTemplate = () => {
    const { saveMetadataAsTemplate, selectedBundle } = this.props;
    saveMetadataAsTemplate(selectedBundle.id);
  };

  handleCopySections = selectedItemsForCopy => () => {
    const { selectedBundle, selectSectionItemsToPaste } = this.props;
    selectSectionItemsToPaste(
      selectedBundle.id,
      selectedItemsForCopy,
      'metadata sections'
    );
    this.handleClose();
  };

  conditionallyRenderSecondaryActionButton = selectedItemsForCopy => {
    const { classes } = this.props;
    if (selectedItemsForCopy && selectedItemsForCopy.length > 0) {
      return (
        <CopyForPasteButton
          key="btnCopyForPaste"
          classes={classes}
          color="inherit"
          onClick={this.handleCopySections(selectedItemsForCopy)}
          disabled={selectedItemsForCopy.length === 0}
          selectedItems={selectedItemsForCopy}
        />
      );
    }
    const { canSaveAsTemplate, templateExists, selectedBundle } = this.props;
    const { medium } = selectedBundle;
    const labelTemplateAction = templateExists
      ? `Overwrite ${medium} template`
      : `Save as ${medium} template`;
    const buttonProps = {
      classes,
      color: 'primary',
      variant: 'contained',
      onClick: this.handleSaveAsTemplate,
      disabled: !canSaveAsTemplate
    };
    return (
      <Tooltip title="Save as metadata template">
        <div>
          <ConfirmButton classes={classes} {...buttonProps}>
            <Save className={classNames(classes.leftIcon, classes.iconSmall)} />
            {labelTemplateAction}
          </ConfirmButton>
        </div>
      </Tooltip>
    );
  };

  handleClickSectionSelection = event => {
    event.stopPropagation();
    event.preventDefault();
    const { value } = event.target;
    const { sectionSelections } = this.state;
    const newCheckedState = !sectionSelections[value];
    const newsSctionSelections = {
      ...sectionSelections,
      [value]: newCheckedState
    };
    this.setState({ sectionSelections: newsSctionSelections });
  };

  getAreAllSectionsSelected = () => {
    const { formStructure } = this.props;
    if (formStructure.length === 0) {
      return false;
    }
    const { sectionSelections = {} } = this.state;
    const incompatibleSections = clipboardHelpers.getUnsupportedMetadataSections();
    const areAllSelected =
      Object.keys(sectionSelections).length ===
        formStructure.length - incompatibleSections.length &&
      Object.values(sectionSelections).every(value => value);
    return areAllSelected;
  };

  handleClickSelectAll = event => {
    event.stopPropagation();
    event.preventDefault();
    const { formStructure } = this.props;
    const incompatibleSections = clipboardHelpers.getUnsupportedMetadataSections();
    const areAllSelected = this.getAreAllSectionsSelected();
    const valueToSet = !areAllSelected;
    const sectionSelectionsMap = formStructure
      .map(step => step.section)
      .filter(sectionName => !incompatibleSections.includes(sectionName))
      .reduce((acc, k) => acc.set(k, valueToSet), Map());
    const sectionSelections = sectionSelectionsMap.toObject();
    this.setState({ sectionSelections });
  };

  modeUi = () => {
    const title = 'Metadata';
    return { appBar: { title, OkButtonLabel: '', OkButtonIcon: null } };
  };

  getSelectedItemsForCopy = () => {
    const { sectionSelections } = this.state;
    const sectionsSelected = Object.entries(sectionSelections)
      .filter(([, isSelected]) => isSelected)
      .map(([s]) => s);
    return sectionsSelected;
  };

  render() {
    const { selectedBundle = {}, bundleId } = this.props;
    const { sectionSelections } = this.state;
    const areAllSelected = this.getAreAllSectionsSelected();
    const selectedItemsForCopy = this.getSelectedItemsForCopy();
    const modeUi = this.modeUi();
    return (
      <div>
        <EntryAppBar
          origBundle={selectedBundle}
          mode="metadata"
          modeUi={modeUi}
          actionButton={this.conditionallyRenderPrimaryActionButton()}
          secondaryActionButton={this.conditionallyRenderSecondaryActionButton(
            selectedItemsForCopy
          )}
          handleClose={this.handleClose}
        />
        <EntryDrawer activeBundle={selectedBundle} />
        <EntryDialogBody>
          <FormControlLabel
            style={{ paddingTop: '8px', paddingLeft: '55px' }}
            control={
              <Checkbox
                onClick={this.handleClickSelectAll}
                value="selectAllSectionCheckboxes"
                checked={areAllSelected}
                indeterminate={
                  selectedItemsForCopy.length > 0 && !areAllSelected
                }
              />
            }
            label={`Selected Sections (${selectedItemsForCopy.length})`}
          />
          <EditMetadataStepper
            bundleId={bundleId}
            myStructurePath=""
            sectionSelections={sectionSelections}
            onClickSectionSelection={this.handleClickSectionSelection}
          />
        </EntryDialogBody>
      </div>
    );
  }
}

export default compose(
  withStyles(materialStyles, { name: 'EditEntryMetadataDialog' }),
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(EditEntryMetadataDialog);
