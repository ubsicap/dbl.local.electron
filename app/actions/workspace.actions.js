import md5File from 'md5-file';
import path from 'path';
import fs from 'fs-extra';
import { workspaceConstants } from '../constants/workspace.constants';
import { dblDotLocalService } from '../services/dbl_dot_local.service';

export const workspaceActions = {
  computeWorkspaceTemplateChecksum,
  saveAsTemplate
};

export async function getMetadataTemplateDir(configXmlFile, medium) {
  const configXmlSettings = await dblDotLocalService.convertConfigXmlToJson(
    configXmlFile
  );
  const {
    settings: { storer }
  } = configXmlSettings;
  const { metadataTemplateDir: metadataTemplateDirOrNot = [null] } = storer[0];
  const [metadataTemplateDir] = metadataTemplateDirOrNot;
  const templateFilePath = path.join(metadataTemplateDir, `${medium}.xml`);
  return { metadataTemplateDir, templateFilePath };
}

export function computeWorkspaceTemplateChecksum(medium) {
  return async (dispatch, getState) => {
    // get workspace template folder
    const { dblDotLocalConfig } = getState();
    const { configXmlFile } = dblDotLocalConfig;
    const { metadataTemplateDir, templateFilePath } = getMetadataTemplateDir(
      configXmlFile,
      medium
    );
    if (!metadataTemplateDir) {
      return;
    }
    if (!(await fs.exists(templateFilePath))) {
      return;
    }
    const templateChecksum = await md5File(templateFilePath);
    dispatch({
      type: workspaceConstants.GOT_METADATA_FILE_CHECKSUM,
      templateFilePath,
      templateMedium: medium,
      templateChecksum
    });
  };
}

export function saveAsTemplate(bundleId) {
  return async (dispatch, getState) => {
    const { addedBundlesById } = bundles;
    const activeBundle = addedBundlesById[bundleId];
    const { dblDotLocalConfig, bundles } = getState();
    const { configXmlFile } = dblDotLocalConfig;
    const { metadataTemplateDir, templateFilePath } = getMetadataTemplateDir(
      configXmlFile,
      activeBundle.medium,
      'TodoDefaultPath'
    );
    if (await fs.exists(templateFilePath)) {
      // TODO: prompt before saving? // change confirm button to say "Overwrite"
    }
    // get metadata.xml
    // Save to template directory
  };
}
