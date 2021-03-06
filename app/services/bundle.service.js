import log from 'electron-log';
import traverse from 'traverse';
import fs from 'fs-extra';
import path from 'path';
import got from 'got';
import FormData from 'form-data';
import uuidv1 from 'uuid/v1';
import waitUntil from 'node-wait-until';
import { authHeader } from '../helpers';
import { servicesHelpers } from '../helpers/services';
import { bundleHelpers } from '../helpers/bundle.helpers';
import dblDotLocalConfigConstants from '../constants/dblDotLocal.constants';
import download from './download-with-fetch.flow';

const { app } = require('electron').remote;

export const bundleService = {
  create,
  fetchAll,
  fetchById,
  getCurrentBundleState,
  getFlatFileInfo,
  getHasStoredResources,
  update,
  apiBundleHasMetadata,
  convertApiBundleToNathanaelBundle,
  getInitialTaskAndStatus,
  deleteManifestResource,
  downloadResources,
  removeResources,
  requestSaveResourceTo,
  saveMetadataToTempFolder,
  saveJobSpecToTempFolder,
  getJobSpec,
  removeBundle,
  getFormBundleTree,
  getFormFields,
  deleteForm,
  postFormFields,
  waitUntilPostFormFields,
  startUploadBundle,
  startCreateContent,
  stopCreateContent,
  bundleIsInCreateMode,
  waitStartCreateMode,
  waitStopCreateMode,
  waitUntilBundleCondition,
  postResource,
  copyResources,
  copyMetadata,
  forkBundle,
  updateManifestResource,
  getApplicableWizards,
  getBestWizards,
  getPublicationWizards,
  testPublicationWizards,
  runPublicationWizard,
  checkAllFields,
  updatePublications,
  getPublicationsInstances,
  getSubSectionInstances,
  getSubsystemDownloadQueue,
  getSubsystemUploadQueue,
  getRevisionOrParentRevision,
  getEntryRevisionUrl,
  getMapperOverwrites,
  getTempFolderForFile
};
export default bundleService;

const BUNDLE_API = 'bundle';
const BUNDLE_API_LIST = `${BUNDLE_API}/list`;
const RESOURCE_API = 'resource';
const FORM_API = 'form';
const FORM_BUNDLE_API = `${FORM_API}/bundle`;
const FORM_BUNDLE_API_DELETE = `${FORM_API}/delete`;
const MANIFEST_API = 'manifest';
const DEBUG_API = 'debug';
const PUBLICATION_API = 'publication';
const SUBSYSTEM_API = 'subsystem';

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
    `${dblDotLocalConfigConstants.getHttpDblDotLocalBaseUrl()}/${BUNDLE_API_LIST}`,
    requestOptions
  );
  const apiBundles = await handleResponse(response);
  const bundles = convertBundleApiListToBundles(apiBundles);
  return { bundles, apiBundles };
}

function apiBundleHasMetadata(apiBundle) {
  return apiBundle.metadata;
}

function convertBundleApiListToBundles(apiBundles) {
  const bundles = Object.values(apiBundles)
    .filter(apiBundleHasMetadata)
    .map(apiBundle => convertApiBundleToNathanaelBundle(apiBundle))
    .filter(b => b !== null);
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

function addFileInfo(acc, fileInfoNode) {
  if (fileInfoNode.is_dir || this.isRoot || fileInfoNode.size === undefined) {
    return acc;
  }
  const { path: pathParts } = this;
  const fullKey = pathParts.join('/');
  return { ...acc, [fullKey]: fileInfoNode };
}

function getFlatFileInfo(apiBundle) {
  return traverse(apiBundle.store.file_info).reduce(addFileInfo, {});
}

function getHasStoredResources(apiBundle) {
  // assume the first file to be stored is 'metadata.xml' which is not a resource
  return Object.keys(apiBundle.store.file_info || {}).length > 1;
}

function getResourceFileStoredCount(apiBundle) {
  const storedFiles = getFlatFileInfo(apiBundle);
  const flatFilePaths = Object.keys(storedFiles || {});
  const storedResourcePaths = flatFilePaths.filter(
    storedFilePath => storedFilePath !== 'metadata.xml'
  );
  return { storedResourcePaths, storedFiles };
}

// TODO: make a separate helper for raw/api bundles
function getRawBundleResourcesDetails(rawBundle) {
  const { metadata } = rawBundle;
  return metadata.manifest;
}

function convertApiBundleToNathanaelBundle(apiBundle, lazyLoads = {}) {
  try {
    const { mode, metadata, dbl, upload } = apiBundle;
    const { formsErrorStatus = {} } = lazyLoads;
    const { jobId: uploadJob } = upload || {};
    const { parent } = dbl;
    const bundleId = apiBundle.local_id;
    const initTaskStatus = getInitialTaskAndStatus(apiBundle);
    const { task } = initTaskStatus;
    let { status } = initTaskStatus;
    const { storedResourcePaths, storedFiles } = getResourceFileStoredCount(
      apiBundle
    );
    if (storedResourcePaths.length) {
      if (task === 'DOWNLOAD' && mode === 'store') {
        status = 'COMPLETED'; // even if only some are stored
      }
    }
    const sep = '/';
    const manifestResources = getRawBundleResourcesDetails(apiBundle);
    const manifestResourcePaths = Object.keys(manifestResources) || [];
    return {
      id: bundleId,
      name: metadata.identification.name || '',
      revision: dbl.currentRevision,
      dblId: dbl.id,
      medium: dbl.medium,
      countryIso: Object.keys(metadata.countries).join(sep) || '',
      languageIso: metadata.language.iso || '',
      rightsHolders:
        metadata.agencies
          .filter(a => a.type === 'rightsHolder')
          .map(a => a.abbr)
          .join(sep) || '',
      license: dbl.license || 'owned',
      mode,
      task,
      status,
      uploadJob,
      manifestResources,
      storedFiles,
      storedResourcePaths,
      manifestResourcePaths,
      parent,
      formsErrorStatus,
      raw: apiBundle
    };
  } catch (error) {
    log.error(
      `An error occurred when converting apiBundle ${
        apiBundle.local_id
      } for DBL ${apiBundle.dbl.id}: ${error}`
    );
  }
  return null;
}

async function fetchById(id) {
  const requestOptions = {
    method: 'GET',
    headers: authHeader()
  };
  const response = await fetch(
    `${dblDotLocalConfigConstants.getHttpDblDotLocalBaseUrl()}/${BUNDLE_API}/${id}`,
    requestOptions
  );
  return handleResponse(response, r => r);
}

function create(bundle) {
  const requestOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bundle)
  };

  return fetch(
    `${dblDotLocalConfigConstants.getHttpDblDotLocalBaseUrl()}/${BUNDLE_API}/create`,
    requestOptions
  ).then(handleResponse);
}

function update(bundle) {
  const requestOptions = {
    method: 'PUT',
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(bundle)
  };

  return fetch(`/${BUNDLE_API}/${bundle.id}`, requestOptions).then(
    handleResponse
  );
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

function deleteManifestResource(bundleId, uri) {
  const requestOptions = {
    method: 'POST',
    headers: authHeader()
  };
  const url = `${dblDotLocalConfigConstants.getHttpDblDotLocalBaseUrl()}/${MANIFEST_API}/${bundleId}/delete/${uri}`;
  return fetch(url, requestOptions).then(handleResponse);
}

function getJobSpec(bundleId) {
  const requestOptions = {
    method: 'GET',
    headers: authHeader()
  };
  const url = `${dblDotLocalConfigConstants.getHttpDblDotLocalBaseUrl()}/${DEBUG_API}/${bundleId}/job-spec`;
  return fetch(url, requestOptions).then(handleResponse);
}

/* <downloadResources>
      <resource uri="release/English.lds"/>
 */
function downloadResources(bundleId, uris = []) {
  const urisXml = uris.map(uri => `<resource uri="${uri}"/>`).join('') || '';
  return bundleAddTasks(
    bundleId,
    `<downloadResources>${urisXml}</downloadResources>`
  );
}

/* /subsystem/download/queue */
function getSubsystemDownloadQueue() {
  const requestOptions = {
    method: 'GET',
    headers: authHeader()
  };
  const url = `${dblDotLocalConfigConstants.getHttpDblDotLocalBaseUrl()}/${SUBSYSTEM_API}/download/queue`;
  return fetch(url, requestOptions).then(handleResponse);
}

/* /subsystem/download/queue */
function getSubsystemUploadQueue() {
  const requestOptions = {
    method: 'GET',
    headers: authHeader()
  };
  const url = `${dblDotLocalConfigConstants.getHttpDblDotLocalBaseUrl()}/${SUBSYSTEM_API}/upload/queue`;
  return fetch(url, requestOptions).then(handleResponse);
}

function removeResources(bundleId, pathsToRemove = []) {
  const resourceList = pathsToRemove
    .map(uri => `<resource uri="${uri}"/>`)
    .join('');
  return bundleAddTasks(
    bundleId,
    `<removeLocalResources>${resourceList}</removeLocalResources>`
  );
}

function removeBundle(bundleId) {
  return bundleAddTasks(bundleId, '<deleteBundle/>');
}

function copyResources(bundleId, fromBundleId, uris, merge = true) {
  const resourceList = uris.map(uri => `<resource uri="${uri}"/>`).join('');
  const copyResourcesTask = `<copyResources><fromBundleId>${fromBundleId}</fromBundleId>${resourceList}<merge>${merge}</merge></copyResources>`;
  return bundleAddTasks(bundleId, copyResourcesTask);
}

function copyMetadata(
  bundleId,
  fromBundleId,
  sections,
  preserveExisting = true
) {
  const sectionsList = sections
    .map(section => `<section>${section}</section>`)
    .join('');
  const copyResourcesTask = `<copyMetadata><fromBundleId>${fromBundleId}</fromBundleId>${sectionsList}<preserveExisting>${preserveExisting}</preserveExisting></copyMetadata>`;
  return bundleAddTasks(bundleId, copyResourcesTask);
}

function bundleAddTasks(bundleId, innerTasks) {
  const requestOptions = {
    method: 'POST',
    headers: {
      ...authHeader(),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `xml=<tasks> ${encodeURIComponent(innerTasks)} </tasks>`
  };
  const url = `${dblDotLocalConfigConstants.getHttpDblDotLocalBaseUrl()}/${BUNDLE_API}/${bundleId}/add-tasks`;
  return fetch(url, requestOptions).then(handlePostFormResponse);
}

async function saveMetadataToTempFolder(bundleId) {
  const {
    tmpFolder,
    filePath: metadataFile,
    fileName: metadataXmlResource
  } = getTempFolderForFile(bundleId, 'metadata.xml');
  await requestSaveResourceTo(
    tmpFolder,
    bundleId,
    metadataXmlResource,
    metadataXmlResource
  );
  // NOTE. fs.readFile() is meant to help get around a weird timing issue following
  // downloading the metadata.xml from dbl_dot_local_app api
  // Otherwise subsequent operations (e.g. md5File or opening in browser window)
  // seems to give results for the previous file state.
  const metadataContents = await fs.readFile(metadataFile, 'utf8');
  return { metadataFile, metadataContents };
}

function getTempFolderForFile(bundleId, fileName) {
  const temp = app.getPath('temp');
  const tmpFolder = path.join(temp, bundleId);
  const filePath = path.join(tmpFolder, fileName);
  return {
    temp,
    tmpFolder,
    filePath,
    fileName
  };
}

async function saveJobSpecToTempFolder(bundleId) {
  const { filePath: jobSpecPath } = getTempFolderForFile(
    bundleId,
    'job-spec.xml'
  );
  const url = `${dblDotLocalConfigConstants.getHttpDblDotLocalBaseUrl()}/${DEBUG_API}/${bundleId}/job-spec`;
  await download(url, jobSpecPath, () => {}, authHeader());
  return jobSpecPath;
}

/*
 * Downloader.download('https://download.damieng.com/fonts/original/EnvyCodeR-PR7.zip',
 *  'envy-code-r.zip', (bytes, percent) => console.log(`Downloaded ${bytes} (${percent})`));
 */
function requestSaveResourceTo(
  selectedFolder,
  bundleId,
  uriRelativePath,
  relativeDestinationPath,
  progressCallback = () => {}
) {
  // NOTE: getting resources via /resource-stream/ api can result in
  // getting the earlier version of the cached resource.
  // To avoid this use --disable-http-cache (see https://github.com/electron/electron/issues/1720)
  const url = `${dblDotLocalConfigConstants.getHttpDblDotLocalBaseUrl()}/${BUNDLE_API}/${bundleId}/${RESOURCE_API}-stream/${uriRelativePath}`;
  const targetPath = path.join(selectedFolder, relativeDestinationPath);
  return download(url, targetPath, progressCallback, authHeader());
}

function getFormBundleTree(bundleId) {
  const requestOptions = {
    method: 'GET',
    headers: authHeader()
  };
  const url = `${dblDotLocalConfigConstants.getHttpDblDotLocalBaseUrl()}/${FORM_BUNDLE_API}/${bundleId}`;
  return fetch(url, requestOptions).then(handleResponse);
}

function getFormFields(bundleId, formKey) {
  const requestOptions = {
    method: 'GET',
    headers: authHeader()
  };
  const url = `${dblDotLocalConfigConstants.getHttpDblDotLocalBaseUrl()}/${FORM_API}/${bundleId}${formKey}`;
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
async function waitUntilPostFormFields(
  postFormFieldArgs,
  doStopCreateMode = false
) {
  const { bundleId } = postFormFieldArgs;
  await bundleService.waitStartCreateMode(bundleId);
  try {
    const response = await postFormFields(postFormFieldArgs);
    return response;
  } finally {
    if (doStopCreateMode) {
      await bundleService.waitStopCreateMode(bundleId);
    }
  }
}

function postFormFields({ bundleId, formKey, payload, keyField }) {
  const requestOptions = {
    method: 'POST',
    headers: {
      ...authHeader(),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `response=${encodeURIComponent(JSON.stringify(payload))}`
  };
  const newKeyPath = `/${keyField}`;
  const newInstanceKey =
    keyField && !formKey.endsWith(newKeyPath) ? newKeyPath : '';
  const url = `${dblDotLocalConfigConstants.getHttpDblDotLocalBaseUrl()}/${FORM_API}/${bundleId}${formKey}${newInstanceKey}`;
  return fetch(url, requestOptions).then(handlePostFormResponse);
}

function checkAllFields(bundleId) {
  const requestOptions = {
    method: 'GET',
    headers: authHeader()
  };
  const url = `${dblDotLocalConfigConstants.getHttpDblDotLocalBaseUrl()}/${FORM_API}/check-metadata/${bundleId}`;
  return fetch(url, requestOptions).then(handleResponse);
}

function startUploadBundle(bundleId) {
  return bundleAddTasks(
    bundleId,
    '<findUploadJob/><uploadResources/><submitJobIfComplete><forkAfterUpload>true</forkAfterUpload></submitJobIfComplete>'
  );
}

function deleteForm(bundleId, formKey) {
  const requestOptions = {
    method: 'POST',
    headers: { ...authHeader() }
  };
  const url = `${dblDotLocalConfigConstants.getHttpDblDotLocalBaseUrl()}/${FORM_BUNDLE_API_DELETE}/${bundleId}${formKey}`;
  return fetch(url, requestOptions).then(handlePostFormResponse);
}

function forkBundle(bundleId, medium) {
  const mediumElement = medium ? `<medium>${medium}</medium>` : '';
  return bundleAddTasks(bundleId, `<forkBundle>${mediumElement}</forkBundle>`);
}

function createLabelElement(label, bundleId) {
  const uuid1 = uuidv1();
  const labelElement = label
    ? `<label>${label}-${bundleId}-${uuid1}</label>`
    : '';
  return labelElement;
}

function startCreateContent(bundleId, label) {
  const creator = label ? 'NoOpCreator' : 'AsyncCreator';
  const labelElement = createLabelElement(label, bundleId);
  const tasksCopyResources = label
    ? '<tasks><copyResources><fromBundleLabel>_parent</fromBundleLabel></copyResources></tasks>'
    : '';
  return bundleAddTasks(
    bundleId,
    `<createContent><class>${creator}</class>${labelElement}<data/>
      ${tasksCopyResources}
    </createContent>`
  );
}

async function bundleIsInCreateMode(bundleId) {
  const rawBundleInfo = await bundleService.fetchById(bundleId);
  const isBundleInCreateMode = rawBundleInfo.mode === 'create';
  return isBundleInCreateMode;
}

function getCurrentBundleState(getState, bundleId) {
  const { bundles } = getState();
  const { addedByBundleIds } = bundles;
  return bundleId ? addedByBundleIds[bundleId] : null;
}

async function waitUntilBundleCondition(getState, bundleId, condition) {
  const bundleCurrentState = bundleService.getCurrentBundleState(
    getState,
    bundleId
  );
  await waitUntil(async () => condition(bundleCurrentState), 60000, 500);
  return bundleCurrentState;
}

async function waitStartCreateMode(bundleId) {
  if (!(await bundleIsInCreateMode(bundleId))) {
    await startCreateContent(bundleId);
    await waitUntil(async () => bundleIsInCreateMode(bundleId), 60000, 500);
  }
}

async function waitStopCreateMode(bundleId) {
  if (await bundleIsInCreateMode(bundleId)) {
    // unblock block tasks like 'Delete'
    await stopCreateContent(bundleId);
    await waitUntil(
      async () => !(await bundleIsInCreateMode(bundleId)),
      60000,
      500
    );
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
  const url = `${dblDotLocalConfigConstants.getHttpDblDotLocalBaseUrl()}/${BUNDLE_API}/${bundleId}/creation/stop/${mode}`;
  return fetch(url, requestOptions).then(handlePostFormResponse);
}

function postResource(bundleId, filePath, bundlePath, mapper) {
  const uri = `${dblDotLocalConfigConstants.getHttpDblDotLocalBaseUrl()}/${BUNDLE_API}/${bundleId}/resource/${bundlePath}`;
  const fullUri = bundleHelpers.buildFullUriWithOptionalMapper(uri, mapper);
  log.info(`postResource uri: ${fullUri}`);
  const filename = path.basename(filePath);
  const data = new FormData();
  data.append('content', fs.createReadStream(filePath), filename);
  return got.post(fullUri, {
    headers: { ...authHeader() },
    body: data /* use import FormData from 'form-data' */,
    useElectronNet: false /* has issues https://github.com/sindresorhus/got/issues/315 and see https://github.com/sindresorhus/got/blob/dfb46ad0bf2427f387968f67ac943476597f0a3b/readme.md */
  });
  /*
  // fetch does not support posting files as multipart/form-data
  // https://github.com/electron/electron/issues/9684
  return fetch(fullUri, {
      headers: { ...authHeader() },
      method: 'POST',
      body: data
  });
  */
  /*
  // 'content-type': 'multipart/form-data' // Is set automatically
  const options = {
    method: 'POST',
    uri: fullUri,
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
    }
  };
  return rp(options);
  */
}

function updateManifestResource(bundleId, bundlePath) {
  const requestOptions = {
    method: 'POST',
    headers: { ...authHeader() }
  };
  const url = `${dblDotLocalConfigConstants.getHttpDblDotLocalBaseUrl()}/${MANIFEST_API}/${bundleId}/update/${bundlePath}`;
  return fetch(url, requestOptions).then(handlePostFormResponse);
}

async function getPublicationWizards() {
  const requestOptions = {
    method: 'GET',
    headers: authHeader()
  };
  const response = await fetch(
    `${dblDotLocalConfigConstants.getHttpDblDotLocalBaseUrl()}/${PUBLICATION_API}/wizard`,
    requestOptions
  );
  return handleResponse(response, r => r);
}

async function testPublicationWizards(bundleId, pubId) {
  const requestOptions = {
    method: 'GET',
    headers: authHeader()
  };
  const response = await fetch(
    `${dblDotLocalConfigConstants.getHttpDblDotLocalBaseUrl()}/${PUBLICATION_API}/wizard/${bundleId}/${pubId}`,
    requestOptions
  );
  return handleResponse(response, r => r);
}

function runPublicationWizard(bundleId, pubId, wizardId, containerUri) {
  const requestOptions = {
    method: 'POST',
    headers: { ...authHeader() }
  };
  const parameterizedPath = [bundleId, pubId, wizardId, containerUri]
    .filter(Boolean)
    .join('/');
  const url = `${dblDotLocalConfigConstants.getHttpDblDotLocalBaseUrl()}/${PUBLICATION_API}/wizard/${parameterizedPath}`;
  return fetch(url, requestOptions).then(handlePostFormResponse);
}

async function getApplicableWizards(bundleId, medium) {
  const wizards = await getPublicationWizards();
  const applicableWizards = Object.values(wizards).filter(
    w => w.medium === medium
  );
  return applicableWizards;
}

async function getBestWizards(bundleId, publicationIds) {
  const bestWizards = [];
  /* eslint-disable no-restricted-syntax */
  /* eslint-disable no-await-in-loop */
  for (const pubId of publicationIds) {
    const wizardTestResults = await bundleService.testPublicationWizards(
      bundleId,
      pubId
    );
    const bestWizard = wizardTestResults.reduce(
      (acc, r) => (r.hits.length >= acc.hits.length ? r : acc),
      { hits: [], misses: [] }
    );
    const { wizard, uri } = bestWizard;
    bestWizards.push({
      bundleId,
      pubId,
      wizard,
      uri,
      testResults: bestWizard
    });
  }
  return bestWizards;
}

async function updatePublications(bundleId, publicationIds) {
  const bundleRaw = await fetchById(bundleId);
  const {
    dbl: { medium }
  } = bundleRaw;
  const applicableWizards = await getApplicableWizards(bundleId, medium);
  if (applicableWizards.length === 0) {
    log.info(
      `Publications not updated. No publication wizards were found for medium ${medium}`
    );
    return;
  }
  /* eslint-disable no-restricted-syntax */
  /* eslint-disable no-await-in-loop */
  const bestWizards = await getBestWizards(bundleId, publicationIds);
  for (const bestWizard of bestWizards) {
    const { wizard, uri, pubId, testResults } = bestWizard;
    if (!wizard) {
      log.info(
        `Publication ${pubId} not updated. No publication wizard hits were found in these tests:`
      );
      log.info(testResults);
    } else {
      await bundleService.runPublicationWizard(bundleId, pubId, wizard, uri);
      log.info(
        `Publication ${pubId} was updated by wizard ${wizard} for uri ${uri}`
      );
      log.info(bestWizard);
    }
  }
}

/* /bundle/<local_id>/mapper/input/overwrites (POST) */
async function getMapperOverwrites(bundleId, direction, mappers, uris) {
  const requestOptions = {
    method: 'POST',
    headers: {
      ...authHeader(),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `uris=${encodeURIComponent(
      JSON.stringify(uris)
    )}&mappers=${encodeURIComponent(JSON.stringify(mappers))}`
  };
  try {
    const response = await fetch(
      `${dblDotLocalConfigConstants.getHttpDblDotLocalBaseUrl()}/${BUNDLE_API}/${bundleId}/mapper/${direction}/overwrites`,
      requestOptions
    );
    return servicesHelpers.handleResponseAsReadable(response).json();
  } catch (error) {
    const err = servicesHelpers.handleResponseAsReadable(error).text();
    log.error(err);
  }
}

/* HELPERS? */
function getPublicationsInstances(formStructure) {
  return getSubSectionInstances(formStructure, 'publications', 'publication');
}

function getSubSectionInstances(formStructure, sectionId, subSectionId) {
  const sectionStructure = formStructure.find(
    section => section.id === sectionId
  );
  const { contains } = sectionStructure;
  const subSectionStructure = contains.find(
    section => section.id === subSectionId
  );
  const { instances } = subSectionStructure;
  return instances;
}

function getRevisionOrParentRevision(dblId, revision, parent) {
  return (
    parseInt(revision, 10) ||
    parseInt(parent && parent.dblId === dblId ? parent.revision : 0, 10)
  );
}

function getEntryRevisionUrl(dblBaseUrl, bundle) {
  if (!bundle) {
    return '';
  }
  const { dblId, revision, parent } = bundle;
  const revisionNum = getRevisionOrParentRevision(dblId, revision, parent);
  const revisionQuery = revisionNum ? `&revision=${revisionNum}` : '';
  const url = `${dblBaseUrl}/entry?id=${dblId}${revisionQuery}`;
  return url;
}
