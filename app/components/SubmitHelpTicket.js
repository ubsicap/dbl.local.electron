import { compose } from 'recompose';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import log from 'electron-log';
import got from 'got';
import FormData from 'form-data';
import fs from 'fs-extra';
import path from 'path';
import uuidv1 from 'uuid/v1';
import CloudUpload from '@material-ui/icons/CloudUpload';
import CircularProgress from '@material-ui/core/CircularProgress';
import { Youtrack } from 'youtrack-rest-client';
import TextField from '@material-ui/core/TextField';
import React from 'react';
import MdEditor from 'react-markdown-editor-lite';
import MarkdownIt from 'markdown-it';
import emoji from 'markdown-it-emoji';
import subscript from 'markdown-it-sub';
import superscript from 'markdown-it-sup';
import footnote from 'markdown-it-footnote';
import deflist from 'markdown-it-deflist';
import abbreviation from 'markdown-it-abbr';
import insert from 'markdown-it-ins';
import mark from 'markdown-it-mark';
import tasklists from 'markdown-it-task-lists';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-light.css';
import { helpTicketTemplateServices } from './SubmitHelpTicket/help-ticket-template';
import './SubmitHelpTicket/index.css';
import { servicesHelpers } from '../helpers/services';
import MenuAppBar from './MenuAppBar';
import { logHelpers } from '../helpers/log.helpers';
import { utilities } from '../utils/utilities';
import { ux } from '../utils/ux';
import ConfirmButton from './ConfirmButton';
import { ipcRendererConstants } from '../constants/ipcRenderer.constants';
import { userActions } from '../actions/user.actions';
import { bundleService } from '../services/bundle.service';
import { workspaceHelpers } from '../helpers/workspaces.helpers';

const { ipcRenderer } = require('electron');

const materialStyles = theme => ({
  ...ux.getEntryUxStyles(theme)
});

type Props = {
  classes: {},
  dispatchLoginSuccess: () => {}
};

const mapDispatchToProps = {
  dispatchLoginSuccess: userActions.loginSuccess
};

const config = {
  baseUrl: 'https://paratext.myjetbrains.com/youtrack',
  token: process.env.DBL_YOUTRACK_API_TOKEN
};
const youtrack = new Youtrack(config);

const DBL_PROJECT_ID = '0-30';

/* eslint-disable-next-line no-useless-escape */
const linkPattern = /!*\[(?<alttext>[^\]]*?)\]\((?<filename>.*?) *(?=\"|\))(?<optionalpart>\".*\")?\)/gm;

function getMarkDownLocalFileLinkMatches(markdown) {
  // ![](/C:/Users/PyleE/Pictures/audio%20listing.jpg)
  const linkMatches = [];
  const links = [];
  let match = linkPattern.exec(markdown);
  while (match != null) {
    // matched text: match[0]
    // match start: match.index
    // capturing group n: match[n]
    const { filename } = match.groups;
    const decodedFilename = decodeURIComponent(filename);
    if (fs.existsSync(decodedFilename)) {
      // file exists
      linkMatches.push({ ...match });
      links.push(decodedFilename);
    }
    match = linkPattern.exec(markdown);
  }
  console.log(links);
  return { linkMatches, links }; // utilities.distinct(links)
}

async function appendOldLog(attachments, logPathObj, oldLogName) {
  const logOldLogPath = path.join(logPathObj.dir, oldLogName);
  if (await fs.exists(logOldLogPath)) {
    attachments.push(logOldLogPath);
  }
}

async function getStandardAttachments() {
  const attachments = [];
  const logPath = log.transports.file.file;
  const errorLogPath = logHelpers.getErrorLogPath();
  attachments.push(logPath, errorLogPath);
  const logPathObj = path.parse(logPath);
  await appendOldLog(
    attachments,
    logPathObj,
    `${logPathObj.name}.old${logPathObj.ext}`
  );
  const errorLogPathObj = path.parse(errorLogPath);
  await appendOldLog(attachments, errorLogPathObj, `${errorLogPathObj.base}.1`);
  return attachments.map(utilities.normalizeLinkPath);
}

async function getAttachmentsForm(markdown) {
  // for WORKSPACE context
  // config.xml
  // userSettings.json
  // for ENTRY context
  // metadata.xml
  // bundle_status.xml
  // job_spec.xml
  const { links } = getMarkDownLocalFileLinkMatches(markdown);
  const data = new FormData();
  const distinctFilePaths = utilities.distinct(links);
  distinctFilePaths.forEach(imageFile => {
    const filename = path.basename(imageFile);
    data.append(filename, fs.createReadStream(imageFile), filename);
  });
  return data;
}

/*
0: "![](C:/Users/PyleE/Pictures/audio%20listing.jpg)"
1: "C:/Users/PyleE/Pictures/audio%20listing.jpg"
2: undefined
groups:
  filename: "C:/Users/PyleE/Pictures/audio%20listing.jpg"
  optionalpart: undefined
index: 21
input: "## Expected Behavior↵![](C:/Users/PyleE/Pictures/audio%20listing.jpg)↵<!--- If you're describing a bug, tell us what should happen -->↵<!--- If you're suggesting a change/improvement, tell us how it should work -->↵↵## Current Behavior↵↵<!--- If describing a bug, tell us what happens instead of the expected behavior -->↵<!--- If suggesting a change/improvement, explain the difference from current behavior -->↵↵## Possible Solution↵↵<!--- Not obligatory, but suggest a fix/reason for the bug, -->↵<!--- or ideas how to implement the addition or change -->↵↵## Steps to Reproduce (for bugs)↵↵<!--- Provide a video GIF screenshot, or an unambiguous set of steps to -->↵<!--- reproduce this bug. -->↵↵1.↵↵2.↵↵3.↵↵4.↵↵↵## DBL Role↵↵<!--- What DBL role were your trying to perform (archivist/publisher)? -->↵↵## DBL Entry/Revision/Draft↵↵<!--- Which DBL entry did you encounter your issue? (provide link to entry page or Entry ID) -->↵<!--- Which Entry revision were you working with? -->↵↵## Context↵↵<!--- How has this issue affected you? What are you trying to accomplish? -->↵<!--- Providing context helps us come up with a solution that is most useful in the real world -->↵↵## Your Environment↵↵<!--- Include as many relevant details about the environment you experienced the bug in -->↵↵- Nathanael Version :↵- Operating System and version :↵↵↵"
length: 3
__proto__: Array(0
*/

function getImgOrLinkPart(decodedFilename) {
  const isImage = ['.jpg', '.png', '.gif'].includes(
    path.extname(decodedFilename)
  );
  return isImage ? '!' : '';
}

function replaceEmptyAltTextWithFileName(
  match,
  alttext,
  filename,
  optionalpart /* , offset, str */
) {
  if (!alttext) {
    const decodedFilename = decodeURIComponent(path.basename(filename));
    const quotedOptionalpart = `${optionalpart ||
      `"${utilities.convertUrlToLocalPath(filename)}"`}`;
    const imgOrLinkPart = getImgOrLinkPart(decodedFilename);
    return `${imgOrLinkPart}[${decodedFilename}](${filename} ${quotedOptionalpart})`;
  }
  return match;
}

function replaceFilePathsWithFileNames(
  match,
  alttext,
  filename
  /* , optionalpart, offset, str */
) {
  if (filename.search('/') === -1 || filename.includes('://')) {
    return match;
  }
  const decodedFilename = decodeURIComponent(path.basename(filename));
  const imgOrLinkPart = getImgOrLinkPart(decodedFilename);
  const quotedOptionalpartOrNot = imgOrLinkPart ? ` "${decodedFilename}"` : '';
  return `${imgOrLinkPart}[${alttext}](${decodedFilename}${quotedOptionalpartOrNot})`;
}

async function postAttachmentsToIssue(
  issue,
  markdown,
  handleProgress,
  handleError
) {
  const data = await getAttachmentsForm(markdown);
  return got
    .post(`${config.baseUrl}/api/issues/${issue.id}/attachments`, {
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/json'
      },
      query: { fields: 'id,idReadable,summary,name' },
      body: data /* use import FormData from 'form-data' */,
      useElectronNet: false /* has issues https://github.com/sindresorhus/got/issues/315 and see https://github.com/sindresorhus/got/blob/dfb46ad0bf2427f387968f67ac943476597f0a3b/readme.md */
    })
    .on('uploadProgress', handleProgress)
    .on('error', handleError);
}

class SubmitHelpTicket extends React.Component<Props> {
  props: Props;

  constructor(props) {
    super(props);
    this.state = {
      title: '',
      description: ''
    };
    // initial a parser;
    this.mdParser = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
      highlight: (str, lang) => {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(lang, str).value;
          } catch (__) {
            // catch all?
          }
        }
        return ''; // use external default escaping;
      }
    })
      .use(emoji)
      .use(subscript)
      .use(superscript)
      .use(footnote)
      .use(deflist)
      .use(abbreviation)
      .use(insert)
      .use(mark)
      .use(tasklists, { enabled: this.taskLists });
  }

  async componentWillMount() {
    ipcRenderer.on(
      ipcRendererConstants.KEY_IPC_ATTACH_APP_STATE_SNAPSHOT,
      async (event, appState) => {
        const { dispatchLoginSuccess } = this.props;
        console.log(appState);
        const app = servicesHelpers.getApp();
        const tempPath = app.getPath('temp');
        const uuid1 = uuidv1();
        const uid = uuid1.substr(0, 5);
        const appStateFilePath = utilities.normalizeLinkPath(
          path.join(tempPath, `appState-${uid}.json`)
        );
        console.log(appStateFilePath);
        await fs.writeFile(appStateFilePath, JSON.stringify(appState, null, 4));
        const {
          authentication,
          router,
          navigation,
          bundles,
          dblDotLocalConfig
        } = appState;
        const { workspaceFullPath, workspaceName: workspace } =
          workspaceHelpers.getCurrentWorkspaceFullPath(appState) || {};
        const { user, whoami, workspaceName = workspace } = authentication;
        dispatchLoginSuccess(user, whoami, workspaceName);
        const { display_name: userName, email: userEmail } = whoami || {};
        const configXmlPath = workspaceFullPath
          ? path.join(workspaceFullPath, 'config.xml')
          : undefined;
        const workspaceAttachments = workspaceFullPath
          ? [configXmlPath].map(utilities.normalizeLinkPath)
          : [];
        const { addedByBundleIds = {} } = bundles;
        const { bundle: bundleId } = navigation.slice(-1).pop() || {};
        const bundleStatusPath = bundleId
          ? path.join(
              workspaceFullPath,
              'bundles',
              bundleId,
              'bundle_status.xml'
            )
          : undefined;
        const jobSpecPath = bundleId
          ? path.join(workspaceFullPath, 'bundles', bundleId, 'job_spec.xml')
          : undefined;
        const metadataXmlPath = bundleId
          ? path.join(
              workspaceFullPath,
              'bundles',
              bundleId,
              'storer',
              'metadata.xml'
            )
          : undefined;
        const bundleAttachments = bundleId
          ? [bundleStatusPath, jobSpecPath, metadataXmlPath].map(
              utilities.normalizeLinkPath
            )
          : [];
        const activeBundle = bundleId ? addedByBundleIds[bundleId] : null;
        const { displayAs = {} } = activeBundle || {};
        const { dblBaseUrl } = dblDotLocalConfig;
        const entryRevisionUrl = bundleService.getEntryRevisionUrl(
          dblBaseUrl,
          activeBundle
        );
        const attachments = await getStandardAttachments();
        const description = helpTicketTemplateServices.getTemplate({
          userName,
          userEmail,
          workspaceName,
          router,
          bundleInfo: {
            bundleId,
            ...displayAs,
            entryRevisionUrl
          },
          attachments: [
            ...attachments,
            appStateFilePath,
            ...workspaceAttachments,
            ...bundleAttachments
          ]
        });
        this.setState({ description, appStateFilePath });
      }
    );
  }

  mdEditor = null;

  mdParser = null;

  handleEditorChange = ({ text }) => {
    this.setState({
      description: text.replace(linkPattern, replaceEmptyAltTextWithFileName)
    });
    // console.log('handleEditorChange', text);
  };

  handleImageUpload = (file, callback) => {
    /*
    const reader = new FileReader();
    reader.onload = () => {
      const convertBase64UrlToBlob = urlData => {
        const arr = urlData.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n) {
          u8arr[n] = bstr.charCodeAt(n);
          n += 1;
        }
        return new Blob([u8arr], { type: mime });
      };
      const blob = convertBase64UrlToBlob(reader.result);
      setTimeout(() => {
        // C:/Users/PyleE/Pictures/audio%20listing.jpg
        // reader.result; // base64
        const u = new URL(`file://${upath.normalize(file.path)}`);
        const urlPath = u.href.replace('file://', '');
        const osUrlPath = process.platform === "win32" ? urlPath.substr(1) : urlPath;
        callback(osUrlPath);
      }, 1000);
    };
    reader.readAsDataURL(file);
    */
    const urlPath = utilities.normalizeLinkPath(file.path);
    callback(urlPath);
  };

  handleGetMdValue = () => {
    if (this.mdEditor) {
      /* eslint-disable no-alert */
      alert(this.mdEditor.getMdValue());
    }
  };

  handleGetHtmlValue = () => {
    if (this.mdEditor) {
      /* eslint-disable no-alert */
      alert(this.mdEditor.getHtmlValue());
    }
  };

  handleTitleInputChange = event => {
    const { target } = event;
    const { value } = target;
    this.setState({ title: value });
  };

  handleProgress = progress => {
    // Report upload progress
    const isUploading = progress.transferred < progress.total;
    this.setState({ isUploading });
  };

  handleError = (/* error, body, response */) => {
    this.setState({ isUploading: false });
  };

  handleClickSendFeedback = async () => {
    const { title, description } = this.state;
    try {
      // create a new issue
      const issue = await youtrack.issues.create({
        summary: title,
        description: description.replace(
          linkPattern,
          replaceFilePathsWithFileNames
        ),
        project: {
          id: DBL_PROJECT_ID
        },
        usesMarkdown: true
      });
      // try to upload attachment
      await postAttachmentsToIssue(
        issue,
        description,
        this.handleProgress,
        this.handleError
      );
      const { appStateFilePath } = this.state;
      if (await fs.exists(appStateFilePath)) {
        await fs.remove(appStateFilePath);
      }
      const currentWindow = servicesHelpers.getCurrentWindow();
      currentWindow.close();
    } catch (error) {
      log.error(error);
    }
  };

  render() {
    const { title, description, isUploading } = this.state;
    const { classes } = this.props;
    return (
      <React.Fragment>
        <MenuAppBar title="Give feedback">
          <div>
            <ConfirmButton
              key="btnSend"
              color="inherit"
              classes={classes}
              onClick={this.handleClickSendFeedback}
              disabled={title.trim().length < 3 || isUploading}
            >
              <CloudUpload style={{ marginRight: '10px' }} />
              Send
              {isUploading && (
                <CircularProgress
                  className={classes.buttonProgress}
                  size={50}
                  color="secondary"
                  variant="indeterminate"
                />
              )}
            </ConfirmButton>
          </div>
        </MenuAppBar>
        <div
          className="mdeditor"
          style={{
            paddingRight: '20px',
            paddingLeft: '20px',
            paddingTop: '10px'
          }}
        >
          <nav className="nav">
            <TextField
              required
              id="title"
              fullWidth
              /* className={classes.textField} */
              label="Title"
              margin="normal"
              variant="outlined"
              placeholder="Provide a general summary of the issue"
              onChange={this.handleTitleInputChange}
            />
            {/*
            <button onClick={this.handleGetMdValue} >getMdValue</button>
            <button onClick={this.handleGetHtmlValue} >getHtmlValue</button>
            */}
          </nav>
          <div className="editor-wrap" style={{ marginTop: '30px' }}>
            <MdEditor
              ref={node => {
                this.mdEditor = node;
              }}
              value={description}
              style={{ height: '500px', width: '100%' }}
              renderHTML={text => this.mdParser.render(text)}
              config={{
                view: {
                  menu: true,
                  md: true,
                  html: true
                },
                table: {
                  maxRow: 5,
                  maxCol: 6
                }
              }}
              onChange={this.handleEditorChange}
              onImageUpload={this.handleImageUpload}
            />
          </div>
          {/* <div style={{marginTop: '30px'}}>
            <MdEditor;
              value={MOCK_DATA}
              style={{height: '200px', width: '100%'}}
              config={{
                view: {
                  menu: true,
                  md: true,
                  html: true
                },
                imageUrl: 'https://octodex.github.com/images/minion.png';
              }}
              onChange={this.handleEditorChange}
            />
          </div> */}
        </div>
      </React.Fragment>
    );
  }
}

export default compose(
  withStyles(materialStyles, { withTheme: true }),
  connect(
    null,
    mapDispatchToProps
  )
)(SubmitHelpTicket);
