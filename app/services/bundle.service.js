import fs from 'fs-extra';
import path from 'path';
import rp from 'request-promise-native';
import uuidv1 from 'uuid/v1';
import { authHeader } from '../helpers';
import { dblDotLocalConfig } from '../constants/dblDotLocal.constants';
import download from './download-with-fetch.flow';

const { app } = require('electron').remote;

export const bundleService = {
  create,
  fetchAll,
  fetchById,
  update,
  apiBundleHasMetadata,
  convertApiBundleToNathanaelBundle,
  getInitialTaskAndStatus,
  getManifestResourcePaths,
  getManifestResourceDetails,
  downloadResources,
  removeResources,
  getResourcePaths,
  requestSaveResourceTo,
  saveMetadataToTempFolder,
  removeBundle,
  getFormBundleTree,
  getFormFields,
  deleteForm,
  postFormFields,
  startUploadBundle,
  startCreateContent,
  stopCreateContent,
  bundleIsInCreateMode,
  unlockCreateMode,
  postResource,
  updateManifestResource,
  getPublicationWizards,
  testPublicationWizards,
  runPublicationWizard,
  checkAllFields
};
export default bundleService;

const BUNDLE_API = 'bundle';
const BUNDLE_API_LIST = `${BUNDLE_API}/list`;
const RESOURCE_API = 'resource';
const RESOURCE_API_LIST = RESOURCE_API;
const FORM_API = 'form';
const FORM_BUNDLE_API = `${FORM_API}/bundle`;
const FORM_BUNDLE_API_DELETE = `${FORM_API}/delete`;
const MANIFEST_API = 'manifest';
const MANIFEST_DETAILS = 'details';
const PUBLICATION_API = 'publication';

/*
{
  "099a30a6-b707-4df8-b4dd-7149f25658b7": {
    "local_id": "099a30a6-b707-4df8-b4dd-7149f25658b7",
    "mode": "store",
    "dbl": {
      "id": "65885538a6d64ec8",
      "currentRevision": "0",
      "medium": "text"
    },
    "store": {
      "created": "2018-05-04 11:02:14",
      "modified": "2018-05-04 11:02:14",
      "history": [
        {
          "type": "initialize",
          "timestamp": "2018-05-04 11:02:14",
          "message": ""
        },
        {
          "type": "writeMetadata",
          "timestamp": "2018-05-04 11:02:14",
          "message": "metadata.xml"
        }
      ],
      "tasks": [],
      "labels": {},
      "file_info": {
        "metadata.xml": {
          "is_dir": false,
          "size": 1224,
          "modified": "2018-05-04 11:02:14"
        }
      }
    },
    "download": null,
    "metadata": {
      "name": "Empty Text Bundle",
      "abbreviation": "<none>",
      "language": "<none>",
      "dateUpdated": "2018-05-04 11:02:14"
    }
  },

  TO this format:
   {
      id: 'bundle02',
      name: 'Another Bundle',
      revision: 3,
      task: 'UPLOAD',
      status: 'IN_PROGRESS',
      progress: 63,
      mode: 'PAUSED'
   },
 */
async function fetchAll() {
  const requestOptions = {
    method: 'GET',
    headers: authHeader()
  };
  const response = await fetch(
    `${dblDotLocalConfig.getHttpDblDotLocalBaseUrl()}/${BUNDLE_API_LIST}`,
    requestOptions
  );
  const apiBundles = await handleResponse(response);
  const bundles = await convertBundleApiListToBundles(apiBundles);
  return { bundles, apiBundles };
}

function apiBundleHasMetadata(apiBundle) {
  return apiBundle.metadata;
}

function convertBundleApiListToBundles(apiBundles) {
  const bundles = Promise.all(Object.values(apiBundles)
    .filter(apiBundleHasMetadata)
    .map(convertApiBundleToNathanaelBundle));
  return bundles;
}

function getInitialTaskAndStatus(apiBundle) {
  const { dbl, mode } = apiBundle;
  let task = dbl.currentRevision === '0' ? 'UPLOAD' : 'DOWNLOAD';
  let status = dbl.currentRevision === '0' ? 'DRAFT' : 'NOT_STARTED';
  if (mode === 'download') {
    task = 'DOWNLOAD';
    status = 'IN_PROGRESS';
  } else if (mode === 'upload' || mode === 'create') {
    task = 'UPLOAD';
    status = mode === 'create' ? 'DRAFT' : 'IN_PROGRESS';
  }
  return { task, status };
}

async function convertApiBundleToNathanaelBundle(apiBundle) {
  const {
    mode, metadata, dbl, store, upload
  } = apiBundle;
  const { jobId: uploadJob } = upload || {};
  const { file_info: fileInfo } = store;
  const { parent } = dbl;
  const bundleId = apiBundle.local_id;
  let resourceCountStored;
  let resourceCountManifest;
  const initTaskStatus = getInitialTaskAndStatus(apiBundle);
  const { task } = initTaskStatus;
  let { status } = initTaskStatus;
  if (fileInfo && Object.keys(fileInfo).length > 1) {
    // compare the manifest and resources to determine whether user can download more or not.
    const manifestPaths = await getManifestResourcePaths(bundleId);
    const resourcePaths = await getResourcePaths(bundleId);
    resourceCountManifest = (manifestPaths || []).length;
    resourceCountStored = (resourcePaths || []).length;
    if (task === 'DOWNLOAD' && mode === 'store') {
      status = 'COMPLETED'; // even if only some are stored
    }
    // btw. it's possible that it could be in the process of REMOVE_RESOURCES,
    // but that's typically going to be so fast
    // we can probably just display it as ready to download.
  } else {
    resourceCountStored = 0;
  }
  return {
    id: bundleId,
    name: metadata.name,
    revision: dbl.currentRevision,
    dblId: dbl.id,
    medium: dbl.medium,
    countryIso: metadata.countries || '',
    languageIso: metadata.language,
    mode,
    task,
    status,
    uploadJob,
    resourceCountStored,
    resourceCountManifest,
    parent
  };
}

async function fetchById(id) {
  const requestOptions = {
    method: 'GET',
    headers: authHeader()
  };
  const response = await fetch(
    `${dblDotLocalConfig.getHttpDblDotLocalBaseUrl()}/${BUNDLE_API}/${id}`,
    requestOptions
  );
  return handleResponse(response, (r) => r);
}

function create(bundle) {
  const requestOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bundle)
  };

  return fetch(
    `${dblDotLocalConfig.getHttpDblDotLocalBaseUrl()}/${BUNDLE_API}/create`,
    requestOptions
  ).then(handleResponse);
}

function update(bundle) {
  const requestOptions = {
    method: 'PUT',
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(bundle)
  };

  return fetch(`/${BUNDLE_API}/${bundle.id}`, requestOptions).then(handleResponse);
}

function handleResponse(response, rejectFunc) {
  if (!response.ok) {
    const error = rejectFunc ? rejectFunc(response) : response.statusText;
    return Promise.reject(error);
  }
  return response.json();
}

function handlePostFormResponse(response) {
  if (!response.ok) {
    return Promise.reject(response);
  }
  return response.text();
}

function getManifestResourcePaths(bundleId) {
  const requestOptions = {
    method: 'GET',
    headers: authHeader()
  };
  const url = `${dblDotLocalConfig.getHttpDblDotLocalBaseUrl()}/${MANIFEST_API}/${bundleId}`;
  return fetch(url, requestOptions).then(handleResponse);
}

function getManifestResourceDetails(bundleId) {
  const requestOptions = {
    method: 'GET',
    headers: authHeader()
  };
  const url = `${dblDotLocalConfig.getHttpDblDotLocalBaseUrl()}/${MANIFEST_API}/${bundleId}/${MANIFEST_DETAILS}`;
  return fetch(url, requestOptions).then(handleResponse);
}

/* <downloadResources>
      <resource uri="release/English.lds"/>
 */
function downloadResources(bundleId, uris = []) {
  const urisXml = uris.map(uri => `<resource uri="${uri}"/>`).join('') || '';
  return bundleAddTasks(bundleId, `<downloadResources>${urisXml}</downloadResources>`);
}

function removeResources(bundleId) {
  return bundleAddTasks(bundleId, '<removeLocalResources/>');
}

function removeBundle(bundleId) {
  return bundleAddTasks(bundleId, '<deleteBundle/>');
}

function bundleAddTasks(bundleId, innerTasks) {
  const requestOptions = {
    method: 'POST',
    headers: { ...authHeader(), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `xml=<tasks> ${encodeURIComponent(innerTasks)} </tasks>`
  };
  const url = `${dblDotLocalConfig.getHttpDblDotLocalBaseUrl()}/${BUNDLE_API}/${bundleId}/add-tasks`;
  return fetch(url, requestOptions).then(handlePostFormResponse);
}

function getResourcePaths(bundleId) {
  const requestOptions = {
    method: 'GET',
    headers: authHeader()
  };
  const url = `${dblDotLocalConfig.getHttpDblDotLocalBaseUrl()}/${BUNDLE_API}/${bundleId}/${RESOURCE_API_LIST}`;
  return fetch(url, requestOptions).then(handleResponse);
}

async function saveMetadataToTempFolder(bundleId) {
  const temp = app.getPath('temp');
  const metadataXmlResource = 'metadata.xml';
  const tmpFolder = path.join(temp, bundleId);
  const metadataFile = path.join(tmpFolder, metadataXmlResource);
  await bundleService.requestSaveResourceTo(
    tmpFolder,
    bundleId,
    metadataXmlResource,
    () => {}
  );
  return metadataFile;
}

/*
 * Downloader.download('https://download.damieng.com/fonts/original/EnvyCodeR-PR7.zip',
 *  'envy-code-r.zip', (bytes, percent) => console.log(`Downloaded ${bytes} (${percent})`));
 */
function requestSaveResourceTo(selectedFolder, bundleId, resourcePath, progressCallback) {
  const url = `${dblDotLocalConfig.getHttpDblDotLocalBaseUrl()}/${BUNDLE_API}/${bundleId}/${RESOURCE_API}/${resourcePath}`;
  const targetPath = path.join(selectedFolder, resourcePath);
  return download(url, targetPath, progressCallback, authHeader());
}

function getFormBundleTree(bundleId) {
  const requestOptions = {
    method: 'GET',
    headers: authHeader()
  };
  const url = `${dblDotLocalConfig.getHttpDblDotLocalBaseUrl()}/${FORM_BUNDLE_API}/${bundleId}`;
  return fetch(url, requestOptions).then(handleResponse);
}

function getFormFields(bundleId, formKey) {
  const requestOptions = {
    method: 'GET',
    headers: authHeader()
  };
  const url = `${dblDotLocalConfig.getHttpDblDotLocalBaseUrl()}/${FORM_API}/${bundleId}${formKey}`;
  return fetch(url, requestOptions).then(handleResponse);
}
/*
  {
    "field_issues": [
      [
        "name",
        "no_regex_match_\\S.*\\S",
        ""
      ]
    ],
    "document_issues": [],
    "response_format_valid": true,
    "response_valid": false
  }
 */
function postFormFields({
  bundleId, formKey, payload, keyField
}) {
  const requestOptions = {
    method: 'POST',
    headers: { ...authHeader(), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `response=${encodeURIComponent(JSON.stringify(payload))}`
  };
  const newKeyPath = `/${keyField}`;
  const newInstanceKey = keyField && !formKey.endsWith(newKeyPath) ? newKeyPath : '';
  const url = `${dblDotLocalConfig.getHttpDblDotLocalBaseUrl()}/${FORM_API}/${bundleId}${formKey}${newInstanceKey}`;
  return fetch(url, requestOptions).then(handlePostFormResponse);
}

function checkAllFields(bundleId) {
  const requestOptions = {
    method: 'GET',
    headers: authHeader()
  };
  const url = `${dblDotLocalConfig.getHttpDblDotLocalBaseUrl()}/${FORM_API}/check-metadata/${bundleId}`;
  return fetch(url, requestOptions).then(handleResponse);
}

function startUploadBundle(bundleId) {
  return bundleAddTasks(bundleId, '<cancelUploadJobs/><createUploadJob/><uploadResources/><submitJobIfComplete><forkAfterUpload>true</forkAfterUpload></submitJobIfComplete>');
}

function deleteForm(bundleId, formKey) {
  const requestOptions = {
    method: 'POST',
    headers: { ...authHeader() }
  };
  const url = `${dblDotLocalConfig.getHttpDblDotLocalBaseUrl()}/${FORM_BUNDLE_API_DELETE}/${bundleId}${formKey}`;
  return fetch(url, requestOptions).then(handlePostFormResponse);
}

function startCreateContent(bundleId, label) {
  const uuid1 = uuidv1();
  const creator = label ? 'NoOpCreator' : 'AsyncCreator';
  const labelElement = label ? `<label>${label}-${bundleId}-${uuid1}</label>` : '';
  const tasksCopyResources = label ?
    '<tasks><copyResources><fromBundleLabel>_parent</fromBundleLabel></copyResources></tasks>' : '';
  return bundleAddTasks(
    bundleId,
    `<createContent><class>${creator}</class>${labelElement}<data/>
      ${tasksCopyResources}
    </createContent>`
  );
}

async function bundleIsInCreateMode(bundleId) {
  const rawBundleInfo = await bundleService.fetchById(bundleId);
  return rawBundleInfo.mode === 'create';
}

async function unlockCreateMode(bundleId) {
  if (await bundleService.bundleIsInCreateMode(bundleId)) {
    // unblock block tasks like 'Delete'
    await bundleService.stopCreateContent(bundleId);
  }
}

/*
  /bundle/<id>/creation/stop/success
  /bundle/<id>/creation/stop/failure, where 'failure' will clear any following tasks
*/
function stopCreateContent(bundleId, mode = 'success') {
  const requestOptions = {
    method: 'POST',
    headers: { ...authHeader() }
  };
  const url = `${dblDotLocalConfig.getHttpDblDotLocalBaseUrl()}/${BUNDLE_API}/${bundleId}/creation/stop/${mode}`;
  return fetch(url, requestOptions).then(handlePostFormResponse);
}

function postResource(bundleId, filePath, bundlePath) {
  const filename = path.basename(filePath);
  const uri = `${dblDotLocalConfig.getHttpDblDotLocalBaseUrl()}/${BUNDLE_API}/${bundleId}/resource/${bundlePath}`;
  const options = {
    method: 'POST',
    uri,
    formData: {
      // Like <input type="file" name="content">
      name: filename,
      content: {
        value: fs.createReadStream(filePath),
        options: {
          filename
        }
      }
    },
    headers: {
      ...authHeader()
      /* 'content-type': 'multipart/form-data' */ // Is set automatically
    }
  };
  return rp(options);
}

function updateManifestResource(bundleId, bundlePath) {
  const requestOptions = {
    method: 'POST',
    headers: { ...authHeader() },
  };
  const url = `${dblDotLocalConfig.getHttpDblDotLocalBaseUrl()}/${MANIFEST_API}/${bundleId}/update/${bundlePath}`;
  return fetch(url, requestOptions).then(handlePostFormResponse);
}

async function getPublicationWizards() {
  const requestOptions = {
    method: 'GET',
    headers: authHeader()
  };
  const response = await fetch(
    `${dblDotLocalConfig.getHttpDblDotLocalBaseUrl()}/${PUBLICATION_API}/wizard`,
    requestOptions
  );
  return handleResponse(response, (r) => r);
}

async function testPublicationWizards(bundleId, pubId) {
  const requestOptions = {
    method: 'GET',
    headers: authHeader()
  };
  const response = await fetch(
    `${dblDotLocalConfig.getHttpDblDotLocalBaseUrl()}/${PUBLICATION_API}/wizard/${bundleId}/${pubId}`,
    requestOptions
  );
  return handleResponse(response, (r) => r);
}

function runPublicationWizard(bundleId, pubId, wizardId, containerUri) {
  const requestOptions = {
    method: 'POST',
    headers: { ...authHeader() },
  };
  const url = `${dblDotLocalConfig.getHttpDblDotLocalBaseUrl()}/${PUBLICATION_API}/wizard/${bundleId}/${pubId}/${wizardId}/${containerUri}`;
  return fetch(url, requestOptions).then(handlePostFormResponse);
}
