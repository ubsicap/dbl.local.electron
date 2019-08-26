import React from 'react';
import Badge from '@material-ui/core/Badge';
import Description from '@material-ui/icons/Description';
import FolderOpen from '@material-ui/icons/FolderOpen';
import InsertChartOutlined from '@material-ui/icons/InsertChartOutlined';
import ListAltIcon from '@material-ui/icons/FormatListNumberedRtl';
import CloudUpload from '@material-ui/icons/CloudUpload';
import { lighten } from '@material-ui/core/styles/colorManipulator';
import { bundleService } from '../services/bundle.service';

export const ux = {
  getFormattedRevision,
  getDblRowStyles,
  getDblRowBackgroundColor,
  getEntryDrawerStyles,
  getEntryUxStyles,
  mapColumns,
  getHighlightTheme,
  conditionallyRenderBadge,
  getClipboardTooltip,
  getModeIcon,
  getEditMetadataStyles
};
export default ux;

function getMatchingParentEntryRevision(bundle) {
  const { parent } = bundle;
  if (!parent || !parent.revision) {
    return null;
  }
  const { revision: parentRevision = null } = parent || {};
  if (parentRevision && parent.dblId === bundle.dblId) {
    return parentRevision;
  }
  return null;
}

function getFormattedRevision(bundle, insertStr) {
  const { revision } = bundle;
  const parentRevision = getMatchingParentEntryRevision(bundle);
  if (parentRevision) {
    return `> ${insertStr}${parentRevision}`;
  }
  if (revision === '0') {
    return `${insertStr}1 (New)`;
  }
  return `${insertStr}${revision}`;
}

function getDblRowStyles(theme) {
  return {
    button: {
      margin: theme.spacing.unit
    },
    badge: {
      marginRight: theme.spacing.unit * 2
    },
    badgeTight: {
      marginRight: -15
    },
    leftIcon: {
      marginRight: theme.spacing.unit
    },
    rightIcon: {
      marginLeft: theme.spacing.unit
    },
    iconSmall: {
      fontSize: 20
    },
    iconSmaller: {
      fontSize: 10
    },
    draftRevision: {
      backgroundColor: lighten(theme.palette.secondary.light, 0.85)
    },
    draftNew: { backgroundColor: lighten(theme.palette.primary.main, 0.6) },
    storedMode: { backgroundColor: 'white' },
    noneStoredMode: { backgroundColor: '#EDEDED' }
  };
}

const drawerWidth = 240;

function getEntryDrawerStyles(theme) {
  return {
    root: {
      display: 'flex'
    },
    appBar: {
      position: 'sticky',
      transition: theme.transitions.create(['margin', 'width'], {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen
      })
    },
    appBarShift: {
      width: `calc(100% - ${drawerWidth}px)`,
      marginRight: drawerWidth,
      transition: theme.transitions.create(['margin', 'width'], {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen
      })
    },
    menuButton: {
      marginLeft: 12,
      marginRight: 20
    },
    hide: {
      display: 'none'
    },
    drawer: {
      width: drawerWidth,
      flexShrink: 0
    },
    drawerPaper: {
      width: drawerWidth
    },
    drawerHeader: {
      display: 'flex',
      alignItems: 'center',
      padding: '0 8px',
      ...theme.mixins.toolbar,
      justifyContent: 'flex-start'
    },
    content: {
      flexGrow: 1,
      padding: theme.spacing.unit * 3,
      transition: theme.transitions.create('margin', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen
      }),
      marginRight: 0
    },
    contentShift: {
      transition: theme.transitions.create('margin', {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen
      }),
      marginRight: drawerWidth
    }
  };
}

function getEntryUxStyles(theme) {
  return {
    errorBar: {
      color: theme.palette.secondary.light
    },
    successBar: {
      color: theme.palette.primary.light
    },
    toolBar: {
      paddingLeft: '10px'
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
    button: {
      margin: theme.spacing.unit
    },
    input: {
      display: 'none'
    },
    buttonProgress: {
      color: theme.palette.secondary.main,
      position: 'absolute',
      top: '50%',
      left: '50%',
      marginTop: -25,
      marginLeft: -23
    }
  };
}

function getEditMetadataStyles(theme) {
  return {
    button: {
      marginTop: theme.spacing.unit,
      marginRight: theme.spacing.unit
    },
    leftIcon: {
      marginRight: theme.spacing.unit
    },
    rightIcon: {
      marginLeft: theme.spacing.unit
    },
    iconSmall: {
      fontSize: 20
    }
  };
}

function mapColumns(columns, getIsNumeric, getColumnLabel) {
  return Object.keys(columns)
    .filter(c => c !== 'id')
    .map(c => ({
      name: c,
      type: getIsNumeric(c) ? 'numeric' : 'string',
      label: getColumnLabel(c)
    }));
}

function getBackgroundForDraftNewOrRevision(
  classes,
  isForRow,
  dblId,
  revision,
  parent
) {
  if (isForRow) {
    return classes.storedMode;
  }
  const effectiveRevision = bundleService.getRevisionOrParentRevision(
    dblId,
    revision,
    parent
  );
  return effectiveRevision ? classes.draftRevision : classes.draftNew;
}

function getDblRowBackgroundColor(
  isForRow,
  classes,
  status,
  revision,
  parent,
  dblId,
  mode
) {
  if (mode === 'upload' || status === 'DRAFT') {
    return getBackgroundForDraftNewOrRevision(
      classes,
      isForRow,
      dblId,
      revision,
      parent
    );
  }
  switch (status) {
    case 'NOT_STARTED':
      return classes.noneStoredMode;
    default:
      return classes.storedMode;
  }
}

function getHighlightTheme(theme, themeType) {
  return themeType === 'light'
    ? {
        color: theme.palette.secondary.main,
        backgroundColor: lighten(theme.palette.secondary.light, 0.85)
      }
    : {
        color: theme.palette.text.primary,
        backgroundColor: theme.palette.secondary.dark
      };
}

function conditionallyRenderBadge(props, content, node) {
  if (!content) {
    return node;
  }
  return (
    <Badge key="badge" {...props} badgeContent={content}>
      {node}
    </Badge>
  );
}

function getClipboardTooltip(selectedItemsToPaste) {
  const { bundleId, itemsType, getDisplayAs, getMedium } = selectedItemsToPaste;
  const clipboardTooltip = bundleId
    ? `${itemsType} from (${getMedium()}) ${getDisplayAs().name} ${
        getDisplayAs().revision
      }`
    : '';
  return clipboardTooltip;
}

function getModeIcon(mode, props) {
  switch (mode) {
    case 'revisions':
      return <ListAltIcon {...props} />;
    case 'metadata':
      return <Description {...props} />;
    case 'reports':
      return <InsertChartOutlined {...props} />;
    case 'upload':
      return <CloudUpload {...props} />;
    case 'download':
    case 'addFiles':
    case 'store':
    default:
      return <FolderOpen {...props} />;
  }
}
