import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import dynamicIconImports from 'lucide-react/dynamicIconImports';
import DOMPurify from 'dompurify';
import { readCustomIcon } from 'utils/icons';
import StyledWrapper from './StyledWrapper';

export const DEFAULT_COLLECTION_ICON = 'box';
const DEFAULT_CUSTOM_ICON_FORMAT = 'svg';

const LucideIcon = ({ name, size, className, strokeWidth }) => {
  const IconComponent = useMemo(() => {
    const importFn = dynamicIconImports[name] || dynamicIconImports[DEFAULT_COLLECTION_ICON];
    if (!importFn) {
      return null;
    }

    return lazy(importFn);
  }, [name]);

  if (!IconComponent) {
    return null;
  }

  return (
    <Suspense fallback={<span className="collection-icon-fallback" style={{ width: size, height: size }} />}>
      <IconComponent size={size} className={className} strokeWidth={strokeWidth} aria-hidden="true" />
    </Suspense>
  );
};

const CustomPackIcon = ({ pack, name, format = DEFAULT_CUSTOM_ICON_FORMAT, size, className }) => {
  const [iconPayload, setIconPayload] = useState(null);

  useEffect(() => {
    let active = true;

    readCustomIcon(pack, name, format)
      .then((payload) => {
        if (active) {
          setIconPayload(payload);
        }
      })
      .catch(() => {
        if (active) {
          setIconPayload(null);
        }
      });

    return () => {
      active = false;
    };
  }, [pack, name, format]);

  if (!iconPayload) {
    return (
      <LucideIcon
        name={DEFAULT_COLLECTION_ICON}
        size={size}
        className={className}
        strokeWidth={1.5}
      />
    );
  }

  if (iconPayload.type === 'image' && iconPayload.dataUrl) {
    return (
      <img
        src={iconPayload.dataUrl}
        alt=""
        className={`custom-collection-image ${className || ''}`}
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
        width={size}
        height={size}
        aria-hidden="true"
      />
    );
  }

  const sanitized = DOMPurify.sanitize(iconPayload.content || '', {
    USE_PROFILES: { svg: true, svgFilters: true }
  });

  return (
    <span
      className={`custom-collection-icon ${className || ''}`}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
      dangerouslySetInnerHTML={{ __html: sanitized }}
      aria-hidden="true"
    />
  );
};

const CollectionIcon = ({ icon, size = 14, className, strokeWidth = 1.5 }) => {
  if (icon?.source === 'custom' && icon?.pack && icon?.name) {
    return (
      <StyledWrapper $size={size}>
        <CustomPackIcon
          pack={icon.pack}
          name={icon.name}
          format={icon.format || DEFAULT_CUSTOM_ICON_FORMAT}
          size={size}
          className={className}
        />
      </StyledWrapper>
    );
  }

  const iconName = icon?.source === 'lucide' && icon?.name ? icon.name : DEFAULT_COLLECTION_ICON;

  return (
    <StyledWrapper $size={size}>
      <LucideIcon
        name={iconName}
        size={size}
        className={className}
        strokeWidth={strokeWidth}
      />
    </StyledWrapper>
  );
};

export default CollectionIcon;
