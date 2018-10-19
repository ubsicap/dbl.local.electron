// @flow
import { app, Menu, shell, BrowserWindow, ipcMain } from 'electron';
import { ipcRendererConstants } from './constants/ipcRenderer.constants';
import { navigationConstants } from './constants/navigation.constants';
import { dblDotLocalService } from './services/dbl_dot_local.service';


export default class MenuBuilder {
  mainWindow: BrowserWindow;
  autoUpdater;
  initializedMenu = false;
  constructor(mainWindow: BrowserWindow, autoUpdater) {
    this.mainWindow = mainWindow;
    this.autoUpdater = autoUpdater;
    ipcMain.on(ipcRendererConstants.KEY_IPC_USER_AUTHENTICATION, (event, authentication) => {
      this.buildMenu(authentication);
    });
  }

  buildMenu(authentication) {
    if (!this.initializedMenu && (process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true')) {
      this.setupDevelopmentEnvironment();
    }

    const template = process.platform === 'darwin'
      ? this.buildDarwinTemplate()
      : this.buildDefaultTemplate(authentication);

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
    this.initializedMenu = true;
    return menu;
  }

  setupDevelopmentEnvironment() {
    console.log('setupDevelopmentEnvironment');
    this.mainWindow.openDevTools();
    this.mainWindow.webContents.on('context-menu', (e, props) => {
      const { x, y } = props;

      Menu
        .buildFromTemplate([{
          label: 'Inspect element',
          click: () => {
            this.mainWindow.inspectElement(x, y);
          }
        }])
        .popup(this.mainWindow);
    });
  }

  buildDarwinTemplate() {
    const subMenuAbout = {
      label: 'Electron',
      submenu: [
        { label: 'About ElectronReact', selector: 'orderFrontStandardAboutPanel:' },
        { type: 'separator' },
        { label: 'Services', submenu: [] },
        { type: 'separator' },
        { label: 'Hide ElectronReact', accelerator: 'Command+H', selector: 'hide:' },
        { label: 'Hide Others', accelerator: 'Command+Shift+H', selector: 'hideOtherApplications:' },
        { label: 'Show All', selector: 'unhideAllApplications:' },
        { type: 'separator' },
        { label: 'Quit', accelerator: 'Command+Q', click: () => { app.quit(); } }
      ]
    };
    const subMenuEdit = {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'Command+Z', selector: 'undo:' },
        { label: 'Redo', accelerator: 'Shift+Command+Z', selector: 'redo:' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'Command+X', selector: 'cut:' },
        { label: 'Copy', accelerator: 'Command+C', selector: 'copy:' },
        { label: 'Paste', accelerator: 'Command+V', selector: 'paste:' },
        { label: 'Select All', accelerator: 'Command+A', selector: 'selectAll:' }
      ]
    };
    const subMenuViewDev = {
      label: 'View',
      submenu: [
        { label: 'Reload', accelerator: 'Command+R', click: () => { this.mainWindow.webContents.reload(); } },
        { label: 'Toggle Full Screen', accelerator: 'Ctrl+Command+F', click: () => { this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen()); } },
        { label: 'Toggle Developer Tools', accelerator: 'Alt+Command+I', click: () => { this.mainWindow.toggleDevTools(); } }
      ]
    };
    const subMenuViewProd = {
      label: 'View',
      submenu: [
        { label: 'Toggle Full Screen', accelerator: 'Ctrl+Command+F', click: () => { this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen()); } }
      ]
    };
    const subMenuWindow = {
      label: 'Window',
      submenu: [
        { label: 'Minimize', accelerator: 'Command+M', selector: 'performMiniaturize:' },
        { label: 'Close', accelerator: 'Command+W', selector: 'performClose:' },
        { type: 'separator' },
        { label: 'Bring All to Front', selector: 'arrangeInFront:' }
      ]
    };
    const subMenuHelp = {
      label: 'Help',
      submenu: [
        { label: 'Learn More', click() { shell.openExternal('http://electron.atom.io'); } },
        { label: 'Documentation', click() { shell.openExternal('https://github.com/atom/electron/tree/master/docs#readme'); } },
        { label: 'Community Discussions', click() { shell.openExternal('https://discuss.atom.io/c/electron'); } },
        { label: 'Search Issues', click() { shell.openExternal('https://github.com/atom/electron/issues'); } }
      ]
    };

    const subMenuView = process.env.NODE_ENV === 'development'
      ? subMenuViewDev
      : subMenuViewProd;

    return [
      subMenuAbout,
      subMenuEdit,
      subMenuView,
      subMenuWindow,
      subMenuHelp
    ];
  }

  /* from https://github.com/SimulatedGREG/electron-vue/issues/394
   */
  navigate(routePath) {
    if (this.mainWindow.webContents) {
      this.mainWindow.webContents.send(ipcRendererConstants.KEY_IPC_NAVIGATE, routePath);
    }
  }

  buildDefaultTemplate(authentication) {
    let loginLabel = '&Login';
    if (authentication && authentication.loggedIn) {
      const username = (authentication.user ? authentication.user.username : null) || '';
      loginLabel = `&Logout ${username}`;
    }
    const logFile = this.autoUpdater.logger.transports.file.file;
    // console.log('menu/buildDefaultTemplate');
    // console.log(loginLabel);
    const templateDefault = [
      {
        label: '&File',
        submenu: [{
          label: 'Switch Wor&kspace',
          accelerator: 'Ctrl+K',
          click: () => (this.navigate(navigationConstants.NAVIGATION_WORKSPACES))
        },
        {
          label: 'E&xit',
          accelerator: 'Ctrl+W',
          click: () => {
            this.mainWindow.close();
          }
        }]
      },
      {
        label: 'Edit',
        submenu: [
          { label: 'Undo', accelerator: 'CmdOrCtrl+Z', selector: 'undo:' },
          { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', selector: 'redo:' },
          { type: 'separator' },
          { label: 'Cut', accelerator: 'CmdOrCtrl+X', selector: 'cut:' },
          { label: 'Copy', accelerator: 'CmdOrCtrl+C', selector: 'copy:' },
          { label: 'Paste', accelerator: 'CmdOrCtrl+V', selector: 'paste:' },
          { label: 'Select All', accelerator: 'CmdOrCtrl+A', selector: 'selectAll:' }
        ]
      },
      {
        label: '&View',
        submenu: (process.env.NODE_ENV === 'development') ? [{
          label: '&Reload',
          accelerator: 'Ctrl+R',
          click: () => {
            this.mainWindow.webContents.reload();
          }
        }, {
          label: 'Toggle &Full Screen',
          accelerator: 'F11',
          click: () => {
            this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
          }
        }, {
          label: 'Toggle &Developer Tools',
          accelerator: 'Alt+Ctrl+I',
          click: () => {
            this.mainWindow.toggleDevTools();
          }
        }] : [{
          label: 'Toggle &Full Screen',
          accelerator: 'F11',
          click: () => {
            this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
          }
        }]
      },
      {
        label: 'Help',
        submenu: [{
          label: 'Learn More',
          click() {
            shell.openExternal('https://github.com/ubsicap/dbl.local.electron');
          }
        }, {
          label: 'Documentation (dbl.local.electron)',
          click() {
            shell.openExternal('https://github.com/ubsicap/dbl.local.electron/blob/master/README.md');
          }
        }, {
          label: 'Documentation (DBL dot Local)',
          click() {
            shell.openExternal('https://github.com/ubsicap/dbl-uploader-clients');
          }
        }, {
          label: 'Search Issues',
          click() {
            shell.openExternal('https://github.com/ubsicap/dbl.local.electron/issues');
          }
        },
        {
          label: `Open Log: ${logFile}`,
          click() {
            shell.openItem(logFile);
          }
        }]
      }];

    return templateDefault;
  }
}
