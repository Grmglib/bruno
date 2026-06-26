const { ipcRenderer } = window;

export const listIconPacks = () => {
  return ipcRenderer.invoke('renderer:list-icon-packs');
};

export const readCustomIcon = (pack, name, format) => {
  return ipcRenderer.invoke('renderer:read-custom-icon', { pack, name, format });
};

export const openIconsFolder = () => {
  return ipcRenderer.invoke('renderer:open-icons-folder');
};

export const getIconsFolderPath = () => {
  return ipcRenderer.invoke('renderer:get-icons-folder-path');
};

export const getCollectionIconConfig = (collection) => {
  if (!collection) {
    return null;
  }

  const brunoConfig = collection.draft?.brunoConfig || collection.brunoConfig;
  return brunoConfig?.icon || null;
};
