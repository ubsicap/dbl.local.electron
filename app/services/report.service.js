import fs from 'fs-extra';
import filenamify from 'filenamify';
import xml2js from 'xml2js';
import waitUntil from 'node-wait-until';
import { dblDotLocalService } from '../services/dbl_dot_local.service';
import { bundleService } from '../services/bundle.service';
import download from '../services/download-with-fetch.flow';
import dblDotLocalConfigConstants from '../constants/dblDotLocal.constants';
import { authHeader } from '../helpers';
import { getResourcePath, parseAsJson } from '../helpers/services';

export const reportService = {
  checksUseContent,
  saveReportToFile,
};
export default reportService;

const REPORTS_API = 'report';

/*
  [2019-03-27 15:28:54,214] INFO pywsgi: 127.0.0.1 - - [2019-03-27 15:28:54] "POST /session/add-tasks HTTP/1.1" 200 118 0.014043
  [2019-03-27 15:28:54,344] INFO storer: storer, execute_task, session-7240264, useContent
  [2019-03-27 15:28:54,348] INFO storer: storer, change_mode, session-7240264, use
  [2019-03-27 15:28:54,356] INFO storer: storer, report, 1a01, 13375b5d-5b8a-4d8a-8f0f-32397484fa17
  [2019-03-27 15:28:54,360] INFO storer: storer, change_mode, session-7240264, store
  [2019-03-27 15:33:22,759] INFO pywsgi: 127.0.0.1 - - [2019-03-27 15:33:22] "GET /report/13375b5d-5b8a-4d8a-8f0f-32397484fa17 HTTP/1.1" 200 415 0.002006
*/
function checksUseContent({ bundleId, reference }) {
  return dblDotLocalService.sessionAddTasks(`
  <useContent>
      <class>ChecksUseContent</class>
      <data>
          <reference>${reference}</reference>
          <bundle_id>${bundleId}</bundle_id>
      </data>
  </useContent>`);
}


async function saveReportToFile(bundleId, referenceToken, reportId, title) {
  const { filePath: filePathRaw }
    = bundleService.getTempFolderForFile(bundleId, `${filenamify(title)}_${referenceToken}-${reportId}-raw.html`);
  const { filePath }
    = bundleService.getTempFolderForFile(bundleId, `${filenamify(title)}_${referenceToken}-${reportId}.html`);
  const url = `${dblDotLocalConfigConstants.getHttpDblDotLocalBaseUrl()}/${REPORTS_API}/${reportId}`;
  await download(url, filePathRaw, () => {}, authHeader());
  const reportHtmlContent = await waitUntil(() => (fs.existsSync(filePathRaw) ? fs.readFileSync(filePathRaw, 'utf8') : false));
  const reportAsJson = await parseAsJson(reportHtmlContent);
  const reportsCss = fs.readFileSync(getReportsCssPath(), 'utf8');
  reportAsJson.html.head[0].title[0] = title;
  reportAsJson.html.head[0] = {
    ...reportAsJson.html.head[0],
    style: [reportsCss]
  };
  const builder = new xml2js.Builder({ headless: true });
  const xml = builder.buildObject(reportAsJson);
  fs.writeFileSync(filePath, xml);
  return filePath;
}


function getReportsCssPath() {
  return getResourcePath(['extraFiles', 'reports', 'reports.css']);
}

