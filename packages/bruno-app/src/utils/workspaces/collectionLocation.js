import path from 'utils/common/path';

const COLLECTIONS_DIR_NAME = 'collections';

const normalizePathSlashes = (value) => (value || '').replace(/\\/g, '/');

const isPathUnderCollectionsDir = (absolutePath, workspacePathname) => {
  const collectionsDir = path.join(workspacePathname, COLLECTIONS_DIR_NAME);
  const normalizedCollectionPath = path.normalize(absolutePath);
  const collectionsPrefix = path.normalize(`${collectionsDir}${path.sep}`);

  return normalizedCollectionPath === path.normalize(collectionsDir)
    || normalizedCollectionPath.startsWith(collectionsPrefix);
};

export const resolveWorkspaceCollectionLocation = (workspace) => {
  if (!workspace?.pathname) {
    return '';
  }

  const workspacePathname = path.normalize(workspace.pathname);
  const collectionsDir = path.join(workspacePathname, COLLECTIONS_DIR_NAME);
  const workspaceCollections = workspace.collections || [];
  const collectionGroups = workspace.collectionGroups || [];

  const hasCollectionUnderCollectionsDir = workspaceCollections.some(
    (collection) => collection.path && isPathUnderCollectionsDir(collection.path, workspacePathname)
  );

  if (hasCollectionUnderCollectionsDir) {
    return collectionsDir;
  }

  const hasRootLevelCollection = workspaceCollections.some(
    (collection) => collection.path && !isPathUnderCollectionsDir(collection.path, workspacePathname)
  );

  if (hasRootLevelCollection) {
    return workspacePathname;
  }

  const hasRootLevelGroups = collectionGroups.some((group) => {
    const groupPath = group.path || '';
    return groupPath && !normalizePathSlashes(groupPath).startsWith(`${COLLECTIONS_DIR_NAME}/`)
      && normalizePathSlashes(groupPath) !== COLLECTIONS_DIR_NAME;
  });

  if (hasRootLevelGroups) {
    return workspacePathname;
  }

  return collectionsDir;
};
