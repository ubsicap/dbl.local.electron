import log from 'electron-log';
import fs from 'fs-extra';
import path from 'path';
import upath from 'upath';

const electron = require('electron');

const { remote = {} } = electron;
const {
  BrowserWindow, Menu, dialog, app, shell
} = remote;

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
      submenu: [{
        label: 'Save To',
        accelerator: 'Ctrl+S',
        click: () => (saveFileToFolder(browserWin))
      },
      {
        label: 'E&xit',
        accelerator: 'Ctrl+W',
        click: () => {
          browserWin.close();
        }
      }]
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Copy',
          accelerator: 'CmdOrCtrl+C',
          selector: 'copy:',
          click: () => browserWin.webContents.copy()
        },
        {
          label: 'Select All',
          accelerator: 'CmdOrCtrl+A',
          selector: 'selectAll:',
          click: () => browserWin.webContents.selectAll()
        }
      ]
    },
    {
      label: '&View',
      submenu: [{
        label: '&Reload',
        accelerator: 'Ctrl+R',
        click: () => {
          browserWin.webContents.reload();
        }
      }, {
        label: 'Toggle &Full Screen',
        accelerator: 'F11',
        click: () => {
          browserWin.setFullScreen(!browserWin.isFullScreen());
        }
      }, {
        label: 'Toggle &Developer Tools',
        accelerator: 'Alt+Ctrl+I',
        click: () => {
          browserWin.toggleDevTools();
        }
      }]
    },
    {
      label: 'Help',
      submenu: [{
        label: 'Toggle &Developer Tools',
        accelerator: 'Shift+CmdOrCtrl+I',
        click: () => {
          browserWin.toggleDevTools();
        }
      }]
    }];

  return templateBrowser;
}

function buildBrowserMenu(browserWin) {
  const template = buildBrowserTemplate(browserWin);
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  return menu;
}

function openFileInChromeBrowser(filePath, hotReload = false, webPreferences = {}, options = {}) {
  const currentWindow = remote.getCurrentWindow();
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
    browserWin.close();
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
