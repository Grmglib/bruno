const { ipcMain } = require('electron');
const {
  listIconPacks,
  readCustomIcon,
  openIconsFolder,
  getIconsDirectory,
  ensureIconsDirectory
} = require('../services/icons');

const registerIconsIpc = () => {
  ensureIconsDirectory();

  ipcMain.handle('renderer:list-icon-packs', async () => {
    try {
      return listIconPacks();
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:read-custom-icon', async (_, { pack, name, format }) => {
    try {
      return readCustomIcon(pack, name, format);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:open-icons-folder', async () => {
    try {
      return await openIconsFolder();
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:get-icons-folder-path', async () => {
    try {
      return getIconsDirectory();
    } catch (error) {
      return Promise.reject(error);
    }
  });
};

module.exports = registerIconsIpc;
