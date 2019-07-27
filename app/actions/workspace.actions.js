import md5File from 'md5-file/promise';
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
  const templateFileName = `${medium}.xml`;
  const templateFilePath = path.join(metadataTemplateDir, templateFileName);
  return { metadataTemplateDir, templateFilePath, templateFileName };
}

export function computeWorkspaceTemplateChecksum(medium) {
  return async (dispatch, getState) => {
    // get workspace template folder
    const {
      templateFilePath
    } = await getMetadataTemplateDirAndTemplateFilePathFromState(
      getState(),
      medium
    );
    const templateExists = await fs.exists(templateFilePath);
    const templateContents = templateExists
      ? await fs.readFile(templateFilePath, 'utf8')
      : '';
    const templateChecksum = templateExists
      ? await md5File(templateFilePath)
      : undefined;
    dispatch({
      type: workspaceConstants.GOT_TEMPLATE_FILE_CHECKSUM,
      templateFilePath,
      templateMedium: medium,
      templateChecksum,
      templateExists,
      templateContents
    });
  };
}

export async function getMetadataTemplateDirAndTemplateFilePathFromState(
  appState,
  medium
) {
  const {
    workspaceFullPath,
    workspace
  } = workspaceHelpers.getCurrentWorkspaceFullPath(appState);
  const paths = await getMetadataTemplateDir(
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
    const { addedByBundleIds } = bundles;
    const activeBundle = addedByBundleIds[bundleId];
    const { medium } = activeBundle;
    const {
      metadataTemplateDir,
      templateFileName,
      templateFilePath
    } = await getMetadataTemplateDirAndTemplateFilePathFromState(
      appState,
      medium
    );
    const didExistMetadataTemplateDir = await fs.exists(metadataTemplateDir);
    await fs.ensureDir(metadataTemplateDir);
    // save metadata.xml to templateFilePath
    await bundleService.requestSaveResourceTo(
      metadataTemplateDir,
      bundleId,
      'metadata.xml',
      templateFileName
    );
    dispatch({
      type: workspaceConstants.SAVED_TEMPLATE,
      medium,
      templateFilePath
    });
    dispatch(computeWorkspaceTemplateChecksum(medium));
    if (!didExistMetadataTemplateDir) {
      // Save template directory setting if save completed.
      const { workspace } = workspaceHelpers.getCurrentWorkspaceFullPath(
        appState
      );
      const configXmlSettings = await dblDotLocalService.convertConfigXmlToJson(
        workspace
      );
      configXmlSettings.settings.storer[0].metadataTemplateDir = [
        metadataTemplateDir
      ];
      dblDotLocalService.updateAndWriteConfigXmlSettings({
        configXmlSettings,
        workspace
      });
      dispatch({
        type: workspaceConstants.METADATA_TEMPLATE_FOLDER_UPDATED,
        metadataTemplateDir,
        configXmlSettings
      });
    }
  };
}
