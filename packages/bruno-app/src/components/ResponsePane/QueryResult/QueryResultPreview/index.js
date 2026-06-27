import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Virtuoso } from 'react-virtuoso';
import CodeEditor from 'components/CodeEditor/index';
import { getRawResponseText } from 'utils/common';
import { get } from 'lodash';
import { useDispatch, useSelector } from 'react-redux';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { usePersistedState } from 'hooks/usePersistedState';
import { Document, Page } from 'react-pdf';
import 'pdfjs-dist/build/pdf.worker';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { GlobalWorkerOptions } from 'pdfjs-dist/build/pdf';
GlobalWorkerOptions.workerSrc = 'pdfjs-dist/legacy/build/pdf.worker.min.mjs';
import XmlPreview from './XmlPreview/index';
import TextPreview from './TextPreview';
import HtmlPreview from './HtmlPreview';
import VideoPreview from './VideoPreview';
import JsonPreview from './JsonPreview';

const LIGHTWEIGHT_VIRTUALIZE_LINE_THRESHOLD = 500;
const LONG_LINE_CHUNK_SIZE = 2000;

const splitIntoDisplayLines = (text) => {
  if (!text) {
    return [];
  }

  return text.split('\n').flatMap((line) => {
    if (line.length <= LONG_LINE_CHUNK_SIZE) {
      return [line];
    }

    const chunks = [];
    for (let index = 0; index < line.length; index += LONG_LINE_CHUNK_SIZE) {
      chunks.push(line.slice(index, index + LONG_LINE_CHUNK_SIZE));
    }
    return chunks;
  });
};

const preContentStyle = {
  maxWidth: '100%',
  overflowWrap: 'anywhere',
  wordBreak: 'break-all',
  whiteSpace: 'pre-wrap'
};

const viewerContainerClassName = 'h-full w-full min-h-0 min-w-0 max-w-full overflow-y-auto overflow-x-hidden';

const LightweightResponseViewer = ({
  data,
  dataBuffer,
  value,
  initialScroll,
  onScroll,
  displayedTheme
}) => {
  const scrollerRef = useRef(null);
  const preRef = useRef(null);
  const [content, setContent] = useState(null);
  const [virtuosoScroller, setVirtuosoScroller] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const materialize = () => {
      const text = typeof value === 'string' && value.length
        ? value
        : getRawResponseText(data, dataBuffer);

      if (!cancelled) {
        setContent(text || '');
      }
    };

    const timerId = setTimeout(materialize, 0);

    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
  }, [data, dataBuffer, value]);

  const lines = useMemo(() => splitIntoDisplayLines(content), [content]);

  const shouldVirtualize = lines.length >= LIGHTWEIGHT_VIRTUALIZE_LINE_THRESHOLD;
  const textColor = displayedTheme === 'dark' ? '#e5e7eb' : '#111827';

  useEffect(() => {
    if (shouldVirtualize || content === null) {
      return;
    }

    if (preRef.current) {
      preRef.current.textContent = content;
    }
  }, [content, shouldVirtualize]);

  useEffect(() => {
    if (scrollerRef.current && !shouldVirtualize) {
      scrollerRef.current.scrollTop = initialScroll || 0;
    }
  }, [initialScroll, shouldVirtualize, content]);

  useEffect(() => {
    if (!virtuosoScroller || !shouldVirtualize) {
      return;
    }

    virtuosoScroller.scrollTop = initialScroll || 0;
  }, [virtuosoScroller, initialScroll, shouldVirtualize, content]);

  useEffect(() => {
    if (!virtuosoScroller || !shouldVirtualize) {
      return;
    }

    const handleVirtuosoScroll = () => {
      onScroll?.(virtuosoScroller.scrollTop);
    };

    virtuosoScroller.addEventListener('scroll', handleVirtuosoScroll, { passive: true });
    return () => virtuosoScroller.removeEventListener('scroll', handleVirtuosoScroll);
  }, [virtuosoScroller, shouldVirtualize, onScroll]);

  const handleScroll = (event) => {
    onScroll?.(event.target.scrollTop);
  };

  if (content === null) {
    return (
      <div
        data-testid="lightweight-response-viewer"
        className="h-full w-full flex items-center justify-center px-4 text-xs muted"
      >
        Loading response...
      </div>
    );
  }

  if (shouldVirtualize) {
    return (
      <div
        data-testid="lightweight-response-viewer"
        className={`${viewerContainerClassName} overflow-y-hidden`}
        style={{ color: textColor }}
      >
        <Virtuoso
          scrollerRef={setVirtuosoScroller}
          style={{ height: '100%', width: '100%', maxWidth: '100%', overflowX: 'hidden' }}
          totalCount={lines.length}
          itemContent={(index) => (
            <pre
              className="m-0 px-4 font-mono text-[12px] max-w-full overflow-x-hidden"
              style={{ ...preContentStyle, color: textColor }}
            >
              {lines[index]}
            </pre>
          )}
        />
      </div>
    );
  }

  return (
    <div
      ref={scrollerRef}
      data-testid="lightweight-response-viewer"
      className={`${viewerContainerClassName} px-4 pb-4`}
      tabIndex={0}
      style={{
        color: textColor,
        backgroundColor: 'transparent',
        outline: 'none'
      }}
      onScroll={handleScroll}
    >
      <pre
        ref={preRef}
        className="m-0 font-mono text-[12px] max-w-full overflow-x-hidden"
        style={{
          color: 'inherit',
          backgroundColor: 'transparent',
          ...preContentStyle
        }}
      />
    </div>
  );
};

const QueryResultPreview = ({
  selectedTab,
  data,
  dataBuffer,
  formattedData,
  item,
  contentType,
  collection,
  codeMirrorMode,
  previewMode,
  disableRunEventListener,
  displayedTheme,
  docKey,
  useSimplifiedView
}) => {
  const preferences = useSelector((state) => state.app.preferences);
  const dispatch = useDispatch();
  const editorRef = useRef(null);
  const [responseScroll, setResponseScroll] = usePersistedState({ key: `response-body-scroll-${item.uid}`, default: 0 });

  const [numPages, setNumPages] = useState(null);
  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  const onRun = () => {
    if (disableRunEventListener) {
      return;
    }

    dispatch(sendRequest(item, collection.uid));
  };

  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));

  if (selectedTab === 'editor') {
    if (useSimplifiedView) {
      return (
        <LightweightResponseViewer
          data={data}
          dataBuffer={dataBuffer}
          value={formattedData}
          initialScroll={responseScroll}
          onScroll={setResponseScroll}
          displayedTheme={displayedTheme}
        />
      );
    }

    return (
      <CodeEditor
        ref={editorRef}
        collection={collection}
        docKey={docKey || 'response:editor'}
        font={get(preferences, 'font.codeFont', 'default')}
        fontSize={get(preferences, 'font.codeFontSize')}
        theme={displayedTheme}
        onRun={onRun}
        onSave={onSave}
        value={formattedData}
        mode={codeMirrorMode}
        initialScroll={responseScroll}
        onScroll={setResponseScroll}
        readOnly
      />
    );
  }

  switch (previewMode) {
    case 'preview-web': {
      const baseUrl = item.requestSent?.url || '';
      return <HtmlPreview data={data} baseUrl={baseUrl} />;
    }
    case 'preview-image': {
      return <img src={`data:${contentType.replace(/\;(.*)/, '')};base64,${dataBuffer}`} />;
    }
    case 'preview-pdf': {
      return (
        <div className="preview-pdf" style={{ height: '100%', overflow: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
          <Document file={`data:application/pdf;base64,${dataBuffer}`} onLoadSuccess={onDocumentLoadSuccess}>
            {Array.from(new Array(numPages), (el, index) => (
              <Page key={`page_${index + 1}`} pageNumber={index + 1} renderAnnotationLayer={false} />
            ))}
          </Document>
        </div>
      );
    }
    case 'preview-audio': {
      return (
        <audio controls src={`data:${contentType.replace(/\;(.*)/, '')};base64,${dataBuffer}`} className="mx-auto" />
      );
    }
    case 'preview-video': {
      return <VideoPreview contentType={contentType} dataBuffer={dataBuffer} />;
    }
    case 'preview-json': {
      return <JsonPreview data={data} displayedTheme={displayedTheme} />;
    }

    case 'preview-text': {
      if (useSimplifiedView) {
        return (
          <LightweightResponseViewer
            data={data}
            dataBuffer={dataBuffer}
            value={formattedData}
            initialScroll={responseScroll}
            onScroll={setResponseScroll}
            displayedTheme={displayedTheme}
          />
        );
      }

      return <TextPreview data={data} />;
    }

    case 'preview-xml': {
      return <XmlPreview data={data} />;
    }

    default:
      return (
        <div className="p-4 flex flex-col items-center justify-center h-full text-center">
          <div className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">
            No Preview Available
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Sorry, no preview is available for this content type.
          </div>
        </div>
      );
  }
};

export default QueryResultPreview;
