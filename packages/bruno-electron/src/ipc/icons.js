const { ipcMain } = require('electron');
const {
  listIconPacks,
  readCustomIcon,
  openIconsFolder,
  getIconsFolderPath,
  ensureIconsDirectory
} = require('../services/icons');

const registerIconsIpc = () => {
  ensureIconsDirectory();

  ipcMain.handle('renderer:list-icon-packs', async (_, { workspacePath } = {}) => {
    try {
      return listIconPacks(workspacePath);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:read-custom-icon', async (_, { pack, name, format, workspacePath }) => {
    try {
      return readCustomIcon(pack, name, format, workspacePath);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:open-icons-folder', async (_, { workspacePath } = {}) => {
    try {
      return await openIconsFolder(workspacePath);
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:get-icons-folder-path', async (_, { workspacePath } = {}) => {
    try {
      return getIconsFolderPath(workspacePath);
    } catch (error) {
      return Promise.reject(error);
    }
  });
};

module.exports = registerIconsIpc;
