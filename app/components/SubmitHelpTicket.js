import upath from 'upath';
import TextField from '@material-ui/core/TextField';
import React from 'react';
// import ReactDOM from 'react-dom';
import MdEditor from 'react-markdown-editor-lite';
// import MdEditor from '../lib/index.js';
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
// import 'highlight.js/styles/github.css';
// import content from './content.js';
import content from './SubmitHelpTicket/help-ticket-template';
import './md-example/index.css';

const MOCK_DATA = content;

export default class SubmitHelpTicket extends React.Component {

  mdEditor = null;

  mdParser = null;

  constructor(props) {
    super(props);
    // initial a parser;
    this.mdParser = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
      highlight: function (str, lang) {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(lang, str).value;
          } catch (__) {}
        };
        return '' // use external default escaping;
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

  handleEditorChange = ({ html, text }) => {
    // console.log('handleEditorChange', text);
  };

  handleImageUpload = (file, callback) => {
    const reader = new FileReader();
    reader.onload = () => {
      const convertBase64UrlToBlob = (urlData) => {
        let arr = urlData.split(','), mime = arr[0].match(/:(.*?);/)[1];
        let bstr = atob(arr[1]);
        let n = bstr.length;
        let u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
      };
      const blob = convertBase64UrlToBlob(reader.result);
      setTimeout(() => {
        // setTimeout 模拟oss异步上传图片;
        // 当oss异步上传获取图片地址后，执行calback回调（参数为imageUrl字符串），即可将图片地址写入markdown;
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
      alert(this.mdEditor.getMdValue());
    }
  };

  handleGetHtmlValue = () => {
    if (this.mdEditor) {
      alert(this.mdEditor.getHtmlValue());
    }
  };

  render() {
    return (
      <div className="demo-wrap" style={{ paddingRight: '20px', paddingLeft: '20px', paddingTop: '10px' }}>
        <h3>Report a Problem</h3>
        <nav className="nav">
          <TextField
            id="title"
            fullWidth
            /* className={classes.textField} */
            label="Title"
            margin="normal"
            variant="outlined"
            placeholder="Provide a general summary of the issue"
          />
          {/*
          <button onClick={this.handleGetMdValue} >getMdValue</button>
          <button onClick={this.handleGetHtmlValue} >getHtmlValue</button>
          */}
        </nav>
        <div className="editor-wrap" style={{ marginTop: '30px' }}>
          <MdEditor
            ref={node => this.mdEditor = node}
            value={MOCK_DATA}
            style={{ height: '500px', width: '100%' }}
            renderHTML={(text) => this.mdParser.render(text)}
            config={{
              view: {
                menu: true,
                md: true,
                html: true
              },
              table: {
                maxRow: 5,
                maxCol: 6
              },
              imageUrl: 'https://octodex.github.com/images/minion.png',
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
    );
  };
};

/*;
ReactDOM.render(
  <Demo />,
  document.getElementById('root');
);
*/
