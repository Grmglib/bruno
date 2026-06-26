import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import {
  IconArrowDown,
  IconArrowUp,
  IconBrandGit,
  IconCheck,
  IconFileDiff,
  IconGitBranch,
  IconPlus,
  IconRefresh
} from '@tabler/icons';

import SidebarSection from 'components/Sidebar/SidebarSection';
import ActionIcon from 'ui/ActionIcon';
import Button from 'ui/Button';
import MenuDropdown from 'ui/MenuDropdown';
import Spinner from 'components/Spinner';
import { removeGitOperationProgress } from 'providers/ReduxStore/slices/app';
import {
  loadWorkspaceGit,
  initializeWorkspaceGit,
  stageWorkspaceGitItems,
  unstageWorkspaceGitItems,
  commitWorkspaceGitChanges,
  commitAndPushWorkspaceGitChanges,
  checkoutWorkspaceGitBranchAction,
  fetchWorkspaceGitAction,
  pullWorkspaceGitAction,
  pushWorkspaceGitAction,
  loadWorkspaceGitDiff,
  clearWorkspaceGitDiff
} from 'providers/ReduxStore/slices/git';
import { getSafeGitRemoteUrls } from 'utils/git';
import { uuid } from 'utils/common/index';
import GitDiffModal from './GitDiffModal';
import StyledWrapper from './StyledWrapper';

const GitSection = ({ embedded = false }) => {
  const dispatch = useDispatch();
  const { workspaces, activeWorkspaceUid } = useSelector((state) => state.workspaces);
  const activeWorkspace = workspaces.find((workspace) => workspace.uid === activeWorkspaceUid);
  const gitVersion = useSelector((state) => state.app.gitVersion);
  const workspaceGit = useSelector((state) => state.git.byWorkspaceUid[activeWorkspaceUid]);

  const [commitMessage, setCommitMessage] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [busyAction, setBusyAction] = useState(null);
  const [activeProcessUid, setActiveProcessUid] = useState(null);
  const [diffOpen, setDiffOpen] = useState(false);

  useEffect(() => {
    if (!activeWorkspaceUid || !gitVersion || !activeWorkspace?.pathname) {
      return;
    }

    dispatch(loadWorkspaceGit(activeWorkspaceUid)).catch(() => {});
  }, [dispatch, activeWorkspaceUid, activeWorkspace?.pathname, gitVersion]);

  useEffect(() => {
    if (workspaceGit?.currentGitBranch) {
      setSelectedBranch(workspaceGit.currentGitBranch);
    }
  }, [workspaceGit?.currentGitBranch]);

  const currentRemote = useMemo(() => {
    const remotes = workspaceGit?.remotes || [];
    return remotes.find((remote) => remote.name === 'origin')?.name || remotes[0]?.name || 'origin';
  }, [workspaceGit?.remotes]);

  const safeRemoteUrls = useMemo(() => {
    return getSafeGitRemoteUrls(workspaceGit?.remotes || []);
  }, [workspaceGit?.remotes]);

  const shortRemoteLabel = useMemo(() => {
    const url = safeRemoteUrls[0];
    if (!url) {
      return null;
    }

    return url.replace(/^https?:\/\//, '').replace(/^git@/, '');
  }, [safeRemoteUrls]);

  const withErrorToast = (error, fallback) => {
    toast.error(error?.message || fallback);
  };

  const clearProgress = (processUid) => {
    if (processUid) {
      dispatch(removeGitOperationProgress(processUid));
    }
  };

  const runAction = async (actionName, callback, { withProgress = false } = {}) => {
    const processUid = withProgress ? uuid() : null;
    setBusyAction(actionName);
    setActiveProcessUid(processUid);

    try {
      return await callback(processUid);
    } finally {
      clearProgress(processUid);
      setBusyAction(null);
      setActiveProcessUid(null);
    }
  };

  const handleRefresh = async () => {
    try {
      await runAction('refresh', async () => await dispatch(loadWorkspaceGit(activeWorkspaceUid)));
    } catch (error) {
      withErrorToast(error, 'Failed to refresh git status');
    }
  };

  const handleInitialize = async () => {
    try {
      await runAction('init', async () => await dispatch(initializeWorkspaceGit(activeWorkspaceUid)));
      toast.success('Git repository initialized');
    } catch (error) {
      withErrorToast(error, 'Failed to initialize repository');
    }
  };

  const handleStage = async (files) => {
    try {
      await runAction('stage', async () => await dispatch(stageWorkspaceGitItems({ workspaceUid: activeWorkspaceUid, files })));
    } catch (error) {
      withErrorToast(error, 'Failed to stage files');
    }
  };

  const handleUnstage = async (files) => {
    try {
      await runAction('unstage', async () => await dispatch(unstageWorkspaceGitItems({ workspaceUid: activeWorkspaceUid, files })));
    } catch (error) {
      withErrorToast(error, 'Failed to unstage files');
    }
  };

  const handleCommit = async () => {
    if (!commitMessage.trim()) {
      toast.error('Commit message is required');
      return;
    }

    try {
      await runAction('commit', async () => await dispatch(commitWorkspaceGitChanges({
        workspaceUid: activeWorkspaceUid,
        message: commitMessage.trim()
      })));
      setCommitMessage('');
      toast.success('Commit created');
    } catch (error) {
      withErrorToast(error, 'Failed to commit changes');
    }
  };

  const handleCheckoutBranch = async (targetBranch = selectedBranch) => {
    if (!targetBranch || targetBranch === workspaceGit?.currentGitBranch) {
      return;
    }

    try {
      await runAction('checkout', async (processUid) => await dispatch(checkoutWorkspaceGitBranchAction({
        workspaceUid: activeWorkspaceUid,
        branchName: targetBranch,
        processUid
      })), { withProgress: true });
      setSelectedBranch(targetBranch);
      toast.success(`Checked out ${targetBranch}`);
    } catch (error) {
      setSelectedBranch(workspaceGit?.currentGitBranch || '');
      withErrorToast(error, 'Failed to switch branch');
    }
  };

  const branchDropdownItems = (workspaceGit?.branches || []).map((branch) => ({
    id: branch,
    label: branch,
    onClick: () => {
      setSelectedBranch(branch);
      handleCheckoutBranch(branch);
    }
  }));

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) {
      toast.error('Branch name is required');
      return;
    }

    try {
      await runAction('create-branch', async (processUid) => await dispatch(checkoutWorkspaceGitBranchAction({
        workspaceUid: activeWorkspaceUid,
        branchName: newBranchName.trim(),
        processUid,
        shouldCreate: true
      })), { withProgress: true });
      setNewBranchName('');
      toast.success('Branch created');
    } catch (error) {
      withErrorToast(error, 'Failed to create branch');
    }
  };

  const handleFetch = async () => {
    try {
      await runAction('fetch', async () => await dispatch(fetchWorkspaceGitAction({
        workspaceUid: activeWorkspaceUid,
        remote: currentRemote
      })));
      toast.success('Fetch completed');
    } catch (error) {
      withErrorToast(error, 'Failed to fetch changes');
    }
  };

  const handlePull = async () => {
    try {
      await runAction('pull', async (processUid) => await dispatch(pullWorkspaceGitAction({
        workspaceUid: activeWorkspaceUid,
        remote: currentRemote,
        remoteBranch: workspaceGit?.currentGitBranch,
        processUid,
        strategy: '--no-rebase'
      })), { withProgress: true });
      toast.success('Pull completed');
    } catch (error) {
      withErrorToast(error, 'Failed to pull changes');
    }
  };

  const handlePush = async () => {
    try {
      await runAction('push', async (processUid) => await dispatch(pushWorkspaceGitAction({
        workspaceUid: activeWorkspaceUid,
        remote: currentRemote,
        remoteBranch: workspaceGit?.currentGitBranch,
        processUid
      })), { withProgress: true });
      toast.success('Push completed');
    } catch (error) {
      withErrorToast(error, 'Failed to push changes');
    }
  };

  const handleCommitAndPush = async () => {
    if (!commitMessage.trim()) {
      toast.error('Commit message is required');
      return;
    }

    try {
      await runAction('commit-push', async (processUid) => await dispatch(commitAndPushWorkspaceGitChanges({
        workspaceUid: activeWorkspaceUid,
        message: commitMessage.trim(),
        remote: currentRemote,
        remoteBranch: workspaceGit?.currentGitBranch,
        processUid
      })), { withProgress: true });
      setCommitMessage('');
      toast.success('Commit and push completed');
    } catch (error) {
      if (error?.commitSucceeded) {
        setCommitMessage('');
        withErrorToast(error, 'Commit succeeded, but push failed');
        return;
      }

      withErrorToast(error, 'Failed to commit and push changes');
    }
  };

  const handleOpenDiff = async (file) => {
    setDiffOpen(true);
    try {
      await dispatch(loadWorkspaceGitDiff({ workspaceUid: activeWorkspaceUid, file }));
    } catch (error) {
      withErrorToast(error, 'Failed to load diff');
    }
  };

  const handleCloseDiff = () => {
    setDiffOpen(false);
    dispatch(clearWorkspaceGitDiff(activeWorkspaceUid));
  };

  const isStageablePath = (file) => {
    return file?.path && !file.path.endsWith('/');
  };

  const shouldShowInitialLoading = !workspaceGit
    || (workspaceGit.status === 'loading' && !workspaceGit.hasLoadedOnce);

  const remoteButtons = (
    <div className="remote-actions" data-testid="git-remote-actions">
      <ActionIcon
        label="Commit"
        onClick={handleCommit}
        disabled={!workspaceGit?.staged?.length || busyAction === 'commit' || busyAction === 'commit-push'}
      >
        <IconBrandGit size={14} stroke={1.5} />
      </ActionIcon>
      <ActionIcon
        label="Fetch"
        onClick={handleFetch}
        disabled={!workspaceGit?.remotes?.length || busyAction === 'fetch' || busyAction === 'commit-push'}
      >
        <IconRefresh size={14} stroke={1.5} />
      </ActionIcon>
      <ActionIcon
        label="Pull"
        onClick={handlePull}
        disabled={!workspaceGit?.remotes?.length || busyAction === 'pull' || busyAction === 'commit-push'}
      >
        <IconArrowDown size={14} stroke={1.5} />
      </ActionIcon>
      <ActionIcon
        label="Push"
        onClick={handlePush}
        disabled={!workspaceGit?.remotes?.length || !workspaceGit?.currentGitBranch || busyAction === 'push' || busyAction === 'commit-push'}
      >
        <IconArrowUp size={14} stroke={1.5} />
      </ActionIcon>
    </div>
  );

  const renderChangeRows = (files, type) => {
    if (!files?.length) {
      return <div className="git-muted">No files</div>;
    }

    return (
      <div className="changes-list">
        {files.map((file) => {
          const actionLabel = type === 'staged' ? 'Unstage file' : 'Stage file';
          const actionIcon = type === 'staged'
            ? <IconArrowDown size={14} stroke={1.5} />
            : <IconCheck size={14} stroke={1.5} />;

          return (
            <div className="change-row" key={`${type}-${file.path}`}>
              <div className="change-row-top">
                <div className="change-path">{file.from ? `${file.from} -> ${file.to}` : file.path}</div>
                <div className="change-actions">
                  <ActionIcon
                    label="View diff"
                    onClick={() => handleOpenDiff(file)}
                  >
                    <IconFileDiff size={14} stroke={1.5} />
                  </ActionIcon>
                  <ActionIcon
                    label={actionLabel}
                    onClick={() => type === 'staged'
                      ? handleUnstage([file.path])
                      : handleStage([file.path])}
                    disabled={type !== 'staged' && !isStageablePath(file)}
                  >
                    {actionIcon}
                  </ActionIcon>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const sectionActions = (
    <div className="toolbar-actions">
      <ActionIcon
        label="Refresh Git status"
        onClick={handleRefresh}
        disabled={!activeWorkspace?.pathname || busyAction === 'refresh'}
      >
        <IconRefresh size={14} stroke={1.5} />
      </ActionIcon>
      {workspaceGit?.isRefreshing && (
        <span className="git-muted">Updating...</span>
      )}
    </div>
  );

  const renderContent = () => {
    if (!activeWorkspace?.pathname) {
      return (
        <div className="git-card">
          <div className="git-muted">Open a workspace to use Git features.</div>
        </div>
      );
    }

    if (!gitVersion) {
      return (
        <div className="git-card">
          <div className="git-muted">Git is not available on this machine.</div>
        </div>
      );
    }

    if (shouldShowInitialLoading) {
      return (
        <div className="git-card">
          <Spinner />
        </div>
      );
    }

    if (workspaceGit.status === 'error') {
      return (
        <div className="git-card">
          <div className="git-muted git-error">{workspaceGit.error}</div>
        </div>
      );
    }

    if (!workspaceGit.isGitRepository) {
      return (
        <div className="git-card stack">
          <div className="git-card-title">Local Repository</div>
          <div className="git-muted">
            This workspace is not tracked by Git yet.
          </div>
          <Button
            onClick={handleInitialize}
            loading={busyAction === 'init'}
            data-testid="git-init-button"
          >
            Initialize Repository
          </Button>
        </div>
      );
    }

    return (
      <div className="git-content-layout">
        <div className="git-card stack">
          <div className="git-toolbar-row">
            <div className="git-card-title compact">Changes</div>
            <div className="git-toolbar-actions">
              {workspaceGit.isRefreshing && (
                <span className="git-muted">Updating...</span>
              )}
              {remoteButtons}
            </div>
          </div>
          <textarea
            className="git-textarea"
            value={commitMessage}
            onChange={(event) => setCommitMessage(event.target.value)}
            placeholder="Enter commit message"
            data-testid="git-commit-message"
          />
          <div className="commit-row">
            <Button
              onClick={handleCommitAndPush}
              loading={busyAction === 'commit-push'}
              disabled={!workspaceGit.staged?.length || !workspaceGit?.remotes?.length || !workspaceGit?.currentGitBranch}
              fullWidth
              data-testid="git-commit-button"
            >
              Commit & Push
            </Button>
          </div>
        </div>
        {workspaceGit.conflicted?.length > 0 && (
          <div className="git-card stack">
            <div className="git-card-title">Conflicted Files</div>
            {workspaceGit.conflicted.map((file) => (
              <div className="change-path git-error" key={`conflict-${file.path}`}>{file.path}</div>
            ))}
          </div>
        )}

        <div className="git-card stack">
          <div className="git-section-header">
            <div className="git-section-title">Staged Changes</div>
            <ActionIcon
              label="Unstage all files"
              onClick={() => handleUnstage((workspaceGit.staged || []).map((file) => file.path))}
              disabled={!workspaceGit.staged?.length}
            >
              <IconArrowDown size={14} stroke={1.5} />
            </ActionIcon>
          </div>
          {renderChangeRows(workspaceGit.staged, 'staged')}
        </div>

        <div className="git-card stack">
          <div className="git-section-header">
            <div className="git-section-title">Unstaged Changes</div>
            <ActionIcon
              label="Stage all files"
              onClick={() => handleStage((workspaceGit.unstaged || [])
                .filter((file) => isStageablePath(file))
                .map((file) => file.path))}
              disabled={!workspaceGit.unstaged?.some((file) => isStageablePath(file))}
            >
              <IconArrowUp size={14} stroke={1.5} />
            </ActionIcon>
          </div>
          {workspaceGit.tooManyFiles ? (
            <div className="git-muted">Too many changed files to render in the sidebar.</div>
          ) : renderChangeRows(workspaceGit.unstaged, 'unstaged')}
        </div>

      </div>
    );
  };

  const renderFooter = () => {
    if (!workspaceGit?.isGitRepository || shouldShowInitialLoading || workspaceGit?.status === 'error') {
      return null;
    }

    return (
      <div className="git-footer" data-testid="git-footer">
        <div className="git-footer-top">
          <div className="branch-summary">
            <IconGitBranch size={14} stroke={1.5} />
            <span className="branch-name">{workspaceGit.currentGitBranch || 'Detached HEAD'}</span>
          </div>
          <div className="pill-row">
            <span className="pill">Ahead {workspaceGit.ahead || 0}</span>
            <span className="pill">Behind {workspaceGit.behind || 0}</span>
          </div>
        </div>
        <div className="git-footer-bottom">
          <MenuDropdown
            items={branchDropdownItems}
            placement="top-start"
            selectedItemId={selectedBranch}
            data-testid="git-branch-select"
          >
            <button
              type="button"
              className="git-select footer-select branch-dropdown-trigger"
              data-testid="git-branch-select-trigger"
            >
              <span className="branch-dropdown-text">{selectedBranch || 'Select branch'}</span>
            </button>
          </MenuDropdown>
          <input
            className="git-input footer-input"
            value={newBranchName}
            onChange={(event) => setNewBranchName(event.target.value)}
            placeholder="New branch"
            data-testid="git-new-branch-input"
          />
          <ActionIcon
            label="Create branch"
            onClick={handleCreateBranch}
            disabled={!newBranchName.trim() || busyAction === 'create-branch'}
          >
            <IconPlus size={14} stroke={1.5} />
          </ActionIcon>
        </div>
        {shortRemoteLabel && (
          <div className="git-footer-remote" title={safeRemoteUrls[0]}>
            {shortRemoteLabel}
          </div>
        )}
      </div>
    );
  };

  return (
    <StyledWrapper>
      {embedded ? (
        <>
          <div className="git-scroll-toolbar px-3 pt-3">
            {sectionActions}
          </div>
          <div className="git-panel">
            <div className="git-scroll">
              {renderContent()}
            </div>
            {renderFooter()}
          </div>
          <GitDiffModal
            open={diffOpen}
            file={workspaceGit?.diff?.file}
            diffState={workspaceGit?.diff}
            onClose={handleCloseDiff}
          />
        </>
      ) : (
        <SidebarSection
          id="git"
          title="Git"
          icon={IconBrandGit}
          actions={sectionActions}
          className="git-section"
        >
          <div className="git-panel">
            <div className="git-scroll">
              {renderContent()}
            </div>
            {renderFooter()}
          </div>
          <GitDiffModal
            open={diffOpen}
            file={workspaceGit?.diff?.file}
            diffState={workspaceGit?.diff}
            onClose={handleCloseDiff}
          />
        </SidebarSection>
      )}
    </StyledWrapper>
  );
};

export default GitSection;
