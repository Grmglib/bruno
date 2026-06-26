import { configureStore } from '@reduxjs/toolkit';
import reducer, {
  loadWorkspaceGit,
  stageWorkspaceGitItems,
  commitAndPushWorkspaceGitChanges,
  loadWorkspaceGitDiff,
  clearWorkspaceGitDiff,
  setWorkspaceGitState
} from './git';
import * as gitUtils from 'utils/git';

jest.mock('utils/git', () => ({
  getWorkspaceGitData: jest.fn(),
  initWorkspaceGit: jest.fn(),
  stageWorkspaceGitFiles: jest.fn(),
  unstageWorkspaceGitFiles: jest.fn(),
  commitWorkspaceGit: jest.fn(),
  checkoutWorkspaceGitBranch: jest.fn(),
  fetchWorkspaceGit: jest.fn(),
  pullWorkspaceGit: jest.fn(),
  pushWorkspaceGit: jest.fn(),
  getWorkspaceGitFileDiff: jest.fn()
}));

const makeStore = (workspace = { uid: 'ws-1', pathname: '/tmp/workspace' }) => configureStore({
  reducer: {
    git: reducer,
    workspaces: (state = {
      workspaces: workspace ? [workspace] : [],
      activeWorkspaceUid: workspace?.uid || null
    }) => state
  }
});

describe('git slice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads workspace git data into state', async () => {
    gitUtils.getWorkspaceGitData.mockResolvedValue({
      isGitRepository: true,
      gitRootPath: '/tmp/workspace',
      currentGitBranch: 'main',
      branches: ['main'],
      staged: [{ path: 'README.md', type: 'staged' }],
      unstaged: [],
      remotes: []
    });

    const store = makeStore();
    await store.dispatch(loadWorkspaceGit('ws-1'));

    expect(gitUtils.getWorkspaceGitData).toHaveBeenCalledWith('/tmp/workspace');
    expect(store.getState().git.byWorkspaceUid['ws-1']).toMatchObject({
      status: 'ready',
      isGitRepository: true,
      currentGitBranch: 'main',
      staged: [{ path: 'README.md', type: 'staged' }]
    });
  });

  it('returns an empty ready state when workspace has no pathname', async () => {
    const store = makeStore({ uid: 'ws-1', pathname: null });
    await store.dispatch(loadWorkspaceGit('ws-1'));

    expect(gitUtils.getWorkspaceGitData).not.toHaveBeenCalled();
    expect(store.getState().git.byWorkspaceUid['ws-1']).toMatchObject({
      status: 'ready',
      isGitRepository: false,
      staged: [],
      unstaged: []
    });
  });

  it('stages files and refreshes workspace git status', async () => {
    gitUtils.stageWorkspaceGitFiles.mockResolvedValue(true);
    gitUtils.getWorkspaceGitData
      .mockResolvedValueOnce({
        isGitRepository: true,
        gitRootPath: '/tmp/workspace',
        currentGitBranch: 'main',
        branches: ['main'],
        staged: [],
        unstaged: [{ path: 'README.md', type: 'unstaged' }],
        remotes: []
      })
      .mockResolvedValueOnce({
        isGitRepository: true,
        gitRootPath: '/tmp/workspace',
        currentGitBranch: 'main',
        branches: ['main'],
        staged: [{ path: 'README.md', type: 'staged' }],
        unstaged: [],
        remotes: []
      });

    const store = makeStore();
    await store.dispatch(loadWorkspaceGit('ws-1'));
    await store.dispatch(stageWorkspaceGitItems({ workspaceUid: 'ws-1', files: ['README.md'] }));

    expect(gitUtils.stageWorkspaceGitFiles).toHaveBeenCalledWith('/tmp/workspace', ['README.md']);
    expect(store.getState().git.byWorkspaceUid['ws-1'].staged).toEqual([{ path: 'README.md', type: 'staged' }]);
    expect(store.getState().git.byWorkspaceUid['ws-1']).toMatchObject({
      status: 'ready',
      hasLoadedOnce: true,
      isRefreshing: false
    });
  });

  it('uses post-mutation refresh without resetting the ready state', async () => {
    gitUtils.stageWorkspaceGitFiles.mockResolvedValue(true);
    const store = makeStore();
    store.dispatch(setWorkspaceGitState({
      workspaceUid: 'ws-1',
      data: {
        isGitRepository: true,
        gitRootPath: '/tmp/workspace',
        currentGitBranch: 'main',
        branches: ['main'],
        staged: [],
        unstaged: [{ path: 'README.md', type: 'unstaged' }],
        remotes: []
      }
    }));
    gitUtils.getWorkspaceGitData.mockResolvedValue({
      isGitRepository: true,
      gitRootPath: '/tmp/workspace',
      currentGitBranch: 'main',
      branches: ['main'],
      staged: [{ path: 'README.md', type: 'staged' }],
      unstaged: [],
      remotes: []
    });

    await store.dispatch(stageWorkspaceGitItems({ workspaceUid: 'ws-1', files: ['README.md'] }));

    expect(gitUtils.getWorkspaceGitData).toHaveBeenCalledWith('/tmp/workspace');
    expect(store.getState().git.byWorkspaceUid['ws-1']).toMatchObject({
      status: 'ready',
      hasLoadedOnce: true,
      isRefreshing: false,
      staged: [{ path: 'README.md', type: 'staged' }]
    });
  });

  it('loads and clears diff state', async () => {
    gitUtils.getWorkspaceGitFileDiff.mockResolvedValue({
      unifiedDiff: 'diff --git a/a.txt b/a.txt',
      visualDiff: null
    });

    const store = makeStore();
    await store.dispatch(loadWorkspaceGitDiff({
      workspaceUid: 'ws-1',
      file: { path: 'a.txt', type: 'unstaged' }
    }));

    expect(store.getState().git.byWorkspaceUid['ws-1'].diff).toMatchObject({
      status: 'ready',
      file: { path: 'a.txt', type: 'unstaged' }
    });

    store.dispatch(clearWorkspaceGitDiff('ws-1'));
    expect(store.getState().git.byWorkspaceUid['ws-1'].diff).toMatchObject({
      status: 'idle',
      file: null,
      data: null
    });
  });

  it('runs commit and push in sequence', async () => {
    gitUtils.commitWorkspaceGit.mockResolvedValue(true);
    gitUtils.pushWorkspaceGit.mockResolvedValue(true);
    gitUtils.getWorkspaceGitData.mockResolvedValue({
      isGitRepository: true,
      gitRootPath: '/tmp/workspace',
      currentGitBranch: 'main',
      branches: ['main'],
      staged: [],
      unstaged: [],
      remotes: [{ name: 'origin' }]
    });

    const store = makeStore();
    await store.dispatch(commitAndPushWorkspaceGitChanges({
      workspaceUid: 'ws-1',
      message: 'Test commit',
      remote: 'origin',
      remoteBranch: 'main',
      processUid: 'proc-1'
    }));

    expect(gitUtils.commitWorkspaceGit).toHaveBeenCalledWith('/tmp/workspace', 'Test commit');
    expect(gitUtils.pushWorkspaceGit).toHaveBeenCalledWith({
      workspacePath: '/tmp/workspace',
      remote: 'origin',
      remoteBranch: 'main',
      processUid: 'proc-1'
    });
  });
});
