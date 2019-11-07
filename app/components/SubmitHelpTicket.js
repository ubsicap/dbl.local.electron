import log from 'electron-log';
import got from 'got';
import FormData from 'form-data';
import fs from 'fs-extra';
import path from 'path';
import upath from 'upath';
import { Youtrack } from 'youtrack-rest-client';
import Button from '@material-ui/core/Button';
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
import templateContent from './SubmitHelpTicket/help-ticket-template';
import './md-example/index.css';
import { servicesHelpers } from '../helpers/services';
import MenuAppBar from './MenuAppBar';
import { logHelpers } from '../helpers/log.helpers';

const config = {
  baseUrl: 'https://paratext.myjetbrains.com/youtrack',
  token: process.env.DBL_YOUTRACK_API_TOKEN
};
const youtrack = new Youtrack(config);

const DBL_PROJECT_ID = '0-30';

function getAttachmentsForm() {
  const logPath = log.transports.file.file;
  const errorLogPath = logHelpers.getErrorLogPath();
  const data = new FormData();
  data.append('log', fs.createReadStream(logPath), path.basename(logPath));
  data.append(
    'error-log',
    fs.createReadStream(errorLogPath),
    path.basename(errorLogPath)
  );
  // log.old.log
  // error-log.log.1
  // for WORKSPACE context
  // config.xml
  // userSettings.json
  // for ENTRY context
  // metadata.xml
  // bundle_status.xml
  // job_spec.xml
  return data;
}

async function postAttachmentsToIssue(issue) {
  const data = getAttachmentsForm();
  await got.post(`${config.baseUrl}/api/issues/${issue.id}/attachments`, {
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: 'application/json'
    },
    query: { fields: 'id,idReadable,summary,name' },
    body: data /* use import FormData from 'form-data' */,
    useElectronNet: false /* has issues https://github.com/sindresorhus/got/issues/315 and see https://github.com/sindresorhus/got/blob/dfb46ad0bf2427f387968f67ac943476597f0a3b/readme.md */
  });
}

export default class SubmitHelpTicket extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      title: '',
      description: templateContent
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

  mdEditor = null;

  mdParser = null;

  handleEditorChange = ({ text }) => {
    this.setState({ description: text });
    // console.log('handleEditorChange', text);
  };

  handleImageUpload = (file, callback) => {
    const reader = new FileReader();
    reader.onload = () => {
      /*
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
      */
      setTimeout(() => {
        // C:/Users/PyleE/Pictures/audio%20listing.jpg
        // reader.result; // base64
        const u = new URL(`file:///${upath.normalize(file.path)}`);
        const urlPath = u.href.replace('file://', '');
        callback(urlPath);
      }, 1000);
    };
    reader.readAsDataURL(file);
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

  handleClickSendFeedback = async () => {
    const { title, description } = this.state;
    try {
      // create a new issue
      const issue = await youtrack.issues.create({
        summary: title,
        description,
        project: {
          id: DBL_PROJECT_ID
        },
        usesMarkdown: true
      });
      // try to upload attachment
      await postAttachmentsToIssue(issue);
      const currentWindow = servicesHelpers.getCurrentWindow();
      currentWindow.close();
    } catch (error) {
      log.error(error);
    }
  };

  render() {
    const { title } = this.state;
    return (
      <React.Fragment>
        <MenuAppBar title="Give feedback">
          <div>
            <Button
              color="inherit"
              onClick={this.handleClickSendFeedback}
              disabled={title.trim().length < 3}
            >
              Send
            </Button>
          </div>
        </MenuAppBar>
        <div
          className="demo-wrap"
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
              value={templateContent}
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
