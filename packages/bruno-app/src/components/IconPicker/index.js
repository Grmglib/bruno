import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dynamicIconImports from 'lucide-react/dynamicIconImports';
import { Virtuoso } from 'react-virtuoso';
import { IconFolder } from '@tabler/icons';
import Modal from 'components/Modal';
import Button from 'ui/Button';
import CollectionIcon from 'components/CollectionIcon';
import { listIconPacks, openIconsFolder } from 'utils/icons';
import StyledWrapper from './StyledWrapper';

const LUCIDE_TAB = 'lucide';
const COLUMNS = 8;
const DEFAULT_CUSTOM_ICON_FORMAT = 'svg';
const LUCIDE_ICON_NAMES = Object.keys(dynamicIconImports).sort((a, b) => a.localeCompare(b));

const chunkIcons = (icons) => {
  const rows = [];

  for (let index = 0; index < icons.length; index += COLUMNS) {
    rows.push(icons.slice(index, index + COLUMNS));
  }

  return rows;
};

const getCustomIconKey = (icon) => `${icon.name}-${icon.format || DEFAULT_CUSTOM_ICON_FORMAT}`;

const isSameIcon = (left, right) => {
  if (!left && !right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return left.source === right.source
    && left.name === right.name
    && (left.pack || '') === (right.pack || '')
    && (left.format || DEFAULT_CUSTOM_ICON_FORMAT) === (right.format || DEFAULT_CUSTOM_ICON_FORMAT);
};

const IconPicker = ({ isOpen, onClose, value, onChange }) => {
  const [activeTab, setActiveTab] = useState(LUCIDE_TAB);
  const [search, setSearch] = useState('');
  const [customPacks, setCustomPacks] = useState([]);

  const loadCustomPacks = useCallback(async () => {
    try {
      const packs = await listIconPacks();
      setCustomPacks(packs || []);
    } catch (error) {
      setCustomPacks([]);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadCustomPacks();
      setSearch('');
      if (value?.source === 'custom' && value?.pack) {
        setActiveTab(value.pack);
      } else {
        setActiveTab(LUCIDE_TAB);
      }
    }
  }, [isOpen, loadCustomPacks, value]);

  const lucideIcons = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return LUCIDE_ICON_NAMES;
    }

    return LUCIDE_ICON_NAMES.filter((name) => name.includes(query));
  }, [search]);

  const activeCustomPack = useMemo(() => {
    return customPacks.find((pack) => pack.id === activeTab);
  }, [activeTab, customPacks]);

  const customIcons = useMemo(() => {
    if (!activeCustomPack) {
      return [];
    }

    const query = search.trim().toLowerCase();
    if (!query) {
      return activeCustomPack.icons;
    }

    return activeCustomPack.icons.filter((icon) => {
      const label = `${icon.name}.${icon.format || DEFAULT_CUSTOM_ICON_FORMAT}`;
      return icon.name.includes(query) || label.includes(query);
    });
  }, [activeCustomPack, search]);

  const activeIcons = activeTab === LUCIDE_TAB ? lucideIcons : customIcons;
  const iconRows = useMemo(() => chunkIcons(activeIcons), [activeIcons]);

  const handleSelectLucideIcon = (name) => {
    onChange({
      source: 'lucide',
      name
    });
    onClose();
  };

  const handleSelectCustomIcon = (icon) => {
    const iconConfig = {
      source: 'custom',
      pack: activeCustomPack.id,
      name: icon.name
    };

    if (icon.format && icon.format !== DEFAULT_CUSTOM_ICON_FORMAT) {
      iconConfig.format = icon.format;
    }

    onChange(iconConfig);
    onClose();
  };

  const handleRemoveIcon = () => {
    onChange(null);
    onClose();
  };

  const handleOpenIconsFolder = async () => {
    await openIconsFolder();
    await loadCustomPacks();
  };

  const renderIconRow = (index, rowIcons) => (
    <div className="icon-picker-row" data-testid={`icon-picker-row-${index}`}>
      {rowIcons.map((iconItem) => {
        const isLucide = activeTab === LUCIDE_TAB;
        const iconValue = isLucide
          ? { source: 'lucide', name: iconItem }
          : {
              source: 'custom',
              pack: activeCustomPack.id,
              name: iconItem.name,
              format: iconItem.format || DEFAULT_CUSTOM_ICON_FORMAT
            };
        const iconKey = isLucide ? iconItem : getCustomIconKey(iconItem);
        const iconTitle = isLucide
          ? iconItem
          : `${iconItem.name}.${iconItem.format || DEFAULT_CUSTOM_ICON_FORMAT}`;
        const selected = isSameIcon(value, iconValue);

        return (
          <button
            key={iconKey}
            type="button"
            className={`icon-picker-item ${selected ? 'selected' : ''}`}
            onClick={() => (
              isLucide
                ? handleSelectLucideIcon(iconItem)
                : handleSelectCustomIcon(iconItem)
            )}
            title={iconTitle}
            data-testid={`icon-picker-item-${iconKey}`}
          >
            <CollectionIcon icon={iconValue} size={16} strokeWidth={1.5} />
          </button>
        );
      })}
    </div>
  );

  if (!isOpen) {
    return null;
  }

  return (
    <Modal
      size="lg"
      title="Choose Collection Icon"
      handleCancel={onClose}
      hideFooter
      dataTestId="icon-picker-modal"
    >
      <StyledWrapper>
        <div className="icon-picker-tabs">
          <button
            type="button"
            className={`icon-picker-tab ${activeTab === LUCIDE_TAB ? 'active' : ''}`}
            onClick={() => setActiveTab(LUCIDE_TAB)}
            data-testid="icon-picker-tab-lucide"
          >
            Lucide
          </button>
          {customPacks.map((pack) => (
            <button
              key={pack.id}
              type="button"
              className={`icon-picker-tab ${activeTab === pack.id ? 'active' : ''}`}
              onClick={() => setActiveTab(pack.id)}
              data-testid={`icon-picker-tab-${pack.id}`}
            >
              {pack.name}
            </button>
          ))}
        </div>

        <input
          type="text"
          className="icon-picker-search"
          placeholder={activeTab === LUCIDE_TAB ? 'Search Lucide icons...' : 'Search custom icons...'}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          data-testid="icon-picker-search"
        />

        {activeIcons.length === 0 ? (
          <div className="icon-picker-empty" data-testid="icon-picker-empty">
            {activeTab === LUCIDE_TAB
              ? 'No icons match your search.'
              : 'No custom icons found in this pack. Add .svg, .png, .jpg or .jpeg files to your icons folder and refresh.'}
          </div>
        ) : (
          <div className="icon-picker-grid" data-testid="icon-picker-grid">
            <Virtuoso
              style={{ height: '320px' }}
              totalCount={iconRows.length}
              itemContent={(index) => renderIconRow(index, iconRows[index])}
            />
          </div>
        )}

        <div className="icon-picker-footer">
          <div className="icon-picker-help">
            Custom icon packs live in your Bruno icons folder. Each subfolder is a pack of `.svg`, `.png`, `.jpg` or `.jpeg` files.
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              color="secondary"
              variant="ghost"
              onClick={handleOpenIconsFolder}
              icon={<IconFolder size={16} strokeWidth={1.5} />}
              data-testid="icon-picker-open-folder"
            >
              Open Icons Folder
            </Button>
            <Button
              type="button"
              color="secondary"
              variant="ghost"
              onClick={handleRemoveIcon}
              data-testid="icon-picker-remove"
            >
              Remove Icon
            </Button>
          </div>
        </div>
      </StyledWrapper>
    </Modal>
  );
};

export default IconPicker;
