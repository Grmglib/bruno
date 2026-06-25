import React, { useMemo, useState } from 'react';
import get from 'lodash/get';
import { useDispatch } from 'react-redux';
import AuthMode from './AuthMode';
import AwsV4Auth from './AwsV4Auth';
import BearerAuth from './BearerAuth';
import BasicAuth from './BasicAuth';
import DigestAuth from './DigestAuth';
import WsseAuth from './WsseAuth';
import ApiKeyAuth from './ApiKeyAuth/';
import { applyInheritAuthToAllItems, saveCollectionSettings } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';
import OAuth2 from './OAuth2';
import NTLMAuth from './NTLMAuth';
import OAuth1 from './Oauth1';
import Button from 'ui/Button';
import Modal from 'components/Modal';
import { getItemsWithNonInheritAuth } from 'utils/auth';

const Auth = ({ collection }) => {
  const authMode = collection.draft?.root ? get(collection, 'draft.root.request.auth.mode') : get(collection, 'root.request.auth.mode');
  const dispatch = useDispatch();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const { requests, folders } = useMemo(() => getItemsWithNonInheritAuth(collection), [collection]);
  const affectedCount = requests.length + folders.length;

  const handleSave = () => dispatch(saveCollectionSettings(collection.uid));

  const handleApplyInherit = () => {
    setIsApplying(true);
    setShowConfirmModal(false);
    dispatch(applyInheritAuthToAllItems(collection.uid))
      .catch(() => {})
      .finally(() => setIsApplying(false));
  };

  const getAuthView = () => {
    switch (authMode) {
      case 'awsv4': {
        return <AwsV4Auth collection={collection} />;
      }
      case 'basic': {
        return <BasicAuth collection={collection} />;
      }
      case 'bearer': {
        return <BearerAuth collection={collection} />;
      }
      case 'digest': {
        return <DigestAuth collection={collection} />;
      }
      case 'ntlm': {
        return <NTLMAuth collection={collection} />;
      }
      case 'oauth1': {
        return <OAuth1 collection={collection} />;
      }
      case 'oauth2': {
        return <OAuth2 collection={collection} />;
      }
      case 'wsse': {
        return <WsseAuth collection={collection} />;
      }
      case 'apikey': {
        return <ApiKeyAuth collection={collection} />;
      }
    }
  };

  return (
    <StyledWrapper className="w-full h-full">
      <div className="text-xs mb-4 text-muted">
        Configures authentication for the entire collection. This applies to all requests using the{' '}
        <span className="font-medium">Inherit</span> option in the <span className="font-medium">Auth</span> tab.
      </div>
      <div className="flex flex-grow justify-start items-center">
        <AuthMode collection={collection} />
      </div>
      {getAuthView()}
      <div className="mt-6 flex flex-col gap-4">
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="text-sm font-medium mb-1">Apply to all requests</div>
          <div className="text-xs text-muted mb-3">
            Set every request and folder in this collection to use <span className="font-medium">Inherit</span>,
            so they use the collection auth configured above. Any per-request or per-folder auth settings will be removed.
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            data-testid="apply-inherit-auth-to-all-button"
            onClick={() => setShowConfirmModal(true)}
            disabled={isApplying || affectedCount === 0}
            loading={isApplying}
          >
            {affectedCount === 0 ? 'All requests already inherit' : 'Set all to inherit'}
          </Button>
        </div>
        <div>
          <Button type="submit" size="sm" onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>

      {showConfirmModal && (
        <Modal
          size="md"
          title="Set all requests to inherit auth"
          confirmText="Apply"
          confirmDisabled={isApplying}
          handleConfirm={handleApplyInherit}
          handleCancel={() => setShowConfirmModal(false)}
        >
          <div>
            <p>
              This will set auth to <strong>Inherit</strong> for{' '}
              <strong>{affectedCount}</strong> item{affectedCount === 1 ? '' : 's'} in <strong>{collection.name}</strong>:
            </p>
            <ul className="list-disc ml-5 mt-3 text-sm text-muted flex flex-col gap-1">
              {requests.length > 0 && (
                <li>{requests.length} request{requests.length === 1 ? '' : 's'}</li>
              )}
              {folders.length > 0 && (
                <li>{folders.length} folder{folders.length === 1 ? '' : 's'}</li>
              )}
            </ul>
            <p className="mt-3 text-sm text-muted">
              Existing auth credentials on those items will be discarded. This action cannot be undone.
            </p>
          </div>
        </Modal>
      )}
    </StyledWrapper>
  );
};
export default Auth;
