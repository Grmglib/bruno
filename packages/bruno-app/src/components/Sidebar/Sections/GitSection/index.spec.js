import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'styled-components';

const mockLoadWorkspaceGit = jest.fn(() => async () => {});
const mockInitializeWorkspaceGit = jest.fn(() => async () => {});
const mockStageWorkspaceGitItems = jest.fn(() => async () => {});
const mockUnstageWorkspaceGitItems = jest.fn(() => async () => {});
const mockCommitWorkspaceGitChanges = jest.fn(() => async () => {});
const mockCommitAndPushWorkspaceGitChanges = jest.fn(() => async () => {});
const mockCheckoutWorkspaceGitBranchAction = jest.fn(() => async () => {});
const mockFetchWorkspaceGitAction = jest.fn(() => async () => {});
const mockPullWorkspaceGitAction = jest.fn(() => async () => {});
const mockPushWorkspaceGitAction = jest.fn(() => async () => {});
const mockLoadWorkspaceGitDiff = jest.fn(() => async () => {});

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn()
}));

jest.mock('components/Sidebar/SidebarSection', () => ({ title, children, actions }) => (
  <section>
    <div>{title}</div>
    <div>{actions}</div>
    <div>{children}</div>
  </section>
));

jest.mock('ui/Button', () => ({ children, onClick, disabled, loading, fullWidth, icon, ...rest }) => (
  <button onClick={onClick} disabled={disabled || loading} {...rest}>
    {icon}
    {children}
  </button>
));

jest.mock('ui/ActionIcon', () => ({ children, onClick, disabled, label }) => (
  <button onClick={onClick} disabled={disabled} aria-label={label}>{children}</button>
));

jest.mock('ui/MenuDropdown', () => ({ children, items = [] }) => (
  <div>
    {children}
    <div>
      {items.map((item) => (
        <button key={item.id} onClick={() => item.onClick?.()} type="button" data-testid={`menu-item-${item.id}`}>
          {item.label}
        </button>
      ))}
    </div>
  </div>
));

jest.mock('components/Spinner', () => () => <div>Loading...</div>);
jest.mock('./GitDiffModal', () => () => null);

jest.mock('providers/ReduxStore/slices/git', () => {
  const actual = jest.requireActual('providers/ReduxStore/slices/git');
  return {
    ...actual,
    loadWorkspaceGit: (...args) => mockLoadWorkspaceGit(...args),
    initializeWorkspaceGit: (...args) => mockInitializeWorkspaceGit(...args),
    stageWorkspaceGitItems: (...args) => mockStageWorkspaceGitItems(...args),
    unstageWorkspaceGitItems: (...args) => mockUnstageWorkspaceGitItems(...args),
    commitWorkspaceGitChanges: (...args) => mockCommitWorkspaceGitChanges(...args),
    commitAndPushWorkspaceGitChanges: (...args) => mockCommitAndPushWorkspaceGitChanges(...args),
    checkoutWorkspaceGitBranchAction: (...args) => mockCheckoutWorkspaceGitBranchAction(...args),
    fetchWorkspaceGitAction: (...args) => mockFetchWorkspaceGitAction(...args),
    pullWorkspaceGitAction: (...args) => mockPullWorkspaceGitAction(...args),
    pushWorkspaceGitAction: (...args) => mockPushWorkspaceGitAction(...args),
    loadWorkspaceGitDiff: (...args) => mockLoadWorkspaceGitDiff(...args)
  };
});

import GitSection from './index';

const theme = {
  sidebar: {
    bg: '#111827',
    color: '#f9fafb',
    collection: {
      item: {
        hoverBg: '#374151'
      }
    }
  },
  danger: '#ef4444'
};

const makeStore = (preloadedState) => configureStore({
  reducer: {
    app: (state = preloadedState.app) => state,
    workspaces: (state = preloadedState.workspaces) => state,
    git: (state = preloadedState.git) => state
  }
});

const renderSection = (preloadedState) => render(
  <Provider store={makeStore(preloadedState)}>
    <ThemeProvider theme={theme}>
      <GitSection />
    </ThemeProvider>
  </Provider>
);

describe('GitSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders initialize state for workspaces without git', async () => {
    renderSection({
      app: { gitVersion: 'git version 2.45.0', gitOperationProgress: {} },
      workspaces: {
        activeWorkspaceUid: 'ws-1',
        workspaces: [{ uid: 'ws-1', pathname: '/tmp/workspace' }]
      },
      git: {
        byWorkspaceUid: {
          'ws-1': {
            status: 'ready',
            isGitRepository: false,
            staged: [],
            unstaged: [],
            remotes: [],
            diff: { status: 'idle', file: null, data: null, error: null }
          }
        }
      }
    });

    expect(screen.getByText('Initialize Repository')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Initialize Repository'));
    expect(mockInitializeWorkspaceGit).toHaveBeenCalledWith('ws-1');

    await waitFor(() => {
      expect(mockLoadWorkspaceGit).toHaveBeenCalledWith('ws-1');
    });
  });

  it('renders the connected git workspace state', async () => {
    renderSection({
      app: { gitVersion: 'git version 2.45.0', gitOperationProgress: {} },
      workspaces: {
        activeWorkspaceUid: 'ws-1',
        workspaces: [{ uid: 'ws-1', pathname: '/tmp/workspace' }]
      },
      git: {
        byWorkspaceUid: {
          'ws-1': {
            status: 'ready',
            hasLoadedOnce: true,
            isRefreshing: false,
            isGitRepository: true,
            currentGitBranch: 'main',
            branches: ['main', 'feature/test'],
            remotes: [{ name: 'origin', refs: { fetch: 'https://github.com/usebruno/bruno.git' } }],
            staged: [{ path: 'README.md', type: 'staged' }],
            unstaged: [{ path: 'package.json', type: 'unstaged' }],
            conflicted: [],
            ahead: 1,
            behind: 2,
            diff: { status: 'idle', file: null, data: null, error: null }
          }
        }
      }
    });

    expect(screen.getByText('Commit & Push')).toBeInTheDocument();
    expect(screen.getByText('Staged Changes')).toBeInTheDocument();
    expect(screen.getByText('Unstaged Changes')).toBeInTheDocument();
    expect(screen.getByTestId('git-footer')).toBeInTheDocument();
    expect(screen.getByTestId('git-remote-actions')).toBeInTheDocument();
    expect(screen.getByTestId('git-branch-select-trigger')).toBeInTheDocument();
    expect(screen.getByLabelText('Commit')).toBeInTheDocument();
    expect(screen.getAllByText('main').length).toBeGreaterThan(0);
    expect(screen.getByText('github.com/usebruno/bruno.git')).toBeInTheDocument();
    expect(screen.queryByText('Working tree')).not.toBeInTheDocument();
    expect(screen.queryByText('Ready to commit')).not.toBeInTheDocument();
  });

  it('keeps content visible during silent refresh', async () => {
    renderSection({
      app: {
        gitVersion: 'git version 2.45.0',
        gitOperationProgress: {
          'proc-1': {
            progressData: ['remote: Counting objects...']
          }
        }
      },
      workspaces: {
        activeWorkspaceUid: 'ws-1',
        workspaces: [{ uid: 'ws-1', pathname: '/tmp/workspace' }]
      },
      git: {
        byWorkspaceUid: {
          'ws-1': {
            status: 'ready',
            hasLoadedOnce: true,
            isRefreshing: true,
            isGitRepository: true,
            currentGitBranch: 'main',
            branches: ['main'],
            remotes: [],
            staged: [{ path: 'README.md', type: 'staged' }],
            unstaged: [],
            conflicted: [],
            ahead: 1,
            behind: 0,
            diff: { status: 'idle', file: null, data: null, error: null }
          }
        }
      }
    });

    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    expect(screen.getAllByText('Updating...').length).toBeGreaterThan(0);
    expect(screen.getByText('README.md')).toBeInTheDocument();
    expect(screen.queryByText('Operation Output')).not.toBeInTheDocument();
    expect(screen.queryByText('remote: Counting objects...')).not.toBeInTheDocument();
  });

  it('uses the compact commit action and the main commit-push action separately', async () => {
    renderSection({
      app: { gitVersion: 'git version 2.45.0', gitOperationProgress: {} },
      workspaces: {
        activeWorkspaceUid: 'ws-1',
        workspaces: [{ uid: 'ws-1', pathname: '/tmp/workspace' }]
      },
      git: {
        byWorkspaceUid: {
          'ws-1': {
            status: 'ready',
            hasLoadedOnce: true,
            isRefreshing: false,
            isGitRepository: true,
            currentGitBranch: 'main',
            branches: ['main'],
            remotes: [{ name: 'origin', refs: { fetch: 'https://github.com/usebruno/bruno.git' } }],
            staged: [{ path: 'README.md', type: 'staged' }],
            unstaged: [],
            conflicted: [],
            ahead: 1,
            behind: 0,
            diff: { status: 'idle', file: null, data: null, error: null }
          }
        }
      }
    });

    fireEvent.change(screen.getByTestId('git-commit-message'), {
      target: { value: 'Test commit' }
    });

    expect(screen.getByTestId('git-commit-button')).not.toBeDisabled();
    expect(screen.getByTestId('git-commit-message')).toHaveValue('Test commit');

    fireEvent.change(screen.getByTestId('git-commit-message'), {
      target: { value: 'Test commit 2' }
    });

    fireEvent.click(screen.getByLabelText('Commit'));
    await waitFor(() => expect(mockCommitWorkspaceGitChanges).toHaveBeenCalledWith({
      workspaceUid: 'ws-1',
      message: 'Test commit 2'
    }));

    expect(mockCommitAndPushWorkspaceGitChanges).not.toHaveBeenCalled();
  });

  it('uses the dropdown as the only branch switch control', async () => {
    renderSection({
      app: { gitVersion: 'git version 2.45.0', gitOperationProgress: {} },
      workspaces: {
        activeWorkspaceUid: 'ws-1',
        workspaces: [{ uid: 'ws-1', pathname: '/tmp/workspace' }]
      },
      git: {
        byWorkspaceUid: {
          'ws-1': {
            status: 'ready',
            hasLoadedOnce: true,
            isRefreshing: false,
            isGitRepository: true,
            currentGitBranch: 'main',
            branches: ['main', 'feature/test'],
            remotes: [{ name: 'origin', refs: { fetch: 'https://github.com/usebruno/bruno.git' } }],
            staged: [],
            unstaged: [],
            conflicted: [],
            ahead: 0,
            behind: 0,
            diff: { status: 'idle', file: null, data: null, error: null }
          }
        }
      }
    });

    expect(screen.getByTestId('git-branch-select-trigger')).toHaveTextContent('main');
    expect(screen.getByTestId('menu-item-feature/test')).toBeInTheDocument();
    expect(screen.queryByLabelText('Switch branch')).not.toBeInTheDocument();
  });
});
