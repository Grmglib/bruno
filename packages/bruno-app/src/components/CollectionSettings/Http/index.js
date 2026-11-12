import React from 'react';
import { useDispatch } from 'react-redux';
import { get } from 'lodash';
import Button from 'ui/Button';
import SegmentedControl from 'ui/SegmentedControl';
import { updateCollectionHttpVersion } from 'providers/ReduxStore/slices/collections';
import { saveCollectionSettings } from 'providers/ReduxStore/slices/collections/actions';

const HttpSettings = ({ collection }) => {
  const dispatch = useDispatch();
  const brunoConfig = collection.draft?.brunoConfig
    ? get(collection, 'draft.brunoConfig', {})
    : get(collection, 'brunoConfig', {});
  const httpVersion = brunoConfig.httpVersion === 2 ? '2' : '1';

  const handleChange = (value) => {
    dispatch(updateCollectionHttpVersion({
      collectionUid: collection.uid,
      httpVersion: value === '2' ? 2 : 1
    }));
  };

  return (
    <div className="h-full w-full" style={{ maxWidth: 800 }}>
      <div className="text-xs mb-4 text-muted">
        Protocol used by requests in this collection. HTTP/2 does not use the collection proxy.
      </div>
      <SegmentedControl
        ariaLabel="HTTP version"
        name="httpVersion"
        value={httpVersion}
        onChange={handleChange}
        size="sm"
        items={[
          { value: '1', label: 'HTTP/1.1', 'data-testid': 'collection-http-version-1' },
          { value: '2', label: 'HTTP/2', 'data-testid': 'collection-http-version-2' }
        ]}
      />
      <div className="mt-6">
        <Button type="button" size="sm" data-testid="collection-http-version-save" onClick={() => dispatch(saveCollectionSettings(collection.uid))}>
          Save
        </Button>
      </div>
    </div>
  );
};

export default HttpSettings;
