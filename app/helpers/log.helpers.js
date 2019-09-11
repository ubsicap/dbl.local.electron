import log from 'electron-log';
import path from 'path';

export const logHelpers = {
  setupLogFile
};
export default logHelpers;

/*
 * from https://github.com/megahertz/electron-log
 * on Linux: ~/.config/<app name>/log.log
 * on OS X: ~/Library/Logs/<app name>/log.log
 * on Windows: %USERPROFILE%\AppData\Roaming\<app name>\log.log
 */
function setupLogFile(dirname, fileLevel = 'debug', consoleLevel = 'error') {
  log.transports.console.level = consoleLevel;
  if (process.env.NODE_ENV === 'development') {
    log.transports.file.level = fileLevel;
    log.transports.file.file = path.join(dirname, 'log-dev.txt');
  } else {
    log.transports.file.level = fileLevel;
  }
  log.catchErrors({});
  log.info(`Log file: ${log.transports.file.file}`);
}
