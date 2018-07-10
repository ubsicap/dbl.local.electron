import path from 'path';
import { authHeader } from '../helpers';
import { utilities } from '../utils/utilities';
import { dblDotLocalConfig } from '../constants/dblDotLocal.constants';
import download from './download-with-fetch.flow';

export const bundleService = {
  create,
  fetchAll,
  fetchById,
  update,
  convertApiBundleToNathanaelBundle,
  getManifestResourcePaths,
  downloadResources,
  removeResources,
  getResourcePaths,
  requestSaveResourceTo,
  delete: removeBundle,
  getFormBundleTree,
  getFormFields,
  postFormFields,
  startUploadBundle
};
export default bundleService;

const BUNDLE_API = 'bundle';
const BUNDLE_API_LIST = `${BUNDLE_API}/list`;
const RESOURCE_API = 'resource';
const RESOURCE_API_LIST = RESOURCE_API;
const FORM_API = 'form';
const FORM_BUNDLE_API = `${FORM_API}/bundle`;
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
  return bundles;
}

function convertBundleApiListToBundles(apiBundles) {
  const bundles = Promise.all(Object.values(apiBundles)
    .filter(apiBundle => apiBundle.metadata)
    .map(convertApiBundleToNathanaelBundle));
  return bundles;
}

async function convertApiBundleToNathanaelBundle(apiBundle) {
  const {
    mode, metadata, dbl
  } = apiBundle;
  const bundleId = apiBundle.local_id;
  let task = dbl.currentRevision === '0' ? 'UPLOAD' : 'DOWNLOAD';
  let status = dbl.currentRevision === '0' ? 'DRAFT' : 'NOT_STARTED';
  if (mode === 'download') {
    task = 'DOWNLOAD';
    status = 'IN_PROGRESS';
  } if (mode === 'upload') {
    task = 'UPLOAD';
    status = 'IN_PROGRESS';
  } else if (mode === 'store' && task === 'DOWNLOAD') {
    // compare the manifest and resources to determine whether user can download more or not.
    const manifestPaths = await getManifestResourcePaths(bundleId);
    const resourcePaths = await getResourcePaths(bundleId);
    if (utilities.areEqualArrays(manifestPaths, resourcePaths)) {
      status = 'COMPLETED';
    } else {
      status = 'NOT_STARTED';
    }
    // btw. it's possible that it could be in the process of REMOVE_RESOURCES,
    // but that's typically going to be so fast
    // we can probably just display it as ready to download.
  }
  return {
    id: bundleId,
    name: metadata.name,
    revision: dbl.currentRevision,
    dblId: dbl.id,
    medium: dbl.medium,
    countryIso: metadata.countries || "",
    languageIso: metadata.language,
    task,
    status
  };
}

function fetchById(id) {
  const requestOptions = {
    method: 'GET',
    headers: authHeader()
  };
  return fetch(
    `${dblDotLocalConfig.getHttpDblDotLocalBaseUrl()}/${BUNDLE_API}/${id}`,
    requestOptions
  ).then(handleResponse);
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

// prefixed function name with underscore because delete is a reserved word in javascript
function removeBundle(id) {
  const requestOptions = {
    method: 'DELETE',
    headers: authHeader()
  };

  return fetch(`/${BUNDLE_API}/${id}`, requestOptions).then(handleResponse);
}

function handleResponse(response) {
  if (!response.ok) {
    return Promise.reject(response.statusText);
  }

  return response.json();
}

function handlePostFormResponse(response) {
  if (!response.ok) {
    return Promise.reject(response);
  }
  return response.text();
}

function handleTextResponse(response) {
  if (!response.ok) {
    return Promise.reject(response.statusText);
  }

  return response.text();
}

function getManifestResourcePaths(bundleId) {
  const requestOptions = {
    method: 'GET',
    headers: authHeader()
  };
  const url = `${dblDotLocalConfig.getHttpDblDotLocalBaseUrl()}/${BUNDLE_API}/${bundleId}/manifest-resource`;
  return fetch(url, requestOptions).then(handleResponse);
}

function downloadResources(bundleId) {
  return bundleAddTasks(bundleId, '<downloadResources/>');
}

function removeResources(bundleId) {
  return bundleAddTasks(bundleId, '<removeLocalResources/>');
}

function bundleAddTasks(bundleId, innerTasks) {
  const requestOptions = {
    method: 'POST',
    headers: { ...authHeader(), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `xml=<tasks> ${innerTasks} </tasks>`
  };
  const url = `${dblDotLocalConfig.getHttpDblDotLocalBaseUrl()}/${BUNDLE_API}/${bundleId}/add-tasks`;
  return fetch(url, requestOptions).then(handleTextResponse);
}

function getResourcePaths(bundleId) {
  const requestOptions = {
    method: 'GET',
    headers: authHeader()
  };
  const url = `${dblDotLocalConfig.getHttpDblDotLocalBaseUrl()}/${BUNDLE_API}/${bundleId}/${RESOURCE_API_LIST}`;
  return fetch(url, requestOptions).then(handleResponse);
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
function postFormFields(bundleId, formKey, payload) {
  const requestOptions = {
    method: 'POST',
    headers: { ...authHeader(), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `response=${JSON.stringify(payload)}`
  };
  const url = `${dblDotLocalConfig.getHttpDblDotLocalBaseUrl()}/${FORM_API}/${bundleId}${formKey}`;
  return fetch(url, requestOptions).then(handlePostFormResponse);
}

function startUploadBundle(bundleId) {
  return bundleAddTasks(bundleId, '<createUploadJob/><uploadResources/><submitJobIfComplete/>');
}
