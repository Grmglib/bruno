import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from 'components/Modal';
import { useDispatch, useSelector } from 'react-redux';
import { removeCollection } from 'providers/ReduxStore/slices/collections/actions';
import { findCollectionByUid, getCollectionDrafts } from 'utils/collections/index';
import { pluralizeWord } from 'utils/common';
import ConfirmCollectionCloseDrafts from './ConfirmCollectionCloseDrafts';
import StyledWrapper from './StyledWrapper';
import { clearSidebarSelection } from 'providers/ReduxStore/slices/collections';
import Portal from 'ui/Portal';

const REMOVAL_MODE = {
  APP_ONLY: 'app-only',
  DELETE_FILES: 'delete-files'
};

const RemoveCollections = ({ onClose, collectionUid, collectionUids }) => {
  const dispatch = useDispatch();
  const allCollections = useSelector((state) => state.collections.collections || []);
  const [removalMode, setRemovalMode] = useState(REMOVAL_MODE.APP_ONLY);
  const [showDraftsModal, setShowDraftsModal] = useState(false);

  const deleteFiles = removalMode === REMOVAL_MODE.DELETE_FILES;

  const targetUids = useMemo(() => {
    return collectionUids || (collectionUid ? [collectionUid] : []);
  }, [collectionUid, collectionUids]);

  const collections = useMemo(() => {
    return targetUids
      .map((uid) => findCollectionByUid(allCollections, uid))
      .filter(Boolean);
  }, [allCollections, targetUids]);

  // Detect drafts in the collections
  const drafts = useMemo(() => {
    const { requestDrafts, transientDrafts, folderDrafts, collectionDrafts } = getCollectionDrafts(collections);
    return [...requestDrafts, ...transientDrafts, ...collectionDrafts, ...folderDrafts];
  }, [collections]);

  const handleRemove = () => {
    if (!collections.length) {
      toast.error('Collection not found');
      onClose();
      return;
    }

    const removalPromises = collections.map((collection) =>
      dispatch(removeCollection(collection.uid, { deleteFiles }))
    );

    Promise.allSettled(removalPromises).then((results) => {
      const failedCollections = [];
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          failedCollections.push(collections[index]);
          console.error(`Error removing collection ${collections[index].name}:`, result.reason);
        }
      });

      if (failedCollections.length === 0) {
        const message = deleteFiles
          ? `Deleted ${collections.length} ${pluralizeWord('collection', collections.length)}`
          : `${pluralizeWord('Collection', collections.length)} removed from workspace`;
        toast.success(message);
        dispatch(clearSidebarSelection());
        onClose();
      } else {
        const failedNames = failedCollections.map((c) => c.name).join(', ');
        toast.error(`Failed to remove: ${failedNames}`);
      }
    });
  };

  const handleConfirm = () => {
    // If there are drafts, ask what to do with them before removing
    if (drafts.length > 0) {
      setShowDraftsModal(true);
      return;
    }

    handleRemove();
  };

  if (!collections.length) {
    return <div>Collection not found</div>;
  }

  if (showDraftsModal) {
    return <ConfirmCollectionCloseDrafts onClose={onClose} collectionUids={targetUids} deleteFiles={deleteFiles} />;
  }

  const isMultiple = collections.length > 1;

  return (
    <Portal>
      <StyledWrapper>
        <Modal
          size="sm"
          title={`Remove ${pluralizeWord('Collection', collections.length)}`}
          confirmText={deleteFiles ? 'Delete' : isMultiple ? 'Remove All' : 'Remove'}
          confirmButtonColor="danger"
          handleConfirm={handleConfirm}
          handleCancel={onClose}
        >
          <p className="modal-description">
            {isMultiple
              ? `Are you sure you want to remove all ${collections.length} collections from this workspace?`
              : <>Are you sure you want to remove <strong>"{collections[0].name}"</strong>?</>}
          </p>

          <div className="collections-list-container">
            {collections.map((c) => (
              <div key={c.uid} className="collection-info-card">
                <div className="collection-name" data-testid="remove-collection-name">{c.name}</div>
                <div className="collection-path">{c.pathname}</div>
              </div>
            ))}
          </div>

          <div className="removal-options">
            <label className={`removal-option ${removalMode === REMOVAL_MODE.APP_ONLY ? 'selected' : ''}`}>
              <input
                type="radio"
                name="removalMode"
                value={REMOVAL_MODE.APP_ONLY}
                checked={removalMode === REMOVAL_MODE.APP_ONLY}
                onChange={() => setRemovalMode(REMOVAL_MODE.APP_ONLY)}
              />
              <div>
                <div className="removal-option-title">Remove from Bruno only</div>
                <div className="removal-option-description">
                  Files stay on disk at the {isMultiple ? 'locations' : 'location'} above and can be re-opened later.
                </div>
              </div>
            </label>

            <label className={`removal-option ${removalMode === REMOVAL_MODE.DELETE_FILES ? 'selected' : ''}`}>
              <input
                type="radio"
                name="removalMode"
                value={REMOVAL_MODE.DELETE_FILES}
                checked={removalMode === REMOVAL_MODE.DELETE_FILES}
                onChange={() => setRemovalMode(REMOVAL_MODE.DELETE_FILES)}
              />
              <div>
                <div className="removal-option-title">Delete files from disk</div>
                <div className="removal-option-description">
                  Permanently delete the collection {isMultiple ? 'folders' : 'folder'} from your filesystem.
                </div>
              </div>
            </label>
          </div>

          {deleteFiles && (
            <p className="warning-text">
              This action cannot be undone. The collection files will be permanently deleted from disk.
            </p>
          )}
        </Modal>
      </StyledWrapper>
    </Portal>
  );
};

export default RemoveCollections;
