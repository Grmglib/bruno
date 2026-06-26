const path = require('path');
const { ipcMain } = require('electron');
const {
  cloneGitRepository,
  getCollectionGitRootPath,
  getWorkspaceGitData,
  initGit,
  stageChanges,
  unstageChanges,
  commitChanges,
  checkoutGitBranch,
  fetchChanges,
  pullGitChanges,
  pushGitChanges,
  getCurrentGitBranch,
  getStagedFileDiff,
  getUnstagedFileDiff,
  getRenamedFileDiff,
  getWorkingFileContentForVisualDiff
} = require('../utils/git');
const { createDirectory, removeDirectory } = require('../utils/filesystem');
const { validateWorkspacePath } = require('../utils/workspace-config');

const getGitRootPathForWorkspace = (workspacePath, { allowMissing = false } = {}) => {
  if (!workspacePath) {
    throw new Error('Workspace path is required');
  }

  validateWorkspacePath(workspacePath);

  const gitRootPath = getCollectionGitRootPath(workspacePath);
  if (!gitRootPath && !allowMissing) {
    throw new Error('Workspace is not a git repository');
  }

  return gitRootPath;
};

const toRelativeGitFilePaths = (gitRootPath, files = []) => {
  return files.map((filePath) => {
    if (!filePath) {
      return filePath;
    }

    const relativePath = path.isAbsolute(filePath)
      ? path.relative(gitRootPath, filePath)
      : filePath;

    return relativePath.replace(/\\/g, '/');
  });
};

const emitGitConsoleLog = (mainWindow, args, type = 'log') => {
  mainWindow.webContents.send('main:console-log', {
    type,
    args
  });
};

const normalizeGitConsoleArgs = (payload) => {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload.flatMap((item) => normalizeGitConsoleArgs(item));
  }

  if (typeof payload === 'string') {
    return payload
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter((line) => line.trim().length);
  }

  if (typeof payload === 'object') {
    return [JSON.stringify(payload, null, 2)];
  }

  return [String(payload)];
};

const emitGitConsoleOutput = (mainWindow, payload, type = 'log') => {
  const args = normalizeGitConsoleArgs(payload);
  if (!args.length) {
    return;
  }

  args.forEach((line) => {
    emitGitConsoleLog(mainWindow, [line], type);
  });
};

const runGitOperationWithLogs = async (mainWindow, commandArgs, operation) => {
  emitGitConsoleLog(mainWindow, commandArgs);

  try {
    const result = await operation();
    emitGitConsoleOutput(mainWindow, result);
    return result;
  } catch (error) {
    emitGitConsoleOutput(mainWindow, error?.message || error, 'error');
    throw error;
  }
};

const formatGitFilesArg = (files = [], limit = 4) => {
  if (!files.length) {
    return '';
  }

  if (files.length <= limit) {
    return files.join(' ');
  }

  return `${files.slice(0, limit).join(' ')} ... (${files.length} files)`;
};

const registerGitIpc = (mainWindow) => {
  ipcMain.handle('renderer:clone-git-repository', async (event, { url, path, processUid }) => {
    let directoryCreated = false;
    try {
      await createDirectory(path);
      directoryCreated = true;
      await cloneGitRepository(mainWindow, { url, path, processUid });
      return 'Repository cloned successfully';
    } catch (error) {
      if (directoryCreated) {
        await removeDirectory(path);
      }
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:get-workspace-git-data', async (event, workspacePath) => {
    validateWorkspacePath(workspacePath);
    return await getWorkspaceGitData(workspacePath);
  });

  ipcMain.handle('renderer:init-workspace-git', async (event, workspacePath) => {
    validateWorkspacePath(workspacePath);
    const existingGitRootPath = getCollectionGitRootPath(workspacePath);

    if (existingGitRootPath) {
      return await getWorkspaceGitData(workspacePath);
    }

    await runGitOperationWithLogs(mainWindow, ['git init && git branch -M main'], async () => await initGit(workspacePath));
    return await getWorkspaceGitData(workspacePath);
  });

  ipcMain.handle('renderer:stage-workspace-git-files', async (event, { workspacePath, files = [] }) => {
    const gitRootPath = getGitRootPathForWorkspace(workspacePath);
    const resolvedFiles = toRelativeGitFilePaths(gitRootPath, files);
    await runGitOperationWithLogs(mainWindow, [`git add -- ${formatGitFilesArg(resolvedFiles)}`], async () => {
      await stageChanges(gitRootPath, resolvedFiles);
      return 'git add completed';
    });
    return true;
  });

  ipcMain.handle('renderer:unstage-workspace-git-files', async (event, { workspacePath, files = [] }) => {
    const gitRootPath = getGitRootPathForWorkspace(workspacePath);
    const resolvedFiles = toRelativeGitFilePaths(gitRootPath, files);
    await runGitOperationWithLogs(mainWindow, [`git reset HEAD -- ${formatGitFilesArg(resolvedFiles)}`], async () => {
      await unstageChanges(gitRootPath, resolvedFiles);
      return 'git reset completed';
    });
    return true;
  });

  ipcMain.handle('renderer:commit-workspace-git', async (event, { workspacePath, message }) => {
    const gitRootPath = getGitRootPathForWorkspace(workspacePath);
    return await runGitOperationWithLogs(mainWindow, [`git commit -m "${message}"`], async () => await commitChanges(gitRootPath, message));
  });

  ipcMain.handle('renderer:checkout-workspace-git-branch', async (event, data) => {
    const gitRootPath = getGitRootPathForWorkspace(data.workspacePath);
    return await runGitOperationWithLogs(mainWindow, [
      data.shouldCreate
        ? `git checkout -b ${data.branchName} --progress`
        : `git checkout ${data.branchName} --progress`
    ], async () => await checkoutGitBranch(mainWindow, {
      gitRootPath,
      branchName: data.branchName,
      processUid: data.processUid,
      shouldCreate: data.shouldCreate
    }));
  });

  ipcMain.handle('renderer:fetch-workspace-git', async (event, { workspacePath, remote = 'origin' }) => {
    const gitRootPath = getGitRootPathForWorkspace(workspacePath);
    return await runGitOperationWithLogs(mainWindow, [`git fetch ${remote}`], async () => await fetchChanges(gitRootPath, remote));
  });

  ipcMain.handle('renderer:pull-workspace-git', async (event, data) => {
    const gitRootPath = getGitRootPathForWorkspace(data.workspacePath);
    const remoteBranch = data.remoteBranch || await getCurrentGitBranch(gitRootPath);
    return await runGitOperationWithLogs(mainWindow, [`git pull ${data.remote || 'origin'} ${remoteBranch} ${data.strategy || '--no-rebase'}`], async () => await pullGitChanges(mainWindow, {
      gitRootPath,
      processUid: data.processUid,
      remote: data.remote || 'origin',
      remoteBranch,
      strategy: data.strategy || '--no-rebase'
    }));
  });

  ipcMain.handle('renderer:push-workspace-git', async (event, data) => {
    const gitRootPath = getGitRootPathForWorkspace(data.workspacePath);
    const remoteBranch = data.remoteBranch || await getCurrentGitBranch(gitRootPath);
    return await runGitOperationWithLogs(mainWindow, [`git push ${data.remote || 'origin'} ${remoteBranch}`], async () => await pushGitChanges(mainWindow, {
      gitRootPath,
      processUid: data.processUid,
      remote: data.remote || 'origin',
      remoteBranch
    }));
  });

  ipcMain.handle('renderer:get-workspace-git-file-diff', async (event, { workspacePath, file }) => {
    const gitRootPath = getGitRootPathForWorkspace(workspacePath);

    if (!file?.path) {
      throw new Error('File path is required');
    }

    let unifiedDiff = '';
    if (file.type === 'renamed') {
      unifiedDiff = await getRenamedFileDiff(gitRootPath, file);
    } else if (file.type === 'staged') {
      unifiedDiff = await getStagedFileDiff(gitRootPath, file.path);
    } else {
      unifiedDiff = await getUnstagedFileDiff(gitRootPath, path.join(gitRootPath, file.path));
    }

    let visualDiff = null;
    if (file.type === 'staged' || file.type === 'unstaged') {
      visualDiff = await getWorkingFileContentForVisualDiff(gitRootPath, file.path, file.type);
    }

    return {
      unifiedDiff,
      visualDiff
    };
  });
};

module.exports = registerGitIpc;
