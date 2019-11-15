import log from 'electron-log';
import fs from 'fs-extra';
import path from 'path';
import upath from 'upath';
import prompt from 'electron-prompt';
import { servicesHelpers } from '../helpers/services';
import { utilities } from '../utils/utilities';

const {
  BrowserWindow,
  Menu,
  dialog,
  app,
  shell
} = servicesHelpers.getElectronShared();

export const browserWindowService = {
  openFileInChromeBrowser,
  openInNewWindow
};

export default browserWindowService;

function saveFileToFolder(browserWin) {
  const fileUrl = decodeURIComponent(browserWin.webContents.getURL());
  const fileName = path.basename(fileUrl);
  const ext = path.extname(fileName).replace('.', '');
  const defaultFolder = app.getPath('documents');
  const defaultPath = path.join(defaultFolder, fileName);
  const targetFile = dialog.showSaveDialog({
    title: `Select folder to save ${fileName}`,
    buttonLabel: 'Save',
    defaultPath,
    filters: [
      { name: `${ext.toUpperCase()} files`, extensions: [ext] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  if (!targetFile) {
    return; // canceled.
  }
  const sourceFile = fileUrl.replace('file:///', '');
  log.debug(sourceFile);
  log.debug(targetFile);
  fs.copySync(sourceFile, targetFile);
  shell.showItemInFolder(targetFile);
}

let lastSearchText;
let lastSearchIndex;
let lastSearchResults;
const findNextLabel = 'Find Next';
const findNextShortcut = 'F3';
const findBackShortcut = 'Shift+F3';

function findNextInPageMenuItem(browserWin, searchText, forward = true) {
  const findNextInfo = lastSearchResults
    ? ` (${lastSearchIndex}/${lastSearchResults})`
    : '';
  return findInPageMenuItem(
    browserWin,
    searchText,
    false,
    `${forward ? findNextLabel : 'Find Backward'}${findNextInfo}`,
    forward ? findNextShortcut : findBackShortcut,
    forward
  );
}

function findInPageMenuItem(
  browserWin,
  selectionText,
  openPrompt = true,
  label = 'Find',
  accelerator = 'CmdOrCtrl+F',
  forward = true
) {
  return {
    label,
    accelerator,
    click: async () => {
      const { webContents } = browserWin;
      webContents.unselect();
      if (openPrompt) {
        try {
          const promptResult = await prompt(
            {
              title: label,
              label: '',
              resizable: true,
              value: selectionText,
              inputAttrs: {
                type: 'text'
              }
            },
            browserWin
          );
          if (!promptResult || promptResult.length === 0) {
            return;
          }
          lastSearchText = promptResult;
          lastSearchIndex = undefined;
          lastSearchResults = undefined;
          webContents.findInPage(promptResult);
        } catch (error) {
          log.error(error);
        }
      } else {
        if (!selectionText || selectionText.length === 0) {
          return;
        }
        webContents.findInPage(selectionText, { forward });
      }
    }
  };
}

function buildBrowserTemplate(browserWin) {
  // console.log('menu/buildDefaultTemplate');
  // console.log(loginLabel);
  const templateBrowser = [
    {
      label: '&File',
      submenu: [
        {
          label: 'Save To',
          accelerator: 'Ctrl+S',
          click: () => saveFileToFolder(browserWin)
        },
        {
          role: 'close'
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        {
          role: 'copy'
        },
        { type: 'separator' },
        findInPageMenuItem(browserWin, lastSearchText),
        findNextInPageMenuItem(browserWin, lastSearchText, true),
        findNextInPageMenuItem(browserWin, lastSearchText, false),
        { type: 'separator' },
        {
          role: 'selectAll'
        }
      ]
    },
    {
      label: '&View',
      submenu: [
        { role: 'reload' },
        { role: 'togglefullscreen' },
        { role: 'toggleDevTools' }
      ]
    },
    {
      label: 'Help',
      submenu: [{ role: 'toggleDevTools' }]
    }
  ];

  return templateBrowser;
}

function buildBrowserMenu(browserWin) {
  const template = buildBrowserTemplate(browserWin);
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  return menu;
}

function openFileInChromeBrowser(
  filePath,
  hotReload = false,
  webPreferences = {},
  options = {}
) {
  const currentWindow = servicesHelpers.getCurrentWindow();
  const normalizedFilePath = upath.normalize(filePath);
  const url = `file:///${normalizedFilePath}`;
  const browserWin = new BrowserWindow({
    width: 800,
    height: 550,
    webPreferences: {
      nativeWindowOpen: true,
      nodeIntegration: false,
      ...webPreferences
    },
    title: filePath,
    show: false,
    ...options
  });
  browserWin.webContents.on('dom-ready', () => {
    /*
    Don't automatically bring up devTools & Reduce spam from a bug:
    https://github.com/electron/electron/issues/12438#issuecomment-390211011
    https://github.com/electron/electron/issues/13008
    [23580:0926/110237.459:ERROR:CONSOLE(24)] "Empty response arrived for script 'chrome-devtools://devtools/remote/serve_file/@67b778eb4e0214a7dd0d01c286f15c0fcb6b3a90/product_registry_impl/product_registry_impl_module.js'",
source: chrome-devtools://devtools/bundled/shell.js (24)
[23580:0926/110237.471:ERROR:CONSOLE(108)] "Uncaught (in promise) Error: Could not instantiate: ProductRegistryImpl.Registry", source: chrome-devtools://devtools/bundled/shell.js (108)
     */
    browserWin.webContents.closeDevTools();
  });
  browserWin.loadURL(url);
  browserWin.on('focus', () => {
    buildBrowserMenu(browserWin);
  });
  browserWin.on('closed', () => {
    fs.unwatchFile(filePath);
  });
  currentWindow.on('close', () => {
    try {
      browserWin.close();
    } catch {
      // Object has been destroyed?
    }
  });
  browserWin.show();
  browserWin.focus();
  if (hotReload) {
    fs.watchFile(filePath, (curr, prev) => {
      if (curr.mtime !== prev.mtime) {
        browserWin.webContents.reload();
      }
    });
  }
  browserWin.webContents.on('found-in-page', (event, result) => {
    const { activeMatchOrdinal, matches } = result;
    lastSearchResults = matches;
    lastSearchIndex = activeMatchOrdinal;
    buildBrowserMenu(browserWin);
  });
  browserWin.webContents.on('context-menu', (event, params) => {
    const { selectionText } = params;
    const searchText =
      selectionText && selectionText.length > 0
        ? selectionText
        : lastSearchText;
    Menu.buildFromTemplate([
      { role: 'copy' },
      { type: 'separator' },
      findInPageMenuItem(browserWin, selectionText),
      findNextInPageMenuItem(browserWin, searchText),
      findNextInPageMenuItem(browserWin, searchText, false)
    ]).popup(browserWin);
  });
  return browserWin;
}

function openInNewWindow(appPage, routerPage) {
  const newWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    webPreferences: {
      nativeWindowOpen: true
    }
  });
  newWindow.once('ready-to-show', () => newWindow.show());
  newWindow.webContents.on('dom-ready', () => {
    /*
    Don't automatically bring up devTools & Reduce spam from a bug:
    https://github.com/electron/electron/issues/12438#issuecomment-390211011
    https://github.com/electron/electron/issues/13008
    [23580:0926/110237.459:ERROR:CONSOLE(24)] "Empty response arrived for script 'chrome-devtools://devtools/remote/serve_file/@67b778eb4e0214a7dd0d01c286f15c0fcb6b3a90/product_registry_impl/product_registry_impl_module.js'",
source: chrome-devtools://devtools/bundled/shell.js (24)
[23580:0926/110237.471:ERROR:CONSOLE(108)] "Uncaught (in promise) Error: Could not instantiate: ProductRegistryImpl.Registry", source: chrome-devtools://devtools/bundled/shell.js (108)
     */
    newWindow.webContents.closeDevTools();
  });
  const newWindowUrl = `file://${appPage}#${routerPage}`;
  log.info({ newWindowUrl });
  newWindow.loadURL(newWindowUrl);
  newWindow.webContents.on('will-navigate', (event, url) => {
    // NOTE: preventDefault will not work from renderer.
    // Needs to be handled in Main processes app.on('web-contents-created'
    // See https://github.com/electron/electron/issues/1378#issuecomment-265207386
    event.preventDefault();
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return;
    }
    const osPath = utilities.convertUrlToLocalPath(url);
    if (fs.existsSync(osPath)) {
      shell.showItemInFolder(osPath);
    }
  });
  return newWindow;
}
