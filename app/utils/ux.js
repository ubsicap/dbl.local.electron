import React from 'react';
import Book from '@material-ui/icons/Book';
import Headset from '@material-ui/icons/Headset';
import Videocam from '@material-ui/icons/Videocam';
import Print from '@material-ui/icons/Print';
import Grain from '@material-ui/icons/Grain';
import { lighten } from '@material-ui/core/styles/colorManipulator';
import { bundleService } from '../services/bundle.service';

export const ux = {
  getMediumIcon,
  getFormattedRevision,
  getDblRowStyles,
  getDblRowBackgroundColor,
  mapColumns,
  getHighlightTheme
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
  } else if (revision === '0') {
    return `${insertStr}1 (New)`;
  }
  return `${insertStr}${revision}`;
}

export function getMediumIcon(medium, props = { style: { marginRight: '10px' } }) {
  return (medium === 'text' && <Book {...props} />)
  || (medium === 'audio' && <Headset {...props} />)
  || (medium === 'video' && <Videocam {...props} />)
  || (medium === 'print' && <Print {...props} />)
  || (medium === 'braille' && <Grain {...props} />)
  || (null);
}

function getDblRowStyles(theme) {
  return ({
    button: {
      margin: theme.spacing.unit,
    },
    badge: {
      marginRight: theme.spacing.unit * 2,
    },
    badgeTight: {
      marginRight: -15,
    },
    leftIcon: {
      marginRight: theme.spacing.unit,
    },
    rightIcon: {
      marginLeft: theme.spacing.unit,
    },
    iconSmall: {
      fontSize: 20,
    },
    iconSmaller: {
      fontSize: 10,
    },
    draftRevision: { backgroundColor: lighten(theme.palette.secondary.light, 0.85) },
    draftNew: { backgroundColor: lighten(theme.palette.primary.main, 0.60) },
    storedMode: { backgroundColor: 'white' },
    noneStoredMode: { backgroundColor: '#EDEDED' },
  });
}

function mapColumns(columns, getIsNumeric, getColumnLabel) {
  return Object.keys(columns)
    .map(c => ({ name: c, type: getIsNumeric(c) ? 'numeric' : 'string', label: getColumnLabel(c) }));
}

function getDblRowBackgroundColor(isForRow, classes, status, revision, parent, dblId) {
  switch (status) {
    case 'DRAFT': {
      if (isForRow) {
        return classes.storedMode;
      }
      const effectiveRevision = bundleService.getRevisionOrParentRevision(dblId, revision, parent);
      return effectiveRevision ? classes.draftRevision : classes.draftNew;
    }
    case 'NOT_STARTED': return classes.noneStoredMode;
    default:
      return classes.storedMode;
  }
}

function getHighlightTheme(theme, themeType) {
  return (themeType === 'light'
    ? {
      color: theme.palette.secondary.main,
      backgroundColor: lighten(theme.palette.secondary.light, 0.85),
    }
    : {
      color: theme.palette.text.primary,
      backgroundColor: theme.palette.secondary.dark,
    });
}
