// @flow
import { combineReducers } from 'redux';
import { routerReducer as router } from 'react-router-redux';
import { authentication } from './authentication.reducer';
import { bundles } from './bundles.reducer';
import { bundlesFilter } from './bundlesFilter.reducer';
import { bundlesSaveTo } from './bundlesSaveTo.reducer';
import { bundleEditMetadata } from './bundleEditMetadata.reducer';
import { bundleManageResources } from './bundleResourceManager.reducer';
import { bundleManageResourcesUx } from './bundleResourceManagerUx.reducer';
import { dblDotLocalConfig } from './dblDotLocalConfig.reducer';
import { alert } from './alert.reducer';
import { clipboard } from './clipboard.reducer';
import { reports } from './report.reducer';

const rootReducer = combineReducers({
  router,
  dblDotLocalConfig,
  authentication,
  bundles,
  bundlesFilter,
  bundleEditMetadata,
  bundleManageResources,
  bundleManageResourcesUx,
  bundlesSaveTo,
  alert,
  clipboard,
  reports
});

export default rootReducer;
