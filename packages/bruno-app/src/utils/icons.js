const { ipcRenderer } = window;

export const listIconPacks = (workspacePath) => {
  return ipcRenderer.invoke('renderer:list-icon-packs', { workspacePath });
};

export const readCustomIcon = (pack, name, format, workspacePath) => {
  return ipcRenderer.invoke('renderer:read-custom-icon', { pack, name, format, workspacePath });
};

export const openIconsFolder = (workspacePath) => {
  return ipcRenderer.invoke('renderer:open-icons-folder', { workspacePath });
};

export const getIconsFolderPath = (workspacePath) => {
  return ipcRenderer.invoke('renderer:get-icons-folder-path', { workspacePath });
};

export const getCollectionIconConfig = (collection) => {
  if (!collection) {
    return null;
  }

  const brunoConfig = collection.draft?.brunoConfig || collection.brunoConfig;
  return brunoConfig?.icon || null;
};
