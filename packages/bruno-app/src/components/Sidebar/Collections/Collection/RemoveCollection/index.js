import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from 'components/Modal';
import { useDispatch, useSelector } from 'react-redux';
import { removeCollection } from 'providers/ReduxStore/slices/collections/actions';
import { findCollectionByUid, flattenItems, isItemARequest, hasRequestChanges } from 'utils/collections/index';
import filter from 'lodash/filter';
import ConfirmCollectionCloseDrafts from './ConfirmCollectionCloseDrafts';
import StyledWrapper from './StyledWrapper';

const REMOVAL_MODE = {
  APP_ONLY: 'app-only',
  DELETE_FILES: 'delete-files'
};

const RemoveCollection = ({ onClose, collectionUid }) => {
  const dispatch = useDispatch();
  const [removalMode, setRemovalMode] = useState(REMOVAL_MODE.APP_ONLY);
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const collection = useSelector((state) => findCollectionByUid(state.collections.collections, collectionUid));

  const deleteFiles = removalMode === REMOVAL_MODE.DELETE_FILES;

  const drafts = useMemo(() => {
    if (!collection) return [];
    const items = flattenItems(collection.items);
    return filter(items, (item) => isItemARequest(item) && hasRequestChanges(item));
  }, [collection]);

  const handleRemove = () => {
    if (!collection) {
      toast.error('Collection not found');
      onClose();
      return;
    }

    dispatch(removeCollection(collection.uid, { deleteFiles }))
      .then(() => {
        toast.success(
          deleteFiles
            ? `Deleted "${collection.name}" collection`
            : 'Collection removed from workspace'
        );
        onClose();
      })
      .catch((error) => {
        toast.error(error?.message || 'An error occurred while removing the collection');
      });
  };

  const handleConfirm = () => {
    if (drafts.length > 0) {
      setShowDraftsModal(true);
      return;
    }

    handleRemove();
  };

  if (!collection) {
    return <div>Collection not found</div>;
  }

  if (showDraftsModal) {
    return (
      <ConfirmCollectionCloseDrafts
        onClose={onClose}
        collection={collection}
        collectionUid={collectionUid}
        deleteFiles={deleteFiles}
      />
    );
  }

  return (
    <StyledWrapper>
      <Modal
        size="sm"
        title="Remove Collection"
        confirmText={deleteFiles ? 'Delete' : 'Remove'}
        confirmButtonColor="danger"
        handleConfirm={handleConfirm}
        handleCancel={onClose}
      >
        <p className="modal-description">
          Are you sure you want to remove <strong>"{collection.name}"</strong>?
        </p>
        <div className="collection-info-card">
          <div className="collection-name">{collection.name}</div>
          <div className="collection-path">{collection.pathname}</div>
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
                Files stay on disk at the location above and can be re-opened later.
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
                Permanently delete the collection folder from your filesystem.
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
  );
};

export default RemoveCollection;
