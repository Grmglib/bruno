import { useMemo } from 'react';
import { resolveWorkspaceCollectionLocation } from 'utils/workspaces/collectionLocation';

const useDefaultCollectionLocation = (activeWorkspace, isDefaultWorkspace, preferencesDefaultLocation = '') => {
  return useMemo(() => {
    if (isDefaultWorkspace) {
      return preferencesDefaultLocation || '';
    }

    return resolveWorkspaceCollectionLocation(activeWorkspace);
  }, [activeWorkspace, isDefaultWorkspace, preferencesDefaultLocation]);
};

export default useDefaultCollectionLocation;
