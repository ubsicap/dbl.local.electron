import log from 'electron-log';
import path from 'path';
import log4js from 'log4js';
import { browserWindowService } from '../services/browserWindow.service';
import dblDotLocalConstants from '../constants/dblDotLocal.constants';

export const logHelpers = {
  setupLogFile,
  getErrorLogPath,
  setupRendererErrorLogs,
  openErrorLogWindow,
  openLogWindow
};
export default logHelpers;

/*
 * from https://github.com/megahertz/electron-log
 * on Linux: ~/.config/<app name>/log.log
 * on OS X: ~/Library/Logs/<app name>/log.log
 * on Windows: %USERPROFILE%\AppData\Roaming\<app name>\log.log
 */
function setupLogFile(
  dirname,
  fileLevel = 'debug',
  consoleLevel = 'error',
  hooks: () => {} = undefined,
  catchErrorOptions = {}
) {
  log.transports.console.level = consoleLevel;
  if (process.env.NODE_ENV === 'development') {
    log.transports.file.level = fileLevel;
    log.transports.file.file = path.join(dirname, 'log-dev.txt');
  } else {
    log.transports.file.level = fileLevel;
  }
  if (hooks) {
    log.hooks.push(hooks);
  }
  log.catchErrors(catchErrorOptions);
  log.info(`Log file: ${log.transports.file.file}`);
}

function getErrorLogPath() {
  const errorLogFilename = `error-${path.basename(log.transports.file.file)}`;
  const errorLogPath = path.join(
    path.dirname(log.transports.file.file),
    errorLogFilename
  );
  return errorLogPath;
}

function setupRendererErrorLogs() {
  logHelpers.setupLogFile(__dirname, 'debug', 'debug', errorHook);
  const errorLogPath = getErrorLogPath();
  const generalAppenderId = 'NAT';
  const ddlAppenderId = 'DDL';

  log4js.configure({
    appenders: {
      [generalAppenderId]: { type: 'file', filename: errorLogPath },
      [ddlAppenderId]: { type: 'file', filename: errorLogPath }
    },
    categories: {
      default: { appenders: [generalAppenderId, ddlAppenderId], level: 'error' }
    }
  });

  const generalErrorLogger = log4js.getLogger(generalAppenderId);
  const ddlErrorLogger = log4js.getLogger(ddlAppenderId);

  function errorHook(msg, transport) {
    if (transport !== log.transports.file || msg.level !== 'error') {
      return msg;
    }
    const msgData = msg.data[0];
    if (
      typeof msgData === 'string' &&
      msgData.startsWith(`${dblDotLocalConstants.DDL_APP_LOG_PREFIX}`)
    ) {
      ddlErrorLogger.error(msgData);
    } else {
      generalErrorLogger.error(msgData);
    }
    return msg;
  }
}

function openErrorLogWindow(errorLogPath) {
  openLogWindow(errorLogPath, { backgroundColor: '#FFBABA' }, 'body{ color: #cc0000; }');
}

function openLogWindow(logPath, options, css) {
  const browserWin = browserWindowService.openFileInChromeBrowser(
    logPath,
    true,
    undefined,
    options
  );
  browserWin.webContents.on('did-finish-load', async function() {
    if (css) {
      browserWin.webContents.insertCSS('body{ color: #cc0000; }');
    }
    await browserWin.webContents.executeJavaScript('window.scrollTo(0,document.body.scrollHeight);');
  });
}
