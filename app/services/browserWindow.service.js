import fs from 'fs-extra';
import path from 'path';

const electron = require('electron');

const { remote = {} } = electron;
const {
  BrowserWindow, Menu, dialog, app, shell
} = remote;

export const browserWindowService = {
  openInChromeBrowser
};

export default browserWindowService;


function saveFileToFolder(browserWin) {
  const fileUrl = browserWin.webContents.getURL();
  const defaultFolder = app.getPath('documents');
  const defaultPath = path.join(defaultFolder, 'metadata.xml');
  const targetFile = dialog.showSaveDialog({
    title: 'Select folder to save metadata.xml',
    buttonLabel: 'Save',
    defaultPath,
    filters: [
      { name: 'XML files', extensions: ['xml'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  if (!targetFile) {
    return; // canceled.
  }
  const sourceFile = fileUrl.replace('file:///', '');
  console.log(sourceFile);
  console.log(targetFile);
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


function openInChromeBrowser(url, webPreferences = {}) {
  const browserWin = new BrowserWindow({
    width: 800,
    height: 550,
    webPreferences: {
      nativeWindowOpen: true,
      nodeIntegration: false,
      ...webPreferences
    },
    show: false
  });
  browserWin.loadURL(url);
  browserWin.on('focus', () => {
    buildBrowserMenu(browserWin);
  });
  browserWin.show();
  browserWin.focus();
}