import {
  app, BrowserWindow, Menu, ipcMain, globalShortcut,
} from 'electron';
import * as path from 'path';
import * as url from 'url';

let mainWindow: Electron.BrowserWindow | null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 1000,
    webPreferences: {
      devTools: true,
      webSecurity: false,
      nodeIntegration: true,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:4000');
  } else {
    mainWindow.loadURL(
      url.format({
        pathname: path.resolve(__dirname, 'renderer/index.html'),
        protocol: 'file:',
        slashes: true,
      }),
    );
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

ipcMain.on('change-color', (event, arg) => {
  console.log('color: ', arg);
  event.returnValue = 'ok';
});

app.on('ready', createWindow)
  .whenReady()
  .then(() => {
    // remoteWindow = new remote.BrowserWindow({
    //   width: 800,
    //   height: 600,
    //   webPreferences: {
    //     nodeIntegration: true,
    //   },
    // });
    globalShortcut.register('CommandOrControl+I', () => mainWindow.webContents.openDevTools());
    Menu.setApplicationMenu(null);
  });
app.allowRendererProcessReuse = true;
