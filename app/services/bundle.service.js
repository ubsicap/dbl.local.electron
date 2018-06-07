import path from 'path';
import { authHeader } from '../helpers';
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
  delete: removeBundle
};
export default bundleService;

const BUNDLE_API = 'bundle';
const BUNDLE_API_LIST = `${BUNDLE_API}/list`;
const BUNDLE_API_COUNT = `${BUNDLE_API}/count`;
const RESOURCE_API = 'resource';
const RESOURCE_API_LIST = RESOURCE_API;
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

/* from https://stackoverflow.com/a/19746771 */
function areEqualArrays(a1, a2) {
  return a1.length === a2.length && a1.every((v, i) => v === a2[i]);
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
    if (areEqualArrays(manifestPaths, resourcePaths)) {
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
