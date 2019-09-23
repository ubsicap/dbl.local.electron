import log from 'electron-log';
import fs from 'fs-extra';
import path from 'path';
import upath from 'upath';
import { servicesHelpers } from '../helpers/services';

const {
  BrowserWindow,
  Menu,
  dialog,
  app,
  shell
} = servicesHelpers.getElectronShared();

export const browserWindowService = {
  openFileInChromeBrowser
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
          role: 'exit'
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        {
          role: 'copy'
        },
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
  return browserWin;
}
