import md5File from 'md5-file';
import path from 'path';
import fs from 'fs-extra';
import { workspaceConstants } from '../constants/workspace.constants';
import { dblDotLocalService } from '../services/dbl_dot_local.service';
import { bundleService } from '../services/bundle.service';
import { workspaceHelpers } from '../helpers/workspaces.helpers';

export const workspaceActions = {
  computeWorkspaceTemplateChecksum,
  saveAsTemplate
};

export async function getMetadataTemplateDir(
  workspace,
  medium,
  defaultTemplatePath
) {
  const configXmlSettings = await dblDotLocalService.convertConfigXmlToJson(
    workspace
  );
  const {
    settings: { storer }
  } = configXmlSettings;
  const {
    metadataTemplateDir: metadataTemplateDirOrDefault = [defaultTemplatePath]
  } = storer[0];
  const [metadataTemplateDir] = metadataTemplateDirOrDefault;
  const templateFilePath = path.join(metadataTemplateDir, `${medium}.xml`);
  return { metadataTemplateDir, templateFilePath };
}

export function computeWorkspaceTemplateChecksum(medium) {
  return async (dispatch, getState) => {
    // get workspace template folder
    const {
      metadataTemplateDir,
      templateFilePath
    } = getMetadataTemplateDirAndTemplateFilePathFromState(getState(), medium);
    if (!metadataTemplateDir) {
      return;
    }
    const templateExists = await fs.exists(templateFilePath);
    const templateChecksum = templateExists
      ? await md5File(templateFilePath)
      : undefined;
    dispatch({
      type: workspaceConstants.GOT_METADATA_FILE_CHECKSUM,
      templateFilePath,
      templateMedium: medium,
      templateChecksum,
      templateExists
    });
  };
}

export function getMetadataTemplateDirAndTemplateFilePathFromState(
  appState,
  medium
) {
  const {
    workspaceFullPath,
    workspace
  } = workspaceHelpers.getCurrentWorkspaceFullPath(appState);
  const paths = getMetadataTemplateDir(
    workspace,
    medium,
    path.join(workspaceFullPath, 'templates')
  );
  return paths;
}

export function saveAsTemplate(bundleId) {
  return async (dispatch, getState) => {
    const appState = getState();
    const { bundles } = appState;
    const { addedBundlesById } = bundles;
    const activeBundle = addedBundlesById[bundleId];
    const {
      metadataTemplateDir,
      templateFilePath
    } = getMetadataTemplateDirAndTemplateFilePathFromState(
      appState,
      activeBundle.medium
    );
    fs.ensureDirSync(metadataTemplateDir);
    // save metadata.xml to templateFilePath
    await bundleService.requestSaveResourceTo(
      metadataTemplateDir,
      bundleId,
      'metadata.xml',
      templateFilePath,
      () => {}
    );
    const { workspace } = workspaceHelpers.getCurrentWorkspaceFullPath(
      appState
    );
    // Save template directory setting if save completed.
    const configXmlSettings = await dblDotLocalService.convertConfigXmlToJson(
      workspace
    );
    configXmlSettings.settings.storer.metadataTemplateDir = metadataTemplateDir;
    dblDotLocalService.updateAndWriteConfigXmlSettings({
      configXmlSettings,
      workspace
    });
  };
}
