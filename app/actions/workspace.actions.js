import md5File from 'md5-file';
import path from 'path';
import fs from 'fs-extra';
import { workspaceConstants } from '../constants/workspace.constants';
import { dblDotLocalService } from '../services/dbl_dot_local.service';

export const workspaceActions = {
  computeWorkspaceTemplateChecksum
};

export function getWorkspaceConfigXml() {}

export function computeWorkspaceTemplateChecksum(medium) {
  return async (dispatch, getState) => {
    // get workspace template folder
    const { dblDotLocalConfig } = getState();
    const { configXmlFile } = dblDotLocalConfig;
    const configXmlSettings = await dblDotLocalService.convertConfigXmlToJson(
      configXmlFile
    );
    const {
      settings: { storer }
    } = configXmlSettings;
    const {
      metadataTemplateDir: metadataTemplateDirOrNot = [null]
    } = storer[0];
    const [metadataTemplateDir] = metadataTemplateDirOrNot;
    if (!metadataTemplateDir) {
      return;
    }
    const templateFilePath = path.join(metadataTemplateDir, `${medium}.xml`);
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
