import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import StyledWrapper from './StyledWrapper';
import Docs from '../Docs';
import Info from './Info';
import RequestsNotLoaded from './RequestsNotLoaded';
import CollectionIcon from 'components/CollectionIcon';
import IconPicker from 'components/IconPicker';
import { getCollectionIconConfig } from 'utils/icons';
import { updateCollectionIcon } from 'providers/ReduxStore/slices/collections';

const Overview = ({ collection }) => {
  const dispatch = useDispatch();
  const [showIconPicker, setShowIconPicker] = useState(false);
  const collectionIcon = getCollectionIconConfig(collection);

  const handleIconChange = (icon) => {
    dispatch(updateCollectionIcon({
      collectionUid: collection.uid,
      icon
    }));
  };

  return (
    <div className="h-full">
      <div className="grid grid-cols-5 gap-5 h-full">
        <div className="col-span-2 overflow-clip text-ellipsis">
          <div className="flex gap-2 items-center min-w-0">
            <button
              type="button"
              className="flex-shrink-0 cursor-pointer rounded-md p-1 hover:bg-zinc-800/40"
              onClick={() => setShowIconPicker(true)}
              title="Change collection icon"
              data-testid="collection-icon-picker-trigger"
            >
              <CollectionIcon icon={collectionIcon} size={20} strokeWidth={1.5} />
            </button>
            <span className="overflow-hidden text-lg font-medium whitespace-nowrap text-ellipsis">
              {collection?.name}
            </span>
          </div>
          <Info collection={collection} />
          <RequestsNotLoaded collection={collection} />
        </div>
        <div className="col-span-3">
          <Docs collection={collection} />
        </div>
      </div>

      <IconPicker
        isOpen={showIconPicker}
        onClose={() => setShowIconPicker(false)}
        value={collectionIcon}
        onChange={handleIconChange}
      />
    </div>
  );
};

export default Overview;
