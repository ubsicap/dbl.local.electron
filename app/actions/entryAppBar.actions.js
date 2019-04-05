import { entryAppBarConstants } from '../constants/entryAppBar.constants';

export const entryAppaBarActions = {
  resetEntryAppBar,
  openEntryDrawer,
  closeEntryDrawer
};

export function openEntryDrawer() {
  return { type: entryAppBarConstants.OPEN_ENTRY_DRAWER };
}

export function closeEntryDrawer() {
  return { type: entryAppBarConstants.CLOSE_ENTRY_DRAWER };
}

export function resetEntryAppBar() {
  return { type: entryAppBarConstants.RESET_ENTRY_APP_BAR };
}
