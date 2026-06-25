const fs = require('fs');
const path = require('path');
const fsExtra = require('fs-extra');
const {
  createDirectory,
  sanitizeName,
  moveCollectionDirectory,
  isDirectory,
  searchForRequestFiles
} = require('./filesystem');
const { findUniqueFolderName } = require('./collection-import');
const { moveRequestUid } = require('../cache/requestUids');
const { wsClient } = require('../ipc/network/ws-event-handlers');
const { generateUidBasedOnHash } = require('./common');
const {
  readWorkspaceConfig,
  makeRelativePath,
  getNormalizedAbsoluteCollectionPath,
  assignCollectionToGroup,
  renameCollectionGroup,
  deleteCollectionGroup,
  addCollectionToWorkspaceGitignore,
  removeCollectionFromWorkspaceGitignore,
  writeWorkspaceFileAtomic,
  generateYamlContent
} = require('./workspace-config');
const { withLock, getWorkspaceLockKey } = require('./workspace-lock');

const posixifyPath = (p) => (p ? p.replace(/\\/g, '/') : p);

const getCollectionsRoot = (workspacePath) => path.join(workspacePath, 'collections');

const resolveGroupRelativePath = (group) => {
  if (group?.path) {
    return posixifyPath(group.path);
  }
  return posixifyPath(path.join('collections', sanitizeName(group.name)));
};

const getGroupAbsolutePath = (workspacePath, group) => {
  const relativePath = resolveGroupRelativePath(group);
  return path.isAbsolute(relativePath)
    ? path.normalize(relativePath)
    : path.resolve(workspacePath, relativePath);
};

const ensureCollectionsRoot = async (workspacePath) => {
  const collectionsRoot = getCollectionsRoot(workspacePath);
  if (!fs.existsSync(collectionsRoot)) {
    await createDirectory(collectionsRoot);
  }
  return collectionsRoot;
};

const ensureGroupDirectory = async (workspacePath, group) => {
  const collectionsRoot = await ensureCollectionsRoot(workspacePath);
  let groupAbsPath = group.path ? path.resolve(workspacePath, group.path) : null;

  if (groupAbsPath && fs.existsSync(groupAbsPath) && isDirectory(groupAbsPath)) {
    return { group, groupAbsPath, groupPathUpdated: false };
  }

  if (group.path) {
    groupAbsPath = path.resolve(workspacePath, group.path);
    await createDirectory(groupAbsPath);
    return { group, groupAbsPath, groupPathUpdated: false };
  }

  let folderName = sanitizeName(group.name);
  if (!folderName) {
    throw new Error('Invalid collection group name');
  }

  let targetPath = path.join(collectionsRoot, folderName);
  if (fs.existsSync(targetPath)) {
    folderName = sanitizeName(await findUniqueFolderName(folderName, collectionsRoot));
    targetPath = path.join(collectionsRoot, folderName);
  }

  await createDirectory(targetPath);
  group.path = makeRelativePath(workspacePath, targetPath);
  return { group, groupAbsPath: targetPath, groupPathUpdated: true };
};

const persistGroupPathIfNeeded = async (workspacePath, group, groupPathUpdated) => {
  if (!groupPathUpdated) {
    return;
  }

  await withLock(getWorkspaceLockKey(workspacePath), async () => {
    const config = readWorkspaceConfig(workspacePath);
    const existing = (config.collectionGroups || []).find((g) => g.uid === group.uid);
    if (existing) {
      existing.path = group.path;
      await writeWorkspaceFileAtomic(workspacePath, generateYamlContent(config));
    }
  });
};

const remapRequestUidsAfterMove = (oldPath, newPath) => {
  try {
    const movedRequestFiles = searchForRequestFiles(newPath);
    for (const newFilePath of movedRequestFiles) {
      const oldFilePath = newFilePath.replace(newPath, oldPath);
      moveRequestUid(oldFilePath, newFilePath);
    }
  } catch (error) {
    console.error('Error remapping request uids after collection group move:', error);
  }
};

const performCollectionDirectoryMove = async ({
  sourcePath,
  destPath,
  collectionUid,
  watcher,
  mainWindow
}) => {
  const normalizedSource = path.normalize(sourcePath);
  const normalizedDest = path.normalize(destPath);

  if (normalizedSource === normalizedDest) {
    return { moved: false, oldPath: sourcePath, newPath: destPath, wasOpen: false };
  }

  if (!isDirectory(sourcePath)) {
    throw new Error(`Collection directory does not exist: ${sourcePath}`);
  }

  const wasOpen = Boolean(watcher?.hasWatcher?.(sourcePath));

  if (wasOpen && watcher && mainWindow) {
    watcher.removeWatcher(sourcePath, mainWindow, collectionUid);
    if (wsClient) {
      wsClient.closeForCollection(collectionUid);
    }
  }

  try {
    await moveCollectionDirectory(sourcePath, destPath);
  } catch (error) {
    throw error;
  }

  remapRequestUidsAfterMove(sourcePath, destPath);

  try {
    const LastOpenedCollections = require('../store/last-opened-collections');
    const lastOpenedCollections = new LastOpenedCollections();
    lastOpenedCollections.remove(sourcePath);
    lastOpenedCollections.add(destPath);
  } catch (error) {
    console.error('Error updating last opened collections after group move:', error);
  }

  return { moved: true, oldPath: sourcePath, newPath: destPath, wasOpen };
};

const computeCollectionTargetPath = async (workspacePath, collectionAbsolutePath, groupUid, config) => {
  const collectionsRoot = await ensureCollectionsRoot(workspacePath);
  const basename = path.basename(collectionAbsolutePath);

  if (!groupUid) {
    let folderName = basename;
    let targetPath = path.join(collectionsRoot, folderName);

    if (path.normalize(targetPath) !== path.normalize(collectionAbsolutePath) && fs.existsSync(targetPath)) {
      folderName = sanitizeName(await findUniqueFolderName(folderName, collectionsRoot));
      targetPath = path.join(collectionsRoot, folderName);
    }

    return targetPath;
  }

  const group = (config.collectionGroups || []).find((g) => g.uid === groupUid);
  if (!group) {
    throw new Error('Collection group not found');
  }

  const { groupAbsPath, groupPathUpdated } = await ensureGroupDirectory(workspacePath, group);
  await persistGroupPathIfNeeded(workspacePath, group, groupPathUpdated);

  let folderName = basename;
  let targetPath = path.join(groupAbsPath, folderName);

  if (path.normalize(targetPath) !== path.normalize(collectionAbsolutePath) && fs.existsSync(targetPath)) {
    folderName = sanitizeName(await findUniqueFolderName(folderName, groupAbsPath));
    targetPath = path.join(groupAbsPath, folderName);
  }

  return targetPath;
};

const updateCollectionGitignoreForMove = async (workspacePath, entry, oldPath, newPath) => {
  if (!entry?.remote) {
    return;
  }

  try {
    await removeCollectionFromWorkspaceGitignore(workspacePath, oldPath);
    await addCollectionToWorkspaceGitignore(workspacePath, newPath);
  } catch (error) {
    console.error('Error updating gitignore after collection group move:', error);
  }
};

const relocateOpenCollectionsAfterGroupRename = async ({
  collectionsInGroup,
  workspacePath,
  oldGroupAbsPath,
  newGroupAbsPath,
  watcher,
  mainWindow
}) => {
  const relocations = [];

  for (const collectionEntry of collectionsInGroup) {
    const oldCollectionPath = getNormalizedAbsoluteCollectionPath(workspacePath, collectionEntry);
    const relativeSuffix = path.relative(oldGroupAbsPath, oldCollectionPath);
    const newCollectionPath = path.join(newGroupAbsPath, relativeSuffix);
    const collectionUid = generateUidBasedOnHash(oldCollectionPath);
    const wasOpen = Boolean(watcher?.hasWatcher?.(oldCollectionPath));

    if (wasOpen && watcher && mainWindow) {
      watcher.removeWatcher(oldCollectionPath, mainWindow, collectionUid);
      if (wsClient) {
        wsClient.closeForCollection(collectionUid);
      }
    }

    remapRequestUidsAfterMove(oldCollectionPath, newCollectionPath);

    if (path.normalize(oldCollectionPath) !== path.normalize(newCollectionPath)) {
      relocations.push({
        oldPath: oldCollectionPath,
        newPath: newCollectionPath,
        wasOpen
      });
    }
  }

  return relocations;
};

const assignCollectionToGroupWithFilesystem = async ({
  workspacePath,
  collectionPath,
  groupUid,
  collectionUid,
  watcher,
  mainWindow
}) => {
  const config = readWorkspaceConfig(workspacePath);
  const entry = (config.collections || []).find(
    (c) => posixifyPath(getNormalizedAbsoluteCollectionPath(workspacePath, c)) === posixifyPath(path.normalize(collectionPath))
  );

  if (!entry) {
    throw new Error('Collection not found in workspace');
  }

  const currentAbsolutePath = getNormalizedAbsoluteCollectionPath(workspacePath, entry);
  const targetAbsolutePath = await computeCollectionTargetPath(workspacePath, currentAbsolutePath, groupUid, config);

  const currentGroup = entry.group || null;
  const targetGroup = groupUid || null;
  const pathUnchanged = path.normalize(currentAbsolutePath) === path.normalize(targetAbsolutePath);

  if (pathUnchanged && currentGroup === targetGroup) {
    return { moved: false, relocations: [] };
  }

  let moveResult = { moved: false, oldPath: currentAbsolutePath, newPath: currentAbsolutePath, wasOpen: false };

  if (!pathUnchanged) {
    const resolvedCollectionUid = collectionUid || generateUidBasedOnHash(currentAbsolutePath);
    moveResult = await performCollectionDirectoryMove({
      sourcePath: currentAbsolutePath,
      destPath: targetAbsolutePath,
      collectionUid: resolvedCollectionUid,
      watcher,
      mainWindow
    });
    await updateCollectionGitignoreForMove(workspacePath, entry, currentAbsolutePath, targetAbsolutePath);
  }

  await assignCollectionToGroup(workspacePath, currentAbsolutePath, groupUid, {
    newPath: moveResult.newPath
  });

  const relocations = moveResult.moved
    ? [{
        oldPath: currentAbsolutePath,
        newPath: moveResult.newPath,
        wasOpen: moveResult.wasOpen
      }]
    : [];

  return {
    moved: moveResult.moved,
    oldPath: currentAbsolutePath,
    newPath: moveResult.newPath,
    relocations
  };
};

const renameCollectionGroupWithFilesystem = async ({
  workspacePath,
  groupUid,
  name,
  watcher,
  mainWindow
}) => {
  const trimmedName = typeof name === 'string' ? name.trim() : '';
  if (!trimmedName) {
    throw new Error('Collection group name is required');
  }

  const config = readWorkspaceConfig(workspacePath);
  const group = (config.collectionGroups || []).find((g) => g.uid === groupUid);
  if (!group) {
    throw new Error('Collection group not found');
  }

  if (group.name === trimmedName) {
    return { relocations: [] };
  }

  await ensureGroupDirectory(workspacePath, group);
  const oldGroupAbsPath = getGroupAbsolutePath(workspacePath, group);

  if (!fs.existsSync(oldGroupAbsPath)) {
    await renameCollectionGroup(workspacePath, groupUid, trimmedName);
    return { relocations: [] };
  }

  const parentDir = path.dirname(oldGroupAbsPath);
  let newFolderName = sanitizeName(trimmedName);
  if (!newFolderName) {
    throw new Error('Invalid collection group name');
  }

  let newGroupAbsPath = path.join(parentDir, newFolderName);
  if (path.normalize(newGroupAbsPath) !== path.normalize(oldGroupAbsPath) && fs.existsSync(newGroupAbsPath)) {
    newFolderName = sanitizeName(await findUniqueFolderName(newFolderName, parentDir));
    newGroupAbsPath = path.join(parentDir, newFolderName);
  }

  let relocations = [];

  if (path.normalize(newGroupAbsPath) !== path.normalize(oldGroupAbsPath)) {
    const collectionsInGroup = (config.collections || []).filter((c) => c.group === groupUid);

    await fsExtra.move(oldGroupAbsPath, newGroupAbsPath, { overwrite: false });

    relocations = await relocateOpenCollectionsAfterGroupRename({
      collectionsInGroup,
      workspacePath,
      oldGroupAbsPath,
      newGroupAbsPath,
      watcher,
      mainWindow
    });
  }

  await renameCollectionGroup(workspacePath, groupUid, trimmedName, {
    newGroupPath: newGroupAbsPath,
    oldGroupPath: oldGroupAbsPath
  });

  return { relocations };
};

const deleteCollectionGroupWithFilesystem = async ({
  workspacePath,
  groupUid,
  watcher,
  mainWindow
}) => {
  const config = readWorkspaceConfig(workspacePath);
  const group = (config.collectionGroups || []).find((g) => g.uid === groupUid);
  if (!group) {
    throw new Error('Collection group not found');
  }

  const groupAbsPath = getGroupAbsolutePath(workspacePath, group);
  const collectionsInGroup = (config.collections || []).filter((c) => c.group === groupUid);
  const collectionsRoot = await ensureCollectionsRoot(workspacePath);
  const relocations = [];

  for (const collectionEntry of collectionsInGroup) {
    const oldCollectionPath = getNormalizedAbsoluteCollectionPath(workspacePath, collectionEntry);
    if (!fs.existsSync(oldCollectionPath)) {
      delete collectionEntry.group;
      continue;
    }

    let folderName = path.basename(oldCollectionPath);
    let newCollectionPath = path.join(collectionsRoot, folderName);

    if (path.normalize(newCollectionPath) !== path.normalize(oldCollectionPath) && fs.existsSync(newCollectionPath)) {
      folderName = sanitizeName(await findUniqueFolderName(folderName, collectionsRoot));
      newCollectionPath = path.join(collectionsRoot, folderName);
    }

    const collectionUid = generateUidBasedOnHash(oldCollectionPath);

    const moveResult = await performCollectionDirectoryMove({
      sourcePath: oldCollectionPath,
      destPath: newCollectionPath,
      collectionUid,
      watcher,
      mainWindow
    });

    await updateCollectionGitignoreForMove(workspacePath, collectionEntry, oldCollectionPath, newCollectionPath);

    collectionEntry.path = makeRelativePath(workspacePath, newCollectionPath);
    delete collectionEntry.group;

    if (moveResult.moved) {
      relocations.push({
        oldPath: oldCollectionPath,
        newPath: newCollectionPath,
        wasOpen: moveResult.wasOpen
      });
    }
  }

  if (fs.existsSync(groupAbsPath)) {
    try {
      const remaining = fs.readdirSync(groupAbsPath);
      if (remaining.length === 0) {
        await fs.promises.rm(groupAbsPath, { recursive: true, force: true });
      }
    } catch (error) {
      console.error('Error removing collection group directory:', error);
    }
  }

  await deleteCollectionGroup(workspacePath, groupUid, {
    collections: config.collections
  });

  return { relocations };
};

module.exports = {
  getCollectionsRoot,
  getGroupAbsolutePath,
  ensureGroupDirectory,
  assignCollectionToGroupWithFilesystem,
  renameCollectionGroupWithFilesystem,
  deleteCollectionGroupWithFilesystem
};
