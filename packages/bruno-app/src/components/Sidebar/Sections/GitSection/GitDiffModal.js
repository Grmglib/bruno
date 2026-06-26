import React from 'react';
import Modal from 'components/Modal';
import Portal from 'components/Portal';
import Spinner from 'components/Spinner';
import EndpointVisualDiff from 'components/OpenAPISyncTab/EndpointChangeSection/EndpointVisualDiff';
import StyledWrapper from './StyledWrapper';

const GitDiffModal = ({ open, file, diffState, onClose }) => {
  if (!open) {
    return null;
  }

  const renderContent = () => {
    if (diffState?.status === 'loading') {
      return <Spinner />;
    }

    if (diffState?.status === 'error') {
      return (
        <div className="git-card">
          <div className="git-error git-muted">{diffState.error}</div>
        </div>
      );
    }

    const visualDiff = diffState?.data?.visualDiff;
    if (visualDiff?.oldParsed || visualDiff?.newParsed) {
      return (
        <EndpointVisualDiff
          oldData={visualDiff.oldParsed}
          newData={visualDiff.newParsed}
          leftLabel="Previous"
          rightLabel="Current"
        />
      );
    }

    return (
      <pre className="diff-pre">
        {diffState?.data?.unifiedDiff || 'No diff content available.'}
      </pre>
    );
  };

  return (
    <Portal id="git-diff-modal">
      <StyledWrapper>
        <Modal
          size="lg"
          title={file?.path || 'File diff'}
          handleCancel={onClose}
          hideFooter
          dataTestId="git-diff-modal"
          noPadding
        >
          {renderContent()}
        </Modal>
      </StyledWrapper>
    </Portal>
  );
};

export default GitDiffModal;
