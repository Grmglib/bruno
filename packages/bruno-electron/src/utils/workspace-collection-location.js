const fs = require('fs');
const path = require('path');
const { readWorkspaceConfig } = require('./workspace-config');

const COLLECTIONS_DIR_NAME = 'collections';

const normalizePathSlashes = (value) => (value || '').replace(/\\/g, '/');

const isPathUnderCollectionsDir = (relativePath) => {
  const normalized = normalizePathSlashes(relativePath);
  return normalized === COLLECTIONS_DIR_NAME || normalized.startsWith(`${COLLECTIONS_DIR_NAME}/`);
};

const resolveFromWorkspaceConfig = (workspacePath, config = {}) => {
  const normalizedWorkspace = path.normalize(workspacePath);
  const collectionsDir = path.join(normalizedWorkspace, COLLECTIONS_DIR_NAME);
  const collections = config.collections || [];

  const hasCollectionUnderCollectionsDir = collections.some(
    (collection) => isPathUnderCollectionsDir(collection.path)
  );

  if (hasCollectionUnderCollectionsDir) {
    return collectionsDir;
  }

  const hasRootLevelCollection = collections.some(
    (collection) => collection.path && !isPathUnderCollectionsDir(collection.path)
  );

  if (hasRootLevelCollection) {
    return normalizedWorkspace;
  }

  const hasRootLevelGroups = (config.collectionGroups || []).some(
    (group) => group.path && !isPathUnderCollectionsDir(group.path)
  );

  if (hasRootLevelGroups) {
    return normalizedWorkspace;
  }

  return collectionsDir;
};

const resolveWorkspaceCollectionLocation = (workspacePath) => {
  if (!workspacePath) {
    return '';
  }

  try {
    const config = readWorkspaceConfig(workspacePath);
    return resolveFromWorkspaceConfig(workspacePath, config);
  } catch {
    const normalizedWorkspace = path.normalize(workspacePath);
    const collectionsDir = path.join(normalizedWorkspace, COLLECTIONS_DIR_NAME);
    const collectionsDirExists = fs.existsSync(collectionsDir)
      && fs.statSync(collectionsDir).isDirectory();

    return collectionsDirExists ? collectionsDir : normalizedWorkspace;
  }
};

module.exports = {
  COLLECTIONS_DIR_NAME,
  resolveFromWorkspaceConfig,
  resolveWorkspaceCollectionLocation
};
