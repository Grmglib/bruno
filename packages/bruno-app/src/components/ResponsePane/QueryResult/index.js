import { debounce } from 'lodash';
import { useTheme } from 'providers/Theme/index';
import React, { useEffect, useMemo, useState } from 'react';
import { formatResponse, getContentType } from 'utils/common';
import { getDefaultResponseFormat, detectContentTypeFromBase64, getResponsePerformanceProfile } from 'utils/response';
import LargeResponseWarning from '../LargeResponseWarning';
import QueryResultFilter from './QueryResultFilter';
import QueryResultPreview from './QueryResultPreview';
import StyledWrapper from './StyledWrapper';

// Raw format options (for byte format types)
const RAW_FORMAT_OPTIONS = [
  { id: 'raw', label: 'Raw', type: 'item', codeMirrorMode: 'text/plain' },
  { id: 'hex', label: 'Hex', type: 'item', codeMirrorMode: 'text/plain' },
  { id: 'base64', label: 'Base64', type: 'item', codeMirrorMode: 'text/plain' }
];

// Preview format options
const PREVIEW_FORMAT_OPTIONS = [
  // Structured formats
  { id: 'json', label: 'JSON', type: 'item', codeMirrorMode: 'application/ld+json' },
  { id: 'html', label: 'HTML', type: 'item', codeMirrorMode: 'xml' },
  { id: 'xml', label: 'XML', type: 'item', codeMirrorMode: 'xml' },
  { id: 'javascript', label: 'JavaScript', type: 'item', codeMirrorMode: 'javascript' },
  // Divider
  { type: 'divider', id: 'divider-structured-raw' },
  // Raw formats
  ...RAW_FORMAT_OPTIONS
];

const formatErrorMessage = (error) => {
  if (!error) return 'Something went wrong';

  const remoteMethodError = 'Error invoking remote method \'send-http-request\':';

  if (error?.includes(remoteMethodError)) {
    const parts = error.split(remoteMethodError);
    return parts[1]?.trim() || error;
  }

  return error;
};

// Custom hook to determine the initial format and tab based on the data buffer and headers
export const useInitialResponseFormat = (dataBuffer, headers) => {
  return useMemo(() => {
    const detectedContentType = detectContentTypeFromBase64(dataBuffer);
    const contentType = getContentType(headers);

    // Wait until both content types are available
    if (detectedContentType === null || contentType === undefined) {
      return { initialFormat: null, initialTab: null, contentType: contentType };
    }

    const initial = getDefaultResponseFormat(contentType);
    return { initialFormat: initial.format, initialTab: initial.tab, contentType: contentType };
  }, [dataBuffer, headers]);
};

// Custom hook to determine preview format options based on content type
export const useResponsePreviewFormatOptions = (dataBuffer, headers) => {
  return useMemo(() => {
    const detectedContentType = detectContentTypeFromBase64(dataBuffer);
    const contentType = getContentType(headers);

    const byteFormatTypes = ['image', 'video', 'audio', 'pdf', 'zip'];

    const isByteFormatType = (contentType) => {
      if (contentType.toLowerCase().includes('svg')) return false; // SVG is text-based
      return byteFormatTypes.some((type) => contentType.includes(type));
    };

    const getContentTypeToCheck = () => {
      if (detectedContentType) {
        return detectedContentType;
      }
      return contentType;
    };

    const contentTypeToCheck = getContentTypeToCheck();

    if (contentTypeToCheck && isByteFormatType(contentTypeToCheck)) {
      // Return only raw format options (no structured formats)
      return RAW_FORMAT_OPTIONS;
    }

    // Return all format options
    return PREVIEW_FORMAT_OPTIONS;
  }, [dataBuffer, headers]);
};

const QueryResult = ({
  item,
  collection,
  data,
  dataBuffer,
  disableRunEventListener,
  headers,
  error,
  selectedFormat, // one of the options in PREVIEW_FORMAT_OPTIONS
  selectedTab, // 'editor' or 'preview'
  filter,
  filterExpanded,
  onFilterChange,
  onFilterExpandChange,
  docKey
}) => {
  const contentType = getContentType(headers);
  const [showLargeResponse, setShowLargeResponse] = useState(false);
  const [forceFullRender, setForceFullRender] = useState(false);
  const { displayedTheme } = useTheme();
  const isTextualFormat = useMemo(
    () => ['json', 'html', 'xml', 'javascript', 'raw'].includes(selectedFormat),
    [selectedFormat]
  );

  const responseSize = useMemo(() => {
    const response = item.response || {};
    if (typeof response.size === 'number') {
      return response.size;
    }

    // Fallback: estimate from base64 length (base64 is ~4/3 of original size)
    if (dataBuffer && typeof dataBuffer === 'string') {
      return Math.floor(dataBuffer.length * 0.75);
    }
    return 0;
  }, [dataBuffer, item.response]);

  const responsePerformanceProfile = useMemo(() => getResponsePerformanceProfile({
    data,
    dataBuffer,
    responseSize,
    isTextual: isTextualFormat
  }), [data, dataBuffer, responseSize, isTextualFormat]);
  const isLargeResponse = responsePerformanceProfile.shouldWarnBeforeRender;
  const shouldUseSimplifiedView = responsePerformanceProfile.shouldUseSimplifiedView;
  const useSimplifiedView = shouldUseSimplifiedView && !forceFullRender;

  useEffect(() => {
    setForceFullRender(false);
  }, [dataBuffer, selectedFormat]);

  const detectedContentType = useMemo(() => {
    return detectContentTypeFromBase64(dataBuffer);
  }, [dataBuffer]);

  const formattedData = useMemo(
    () => {
      if (useSimplifiedView) {
        return '';
      }

      if (isLargeResponse && !showLargeResponse) {
        return '';
      }

      return formatResponse(data, dataBuffer, selectedFormat, filter);
    },
    [data, dataBuffer, selectedFormat, filter, isLargeResponse, showLargeResponse, useSimplifiedView]
  );

  const handleFilterChange = (value) => {
    if (onFilterChange) {
      onFilterChange(value);
    }
  };

  const previewMode = useMemo(() => {
    if (useSimplifiedView && isTextualFormat) return 'preview-text';

    // Derive preview mode based on selected format
    if (selectedFormat === 'html') return 'preview-web';
    if (selectedFormat === 'json') return 'preview-json';
    if (selectedFormat === 'xml') return 'preview-xml';
    if (selectedFormat === 'raw') return 'preview-text';
    if (selectedFormat === 'javascript') return 'preview-web';

    // For base64/hex, check content type to determine binary preview type
    if (selectedFormat === 'base64' || selectedFormat === 'hex') {
      if (detectedContentType) {
        if (detectedContentType.includes('image')) return 'preview-image';
        if (detectedContentType.includes('pdf')) return 'preview-pdf';
        if (detectedContentType.includes('audio')) return 'preview-audio';
        if (detectedContentType.includes('video')) return 'preview-video';
      }
      // for all other content types, return preview-text
      return 'preview-text';
    }
    return 'preview-text';
  }, [selectedFormat, detectedContentType, useSimplifiedView, isTextualFormat]);

  const codeMirrorMode = useMemo(() => {
    if (useSimplifiedView) {
      return 'text/plain';
    }

    // Find the codeMirrorMode from PREVIEW_FORMAT_OPTIONS (contains all format options)
    return PREVIEW_FORMAT_OPTIONS
      .filter((option) => option.type === 'item' || !option.type)
      .find((option) => option.id === selectedFormat)?.codeMirrorMode || 'text/plain';
  }, [selectedFormat, useSimplifiedView]);

  const queryFilterEnabled = useMemo(
    () => !useSimplifiedView && codeMirrorMode.includes('json') && selectedFormat === 'json' && selectedTab === 'editor',
    [codeMirrorMode, selectedFormat, selectedTab, useSimplifiedView]
  );
  const hasScriptError = item.preRequestScriptErrorMessage || item.postResponseScriptErrorMessage;

  return (
    <StyledWrapper
      className="w-full h-full relative flex min-w-0 max-w-full overflow-hidden"
      queryFilterEnabled={queryFilterEnabled}
    >
      {error ? (
        <div>
          {hasScriptError ? null : (
            <div className="error" style={{ whiteSpace: 'pre-line' }}>{formatErrorMessage(error)}</div>
          )}

          {error && typeof error === 'string' && error.toLowerCase().includes('self signed certificate') ? (
            <div className="mt-6 muted text-xs">
              You can disable SSL verification in the Preferences. <br />
              To open the Preferences, click on the gear icon in the bottom left corner.
            </div>
          ) : null}
        </div>
      ) : isLargeResponse && !showLargeResponse ? (
        <LargeResponseWarning
          item={item}
          responseSize={responseSize}
          estimatedLineCount={responsePerformanceProfile.estimatedLineCount}
          onRevealResponse={() => setShowLargeResponse(true)}
        />
      ) : (
        <div className="h-full flex flex-col min-h-0 min-w-0 max-w-full overflow-hidden">
          {shouldUseSimplifiedView && (
            <div className="px-4 py-2 text-xs muted flex items-center justify-between gap-3 shrink-0">
              <span>
                {useSimplifiedView
                  ? 'Performance mode enabled for this response. You are viewing the raw response in a lightweight viewer to keep the UI responsive.'
                  : 'Full rendering was re-enabled for this response and may become slow again.'}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                {useSimplifiedView ? (
                  <button
                    type="button"
                    className="underline"
                    onClick={() => setForceFullRender(true)}
                    data-testid="response-full-render-btn"
                  >
                    Try full render
                  </button>
                ) : (
                  <button
                    type="button"
                    className="underline"
                    onClick={() => setForceFullRender(false)}
                    data-testid="response-lightweight-view-btn"
                  >
                    Back to lightweight view
                  </button>
                )}
              </div>
            </div>
          )}
          <div className={`flex-1 min-h-0 min-w-0 max-w-full ${useSimplifiedView ? 'overflow-hidden' : 'relative'}`}>
            {useSimplifiedView ? (
              <div className="h-full min-h-0 min-w-0 max-w-full overflow-hidden" data-testid="response-preview-container">
                <QueryResultPreview
                  selectedTab={selectedTab}
                  data={data}
                  dataBuffer={dataBuffer}
                  formattedData={formattedData}
                  item={item}
                  contentType={detectedContentType ?? contentType}
                  previewMode={previewMode}
                  codeMirrorMode={codeMirrorMode}
                  collection={collection}
                  disableRunEventListener={disableRunEventListener}
                  displayedTheme={displayedTheme}
                  docKey={docKey}
                  useSimplifiedView={useSimplifiedView}
                />
              </div>
            ) : (
              <>
                <div className="absolute top-0 left-0 h-full w-full" data-testid="response-preview-container">
                  <QueryResultPreview
                    selectedTab={selectedTab}
                    data={data}
                    dataBuffer={dataBuffer}
                    formattedData={formattedData}
                    item={item}
                    contentType={detectedContentType ?? contentType}
                    previewMode={previewMode}
                    codeMirrorMode={codeMirrorMode}
                    collection={collection}
                    disableRunEventListener={disableRunEventListener}
                    displayedTheme={displayedTheme}
                    docKey={docKey}
                    useSimplifiedView={useSimplifiedView}
                  />
                </div>
                {queryFilterEnabled && (
                  <QueryResultFilter
                    filter={filter}
                    filterExpanded={filterExpanded}
                    onChange={handleFilterChange}
                    onExpandChange={onFilterExpandChange}
                    mode={codeMirrorMode}
                  />
                )}
              </>
            )}
          </div>
        </div>
      )}
    </StyledWrapper>
  );
};

export default QueryResult;
