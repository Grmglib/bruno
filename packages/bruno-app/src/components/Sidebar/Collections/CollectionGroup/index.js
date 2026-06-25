import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import classnames from 'classnames';
import { useDispatch } from 'react-redux';
import { useDrop } from 'react-dnd';
import {
  IconChevronRight,
  IconDots,
  IconEdit,
  IconFolder,
  IconSettings,
  IconTrash
} from '@tabler/icons';
import Collection from '../Collection';
import GitRemoteCollectionRow from '../GitRemoteCollectionRow';
import ManageCollectionsInGroupModal from './AddCollectionsToGroupModal';
import StyledWrapper from './StyledWrapper';
import MenuDropdown from 'ui/MenuDropdown';
import ActionIcon from 'ui/ActionIcon';
import Modal from 'components/Modal';
import {
  assignCollectionToGroupAction,
  deleteCollectionGroupAction,
  renameCollectionGroupAction
} from 'providers/ReduxStore/slices/workspaces/actions';
import { normalizePath } from 'utils/common/path';
import { pluralizeWord } from 'utils/common';

const GROUP_DELETE_MODE = {
  MOVE_TO_ROOT: 'move-to-root',
  DELETE_ALL: 'delete-all'
};

const getCollapsedStorageKey = (workspaceUid, groupUid) => {
  return `bruno:collection-group-collapsed:${workspaceUid}:${groupUid}`;
};

const CollectionGroup = ({
  group,
  entries,
  workspaceUid,
  workspaceCollections = [],
  collectionGroups = [],
  searchText,
  forceExpanded = false
}) => {
  const dispatch = useDispatch();
  const renameInputRef = useRef();
  const [collapsed, setCollapsed] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showManageCollectionsModal, setShowManageCollectionsModal] = useState(false);
  const [renameValue, setRenameValue] = useState(group.name);
  const [isSaving, setIsSaving] = useState(false);
  const [groupDeleteMode, setGroupDeleteMode] = useState(GROUP_DELETE_MODE.MOVE_TO_ROOT);

  const collectionsInFolder = useMemo(() => {
    return (workspaceCollections || []).filter((collection) => collection.group === group.uid);
  }, [workspaceCollections, group.uid]);

  const deleteCollections = groupDeleteMode === GROUP_DELETE_MODE.DELETE_ALL;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(getCollapsedStorageKey(workspaceUid, group.uid));
      if (stored === 'true') {
        setCollapsed(true);
      }
    } catch (_) {}
  }, [workspaceUid, group.uid]);

  useEffect(() => {
    if (showRenameModal && renameInputRef.current) {
      renameInputRef.current.focus();
    }
  }, [showRenameModal]);

  const isExpanded = forceExpanded || !collapsed;

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(getCollapsedStorageKey(workspaceUid, group.uid), String(next));
    } catch (_) {}
  };

  const findWorkspaceCollection = useCallback((draggedItem) => {
    const collectionPath = draggedItem.pathname || draggedItem.path;
    if (!collectionPath) {
      return null;
    }

    return workspaceCollections.find(
      (wc) => normalizePath(wc.path) === normalizePath(collectionPath)
    );
  }, [workspaceCollections]);

  const isCollectionInThisGroup = useCallback((draggedItem) => {
    const workspaceCollection = findWorkspaceCollection(draggedItem);
    return workspaceCollection?.group === group.uid;
  }, [findWorkspaceCollection, group.uid]);

  const handleAssignCollection = (draggedItem) => {
    const collectionPath = draggedItem.pathname || draggedItem.path;
    if (!collectionPath) {
      return;
    }
    dispatch(assignCollectionToGroupAction(workspaceUid, collectionPath, group.uid, draggedItem.uid));
  };

  const [{ isOverAssignTarget, canAssignToGroup }, dropAssignTarget] = useDrop({
    accept: ['collection'],
    canDrop: (draggedItem) => !isCollectionInThisGroup(draggedItem),
    drop: (draggedItem, monitor) => {
      if (monitor.didDrop()) {
        return;
      }
      handleAssignCollection(draggedItem);
    },
    collect: (monitor) => ({
      isOverAssignTarget: monitor.isOver({ shallow: true }),
      canAssignToGroup: monitor.canDrop()
    })
  });

  const connectAssignDropRef = useCallback((node) => {
    if (node) {
      dropAssignTarget(node);
    }
  }, [dropAssignTarget]);

  useEffect(() => {
    if (isOverAssignTarget && canAssignToGroup && collapsed) {
      setCollapsed(false);
    }
  }, [isOverAssignTarget, canAssignToGroup, collapsed]);

  const handleRename = () => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === group.name) {
      setShowRenameModal(false);
      return;
    }

    setIsSaving(true);
    dispatch(renameCollectionGroupAction(workspaceUid, group.uid, trimmed))
      .then(() => setShowRenameModal(false))
      .catch(() => {})
      .finally(() => setIsSaving(false));
  };

  const handleDelete = () => {
    setIsSaving(true);
    dispatch(deleteCollectionGroupAction(workspaceUid, group.uid, { deleteCollections }))
      .then(() => setShowDeleteModal(false))
      .catch(() => {})
      .finally(() => setIsSaving(false));
  };

  const menuItems = [
    {
      id: 'manage-collections',
      leftSection: IconSettings,
      label: 'Manage collections',
      onClick: () => setShowManageCollectionsModal(true)
    },
    {
      id: 'rename',
      leftSection: IconEdit,
      label: 'Rename',
      onClick: () => {
        setRenameValue(group.name);
        setShowRenameModal(true);
      }
    },
    {
      id: 'delete',
      leftSection: IconTrash,
      label: 'Delete folder',
      onClick: () => setShowDeleteModal(true)
    }
  ];

  const showAssignDropHighlight = isOverAssignTarget && canAssignToGroup;

  if (searchText && entries.length === 0) {
    return null;
  }

  return (
    <StyledWrapper data-testid={`collection-group-${group.uid}`}>
      <div
        ref={connectAssignDropRef}
        className={classnames('collection-group-header', {
          'drop-target': showAssignDropHighlight
        })}
      >
        <div className="flex py-1 collection-group-row items-center">
          <button
            type="button"
            className="flex items-center flex-grow min-w-0 text-left"
            onClick={toggleCollapsed}
            data-testid={`collection-group-toggle-${group.uid}`}
          >
            <IconChevronRight
              size={14}
              stroke={1.5}
              className={classnames('mr-1 flex-shrink-0 transition-transform', {
                'rotate-90': isExpanded
              })}
            />
            <IconFolder size={14} stroke={1.5} className="mr-1 flex-shrink-0" />
            <span className="truncate text-sm font-medium">{group.name}</span>
            <span className="ml-1 text-xs text-muted">({entries.length})</span>
          </button>

          <MenuDropdown
            items={menuItems}
            placement="bottom-end"
          >
            <ActionIcon label="Folder actions">
              <IconDots size={14} stroke={1.5} />
            </ActionIcon>
          </MenuDropdown>
        </div>
      </div>

      {isExpanded && (
        <div
          ref={connectAssignDropRef}
          className={classnames('collection-group-children', {
            'has-entries': entries.length > 0,
            'drop-target': showAssignDropHighlight && entries.length > 0
          })}
        >
          {entries.length === 0 ? (
            <div className="empty-drop-zone">
              <div className="empty-folder-hint text-xs text-muted px-2 py-2">
                Drop collections here or use Manage collections
              </div>
            </div>
          ) : (
            entries.map((entry) => {
              if (entry.kind === 'loaded') {
                return <Collection searchText={searchText} collection={entry.collection} key={entry.key} />;
              }
              return <GitRemoteCollectionRow entry={entry.entry} key={entry.key} />;
            })
          )}
        </div>
      )}

      {!isExpanded && showAssignDropHighlight && (
        <div className="collapsed-drop-hint text-xs text-muted px-2 py-1">
          Release to add to folder
        </div>
      )}

      {showManageCollectionsModal && (
        <ManageCollectionsInGroupModal
          workspaceUid={workspaceUid}
          groupUid={group.uid}
          groupName={group.name}
          workspaceCollections={workspaceCollections}
          collectionGroups={collectionGroups}
          onClose={() => setShowManageCollectionsModal(false)}
        />
      )}

      {showRenameModal && (
        <Modal
          size="md"
          title="Rename folder"
          confirmText="Rename"
          confirmDisabled={isSaving || !renameValue.trim()}
          handleConfirm={handleRename}
          handleCancel={() => setShowRenameModal(false)}
        >
          <form className="bruno-form" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label htmlFor="collection-group-rename" className="block font-medium">
                Name
              </label>
              <input
                id="collection-group-rename"
                ref={renameInputRef}
                type="text"
                name="name"
                className="block textbox mt-2 w-full"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                data-testid="collection-group-rename-input"
              />
            </div>
          </form>
        </Modal>
      )}

      {showDeleteModal && (
        <Modal
          size="sm"
          title="Delete folder"
          confirmText="Delete"
          confirmDisabled={isSaving}
          handleConfirm={handleDelete}
          handleCancel={() => setShowDeleteModal(false)}
        >
          <p className="modal-description">
            Are you sure you want to delete folder <strong>{group.name}</strong>?
          </p>

          {collectionsInFolder.length > 0 && (
            <>
              <p className="folder-summary">
                This folder contains <span className="font-medium">{collectionsInFolder.length}</span>{' '}
                {pluralizeWord('collection', collectionsInFolder.length)}.
              </p>

              <div className="removal-options">
                <label className={`removal-option ${groupDeleteMode === GROUP_DELETE_MODE.MOVE_TO_ROOT ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="groupDeleteMode"
                    value={GROUP_DELETE_MODE.MOVE_TO_ROOT}
                    checked={groupDeleteMode === GROUP_DELETE_MODE.MOVE_TO_ROOT}
                    onChange={() => setGroupDeleteMode(GROUP_DELETE_MODE.MOVE_TO_ROOT)}
                  />
                  <div>
                    <div className="removal-option-title">Move collections to workspace root</div>
                    <div className="removal-option-description">
                      Keep all collections and remove only the folder structure.
                    </div>
                  </div>
                </label>

                <label className={`removal-option ${groupDeleteMode === GROUP_DELETE_MODE.DELETE_ALL ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="groupDeleteMode"
                    value={GROUP_DELETE_MODE.DELETE_ALL}
                    checked={groupDeleteMode === GROUP_DELETE_MODE.DELETE_ALL}
                    onChange={() => setGroupDeleteMode(GROUP_DELETE_MODE.DELETE_ALL)}
                  />
                  <div>
                    <div className="removal-option-title">Delete folder and all collections inside</div>
                    <div className="removal-option-description">
                      Permanently delete the folder and every collection it contains.
                    </div>
                  </div>
                </label>
              </div>

              {groupDeleteMode === GROUP_DELETE_MODE.DELETE_ALL && (
                <p className="warning-text">
                  This action cannot be undone. All collections inside this folder will be permanently deleted from disk.
                </p>
              )}
            </>
          )}

          {collectionsInFolder.length === 0 && (
            <p className="folder-summary">
              This folder is empty and will be removed.
            </p>
          )}
        </Modal>
      )}
    </StyledWrapper>
  );
};

export default CollectionGroup;
