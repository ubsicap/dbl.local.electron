// @flow
import { combineReducers } from 'redux';
import { connectRouter } from 'connected-react-router';
import { authentication } from './authentication.reducer';
import { bundles } from './bundles.reducer';
import { bundlesFilter } from './bundlesFilter.reducer';
import { bundlesSaveTo } from './bundlesSaveTo.reducer';
import { bundleEditMetadata } from './bundleEditMetadata.reducer';
import { bundleManageResources } from './bundleResourceManager.reducer';
import { dblDotLocalConfig } from './dblDotLocalConfig.reducer';
import { alert } from './alert.reducer';
import { clipboard } from './clipboard.reducer';

export default function createRootReducer(history: History) {
  return combineReducers({
    router: connectRouter(history),
    dblDotLocalConfig,
  	authentication,
	bundles,
	bundlesFilter,
	bundleEditMetadata,
	bundleManageResources,
	bundlesSaveTo,
	alert,
	clipboard
  });
}
