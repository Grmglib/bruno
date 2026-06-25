import React, { useMemo, useState } from 'react';
import Modal from 'components/Modal';
import { useDispatch } from 'react-redux';
import { normalizePath } from 'utils/common/path';
import { assignCollectionToGroupAction } from 'providers/ReduxStore/slices/workspaces/actions';
import StyledWrapper from './StyledWrapper';

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

const ManageCollectionsInGroupModal = ({
  workspaceUid,
  groupUid,
  groupName,
  workspaceCollections = [],
  collectionGroups = [],
  onClose
}) => {
  const dispatch = useDispatch();
  const [isSaving, setIsSaving] = useState(false);

  const sections = useMemo(() => {
    const assignable = workspaceCollections.filter((wc) => wc.path && !wc.notFoundLocally);

    const inFolder = assignable
      .filter((wc) => wc.group === groupUid)
      .map((wc) => ({
        path: wc.path,
        name: wc.name || wc.path
      }))
      .sort((a, b) => collator.compare(a.name, b.name));

    const atRoot = assignable
      .filter((wc) => !wc.group)
      .map((wc) => ({
        path: wc.path,
        name: wc.name || wc.path
      }))
      .sort((a, b) => collator.compare(a.name, b.name));

    const inOtherFolders = assignable
      .filter((wc) => wc.group && wc.group !== groupUid)
      .map((wc) => {
        const folder = collectionGroups.find((g) => g.uid === wc.group);
        return {
          path: wc.path,
          name: wc.name || wc.path,
          folderName: folder?.name || 'Unknown folder'
        };
      })
      .sort((a, b) => collator.compare(a.name, b.name));

    return { inFolder, atRoot, inOtherFolders };
  }, [workspaceCollections, collectionGroups, groupUid]);

  const initialSelectedPaths = useMemo(() => {
    return new Set(sections.inFolder.map((c) => normalizePath(c.path)));
  }, [sections.inFolder]);

  const [selectedPaths, setSelectedPaths] = useState(() => new Set(initialSelectedPaths));

  const allCollections = useMemo(() => {
    return [...sections.inFolder, ...sections.atRoot, ...sections.inOtherFolders];
  }, [sections]);

  const allSelected = allCollections.length > 0
    && allCollections.every((c) => selectedPaths.has(normalizePath(c.path)));

  const hasChanges = useMemo(() => {
    if (selectedPaths.size !== initialSelectedPaths.size) {
      return true;
    }

    for (const path of selectedPaths) {
      if (!initialSelectedPaths.has(path)) {
        return true;
      }
    }

    return false;
  }, [selectedPaths, initialSelectedPaths]);

  const togglePath = (collectionPath) => {
    const key = normalizePath(collectionPath);
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedPaths(new Set());
      return;
    }
    setSelectedPaths(new Set(allCollections.map((c) => normalizePath(c.path))));
  };

  const handleConfirm = () => {
    if (!hasChanges) {
      return;
    }

    const toRemove = sections.inFolder
      .filter((c) => !selectedPaths.has(normalizePath(c.path)))
      .map((c) => c.path);

    const toAdd = [...sections.atRoot, ...sections.inOtherFolders]
      .filter((c) => selectedPaths.has(normalizePath(c.path)))
      .map((c) => c.path);

    const operations = [
      ...toRemove.map((collectionPath) => dispatch(assignCollectionToGroupAction(workspaceUid, collectionPath, null))),
      ...toAdd.map((collectionPath) => dispatch(assignCollectionToGroupAction(workspaceUid, collectionPath, groupUid)))
    ];

    if (operations.length === 0) {
      onClose();
      return;
    }

    setIsSaving(true);
    Promise.all(operations)
      .then(() => onClose())
      .catch(() => {})
      .finally(() => setIsSaving(false));
  };

  const renderCollectionRow = (collection, { showFolder = false } = {}) => {
    const key = normalizePath(collection.path);
    return (
      <label key={key} className="collection-row">
        <input
          type="checkbox"
          checked={selectedPaths.has(key)}
          onChange={() => togglePath(collection.path)}
          data-testid={`manage-collection-${key}`}
        />
        <span className="collection-name truncate">{collection.name}</span>
        {showFolder && (
          <span className="collection-folder truncate">{collection.folderName}</span>
        )}
      </label>
    );
  };

  const hasCollections = allCollections.length > 0;

  return (
    <Modal
      size="md"
      title="Manage collections"
      confirmText="Save"
      confirmDisabled={isSaving || !hasChanges}
      handleConfirm={handleConfirm}
      handleCancel={onClose}
    >
      <StyledWrapper>
        <p className="modal-help">
          Check collections to include in <strong>{groupName}</strong>. Uncheck to remove from this folder.
        </p>

        {!hasCollections ? (
          <p className="empty-message">No collections available in this workspace.</p>
        ) : (
          <>
            <label className="select-all-row">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                data-testid="manage-collections-select-all"
              />
              <span>Select all</span>
            </label>
            <div className="collection-list" data-testid="manage-collections-list">
              {sections.inFolder.length > 0 && (
                <div className="collection-section">
                  <div className="section-header">In this folder</div>
                  {sections.inFolder.map((collection) => renderCollectionRow(collection))}
                </div>
              )}

              {sections.atRoot.length > 0 && (
                <div className="collection-section">
                  <div className="section-header">No folder</div>
                  {sections.atRoot.map((collection) => renderCollectionRow(collection))}
                </div>
              )}

              {sections.inOtherFolders.length > 0 && (
                <div className="collection-section">
                  <div className="section-header">In other folders</div>
                  {sections.inOtherFolders.map((collection) => renderCollectionRow(collection, { showFolder: true }))}
                </div>
              )}
            </div>
          </>
        )}
      </StyledWrapper>
    </Modal>
  );
};

export default ManageCollectionsInGroupModal;
