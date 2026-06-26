import { createSlice } from '@reduxjs/toolkit';
import {
  getWorkspaceGitData,
  initWorkspaceGit,
  stageWorkspaceGitFiles,
  unstageWorkspaceGitFiles,
  commitWorkspaceGit,
  checkoutWorkspaceGitBranch,
  fetchWorkspaceGit,
  pullWorkspaceGit,
  pushWorkspaceGit,
  getWorkspaceGitFileDiff
} from 'utils/git';

const createWorkspaceGitState = () => ({
  status: 'idle',
  hasLoadedOnce: false,
  isRefreshing: false,
  error: null,
  isGitRepository: false,
  gitRootPath: null,
  gitRepoUrl: null,
  branches: [],
  currentGitBranch: null,
  defaultGitBranch: null,
  logs: [],
  remotes: [],
  staged: [],
  unstaged: [],
  conflicted: [],
  totalFiles: 0,
  tooManyFiles: false,
  ahead: 0,
  behind: 0,
  aheadCommits: [],
  behindCommits: [],
  diff: {
    status: 'idle',
    file: null,
    data: null,
    error: null
  }
});

const initialState = {
  byWorkspaceUid: {}
};

const ensureWorkspaceEntry = (state, workspaceUid) => {
  if (!state.byWorkspaceUid[workspaceUid]) {
    state.byWorkspaceUid[workspaceUid] = createWorkspaceGitState();
  }

  return state.byWorkspaceUid[workspaceUid];
};

const getWorkspaceFromState = (state, workspaceUid) => {
  return state.workspaces.workspaces.find((workspace) => workspace.uid === workspaceUid);
};

const getWorkspacePath = (state, workspaceUid) => {
  return getWorkspaceFromState(state, workspaceUid)?.pathname || null;
};

const normalizeErrorMessage = (error) => {
  return error?.message || 'Git operation failed';
};

const createEmptyLoadedState = () => ({
  ...createWorkspaceGitState(),
  status: 'ready'
});

export const gitSlice = createSlice({
  name: 'git',
  initialState,
  reducers: {
    setWorkspaceGitLoading: (state, action) => {
      const workspaceState = ensureWorkspaceEntry(state, action.payload);
      workspaceState.status = 'loading';
      workspaceState.isRefreshing = false;
      workspaceState.error = null;
    },
    setWorkspaceGitRefreshing: (state, action) => {
      const workspaceState = ensureWorkspaceEntry(state, action.payload);
      workspaceState.isRefreshing = true;
      workspaceState.error = null;
    },
    setWorkspaceGitState: (state, action) => {
      const { workspaceUid, data } = action.payload;
      const existingState = ensureWorkspaceEntry(state, workspaceUid);
      state.byWorkspaceUid[workspaceUid] = {
        ...createWorkspaceGitState(),
        ...existingState,
        ...data,
        status: 'ready',
        hasLoadedOnce: true,
        isRefreshing: false,
        error: null
      };
    },
    setWorkspaceGitError: (state, action) => {
      const { workspaceUid, error } = action.payload;
      const workspaceState = ensureWorkspaceEntry(state, workspaceUid);
      workspaceState.status = workspaceState.hasLoadedOnce ? 'ready' : 'error';
      workspaceState.isRefreshing = false;
      workspaceState.error = error;
    },
    setWorkspaceGitDiffLoading: (state, action) => {
      const { workspaceUid, file } = action.payload;
      const workspaceState = ensureWorkspaceEntry(state, workspaceUid);
      workspaceState.diff = {
        status: 'loading',
        file,
        data: null,
        error: null
      };
    },
    setWorkspaceGitDiffState: (state, action) => {
      const { workspaceUid, file, data } = action.payload;
      const workspaceState = ensureWorkspaceEntry(state, workspaceUid);
      workspaceState.diff = {
        status: 'ready',
        file,
        data,
        error: null
      };
    },
    setWorkspaceGitDiffError: (state, action) => {
      const { workspaceUid, file, error } = action.payload;
      const workspaceState = ensureWorkspaceEntry(state, workspaceUid);
      workspaceState.diff = {
        status: 'error',
        file,
        data: null,
        error
      };
    },
    clearWorkspaceGitDiff: (state, action) => {
      const workspaceState = ensureWorkspaceEntry(state, action.payload);
      workspaceState.diff = {
        status: 'idle',
        file: null,
        data: null,
        error: null
      };
    }
  }
});

export const {
  setWorkspaceGitLoading,
  setWorkspaceGitRefreshing,
  setWorkspaceGitState,
  setWorkspaceGitError,
  setWorkspaceGitDiffLoading,
  setWorkspaceGitDiffState,
  setWorkspaceGitDiffError,
  clearWorkspaceGitDiff
} = gitSlice.actions;

export const loadWorkspaceGit = (workspaceUid, options = {}) => async (dispatch, getState) => {
  const { silent = false } = options;
  const workspacePath = getWorkspacePath(getState(), workspaceUid);

  if (!workspacePath) {
    dispatch(setWorkspaceGitState({ workspaceUid, data: createEmptyLoadedState() }));
    return createEmptyLoadedState();
  }

  const existingWorkspaceState = getState().git.byWorkspaceUid[workspaceUid];
  const shouldUseSilentRefresh = silent && existingWorkspaceState?.hasLoadedOnce;

  if (shouldUseSilentRefresh) {
    dispatch(setWorkspaceGitRefreshing(workspaceUid));
  } else {
    dispatch(setWorkspaceGitLoading(workspaceUid));
  }
  try {
    const data = await getWorkspaceGitData(workspacePath);
    dispatch(setWorkspaceGitState({ workspaceUid, data }));
    return data;
  } catch (error) {
    dispatch(setWorkspaceGitError({ workspaceUid, error: normalizeErrorMessage(error) }));
    throw error;
  }
};

export const initializeWorkspaceGit = (workspaceUid) => async (dispatch, getState) => {
  const workspacePath = getWorkspacePath(getState(), workspaceUid);
  if (!workspacePath) {
    throw new Error('Workspace path is required');
  }

  await initWorkspaceGit(workspacePath);
  return await dispatch(loadWorkspaceGit(workspaceUid));
};

const runWorkspaceGitMutation = async ({ dispatch, getState, workspaceUid, operation }) => {
  const workspacePath = getWorkspacePath(getState(), workspaceUid);
  if (!workspacePath) {
    throw new Error('Workspace path is required');
  }

  const result = await operation(workspacePath);
  await dispatch(loadWorkspaceGit(workspaceUid, { silent: true }));
  return result;
};

export const stageWorkspaceGitItems = ({ workspaceUid, files }) => async (dispatch, getState) => {
  return await runWorkspaceGitMutation({
    dispatch,
    getState,
    workspaceUid,
    operation: async (workspacePath) => await stageWorkspaceGitFiles(workspacePath, files)
  });
};

export const unstageWorkspaceGitItems = ({ workspaceUid, files }) => async (dispatch, getState) => {
  return await runWorkspaceGitMutation({
    dispatch,
    getState,
    workspaceUid,
    operation: async (workspacePath) => await unstageWorkspaceGitFiles(workspacePath, files)
  });
};

export const commitWorkspaceGitChanges = ({ workspaceUid, message }) => async (dispatch, getState) => {
  return await runWorkspaceGitMutation({
    dispatch,
    getState,
    workspaceUid,
    operation: async (workspacePath) => await commitWorkspaceGit(workspacePath, message)
  });
};

export const commitAndPushWorkspaceGitChanges = ({
  workspaceUid,
  message,
  remote,
  remoteBranch,
  processUid
}) => async (dispatch, getState) => {
  const workspacePath = getWorkspacePath(getState(), workspaceUid);
  if (!workspacePath) {
    throw new Error('Workspace path is required');
  }

  try {
    await commitWorkspaceGit(workspacePath, message);
  } catch (error) {
    throw error;
  }

  try {
    const result = await pushWorkspaceGit({
      workspacePath,
      remote,
      remoteBranch,
      processUid
    });
    await dispatch(loadWorkspaceGit(workspaceUid, { silent: true }));
    return result;
  } catch (error) {
    await dispatch(loadWorkspaceGit(workspaceUid, { silent: true }));
    const pushError = new Error(normalizeErrorMessage(error));
    pushError.commitSucceeded = true;
    throw pushError;
  }
};

export const checkoutWorkspaceGitBranchAction = ({ workspaceUid, branchName, processUid, shouldCreate = false }) => async (dispatch, getState) => {
  return await runWorkspaceGitMutation({
    dispatch,
    getState,
    workspaceUid,
    operation: async (workspacePath) => await checkoutWorkspaceGitBranch({
      workspacePath,
      branchName,
      processUid,
      shouldCreate
    })
  });
};

export const fetchWorkspaceGitAction = ({ workspaceUid, remote }) => async (dispatch, getState) => {
  return await runWorkspaceGitMutation({
    dispatch,
    getState,
    workspaceUid,
    operation: async (workspacePath) => await fetchWorkspaceGit({ workspacePath, remote })
  });
};

export const pullWorkspaceGitAction = ({ workspaceUid, remote, remoteBranch, processUid, strategy }) => async (dispatch, getState) => {
  return await runWorkspaceGitMutation({
    dispatch,
    getState,
    workspaceUid,
    operation: async (workspacePath) => await pullWorkspaceGit({
      workspacePath,
      remote,
      remoteBranch,
      processUid,
      strategy
    })
  });
};

export const pushWorkspaceGitAction = ({ workspaceUid, remote, remoteBranch, processUid }) => async (dispatch, getState) => {
  return await runWorkspaceGitMutation({
    dispatch,
    getState,
    workspaceUid,
    operation: async (workspacePath) => await pushWorkspaceGit({
      workspacePath,
      remote,
      remoteBranch,
      processUid
    })
  });
};

export const loadWorkspaceGitDiff = ({ workspaceUid, file }) => async (dispatch, getState) => {
  const workspacePath = getWorkspacePath(getState(), workspaceUid);
  if (!workspacePath) {
    throw new Error('Workspace path is required');
  }

  dispatch(setWorkspaceGitDiffLoading({ workspaceUid, file }));
  try {
    const data = await getWorkspaceGitFileDiff({ workspacePath, file });
    dispatch(setWorkspaceGitDiffState({ workspaceUid, file, data }));
    return data;
  } catch (error) {
    dispatch(setWorkspaceGitDiffError({
      workspaceUid,
      file,
      error: normalizeErrorMessage(error)
    }));
    throw error;
  }
};

export default gitSlice.reducer;
