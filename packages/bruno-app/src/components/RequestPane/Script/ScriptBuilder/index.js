import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IconBraces, IconX, IconArrowBackUp } from '@tabler/icons';
import { variableNameRegex } from 'utils/common/regex';
import {
  generateSnippet,
  getActionsForPhase,
  mergeScript,
  parseJsonSample
} from 'utils/script-builder';
import StyledWrapper from './StyledWrapper';

const TITLES = {
  'pre-request': 'Script Builder · Pre Request',
  'post-response': 'Script Builder · Post Response'
};

const isValidScriptType = (scriptType) => TITLES[scriptType] !== undefined;

const ScriptBuilder = ({ scriptType, currentScript, onApply }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [sampleJson, setSampleJson] = useState('');
  const [selectedPath, setSelectedPath] = useState('');
  const [actionId, setActionId] = useState('');
  const [varName, setVarName] = useState('');
  const [headerName, setHeaderName] = useState('');
  const [queryParamName, setQueryParamName] = useState('');
  const [generated, setGenerated] = useState(null);
  const [applyMode, setApplyMode] = useState('replace');
  const buttonRef = useRef(null);

  const title = TITLES[scriptType] || 'Script Builder';
  const actions = useMemo(() => getActionsForPhase(scriptType), [scriptType]);
  const parsedSample = useMemo(() => parseJsonSample(sampleJson), [sampleJson]);
  const selectedAction = useMemo(() => actions.find((action) => action.id === actionId), [actions, actionId]);
  const hasExistingScript = Boolean(currentScript && currentScript.trim().length > 0);

  useEffect(() => {
    if (!actions.some((action) => action.id === actionId)) {
      setActionId(actions[0]?.id || '');
    }
  }, [actions, actionId]);

  useEffect(() => {
    if (!parsedSample.paths.some((entry) => entry.path === selectedPath)) {
      setSelectedPath(parsedSample.paths[0]?.path || '');
    }
  }, [parsedSample.paths, selectedPath]);

  useEffect(() => {
    if (selectedPath && !varName) {
      const leafName = selectedPath.split('.').pop() || '';
      if (variableNameRegex.test(leafName)) {
        setVarName(leafName);
      }
    }
  }, [selectedPath, varName]);

  const close = useCallback(() => {
    setIsOpen(false);
    setGenerated(null);
  }, []);

  const attachPopup = useCallback((el) => {
    if (!el) return undefined;

    const onDocMouseDown = (e) => {
      if (!el.contains(e.target) && !buttonRef.current?.contains(e.target)) {
        close();
      }
    };

    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };

    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [close]);

  const validationError = useMemo(() => {
    if (parsedSample.error) {
      return parsedSample.error;
    }

    if (!sampleJson.trim()) {
      return 'Cole um JSON de exemplo.';
    }

    if (scriptType === 'post-response' && !selectedPath) {
      return 'Selecione uma propriedade do JSON.';
    }

    if (!actionId) {
      return 'Selecione uma ação.';
    }

    if (selectedAction?.requiresVarName && (!varName || !variableNameRegex.test(varName))) {
      return 'Informe um nome de variável válido.';
    }

    if (selectedAction?.requiresHeaderName && !headerName.trim()) {
      return 'Informe o nome do header.';
    }

    if (selectedAction?.requiresQueryParamName && !queryParamName.trim()) {
      return 'Informe o nome do query param.';
    }

    if (selectedAction?.requiresPropertyPath && !selectedPath) {
      return 'Selecione a propriedade do body a ser definida.';
    }

    return null;
  }, [
    parsedSample.error,
    sampleJson,
    scriptType,
    selectedPath,
    actionId,
    selectedAction,
    varName,
    headerName,
    queryParamName
  ]);

  const handleGenerate = useCallback(() => {
    if (validationError) return;

    const snippet = generateSnippet({
      scriptPhase: scriptType,
      actionId,
      propertyPath: selectedPath,
      varName: varName.trim(),
      headerName: headerName.trim(),
      queryParamName: queryParamName.trim()
    });

    setGenerated(snippet);
    setApplyMode(hasExistingScript ? 'append' : 'replace');
  }, [
    validationError,
    scriptType,
    actionId,
    selectedPath,
    varName,
    headerName,
    queryParamName,
    hasExistingScript
  ]);

  const handleApply = useCallback(() => {
    if (!generated) return;

    const nextScript = mergeScript(currentScript, generated, hasExistingScript ? applyMode : 'replace');
    onApply(nextScript);
    setGenerated(null);
    close();
  }, [generated, currentScript, hasExistingScript, applyMode, onApply, close]);

  const handleBackToForm = useCallback(() => {
    setGenerated(null);
  }, []);

  if (!isValidScriptType(scriptType)) return null;

  return (
    <StyledWrapper>
      <button
        ref={buttonRef}
        className={`script-builder-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen((value) => !value)}
        title={title}
        type="button"
        aria-label={title}
        data-testid="script-builder-trigger"
      >
        <IconBraces size={14} strokeWidth={1.75} />
      </button>

      {isOpen && (
        <div ref={attachPopup} className="script-builder-popup" role="dialog" aria-label={title}>
          <div className="popup-header">
            <span className="popup-title">
              <IconBraces size={12} strokeWidth={1.75} />
              {title}
            </span>
            <button className="popup-close" onClick={close} type="button" aria-label="Close">
              <IconX size={14} />
            </button>
          </div>

          {generated == null ? (
            <>
              <div className="popup-body">
                <label className="field-label" htmlFor="script-builder-json">JSON de exemplo</label>
                <textarea
                  id="script-builder-json"
                  className="popup-input popup-textarea"
                  value={sampleJson}
                  onChange={(e) => setSampleJson(e.target.value)}
                  placeholder='{"access_token": "..."}'
                  rows={5}
                  data-testid="script-builder-json"
                />
                {scriptType === 'pre-request' && (
                  <div className="field-hint">
                    O JSON é usado apenas para descobrir propriedades. O script gerado lê o valor de uma variável Bruno.
                  </div>
                )}

                {parsedSample.error && <div className="popup-error">{parsedSample.error}</div>}

                {parsedSample.paths.length > 0 && (
                  <>
                    <label className="field-label" htmlFor="script-builder-property">Propriedade</label>
                    <select
                      id="script-builder-property"
                      className="popup-select"
                      value={selectedPath}
                      onChange={(e) => setSelectedPath(e.target.value)}
                      data-testid="script-builder-property"
                    >
                      {parsedSample.paths.map((entry) => (
                        <option key={entry.path} value={entry.path}>
                          {entry.path} ({entry.valueType})
                        </option>
                      ))}
                    </select>
                  </>
                )}

                <label className="field-label" htmlFor="script-builder-action">Ação</label>
                <select
                  id="script-builder-action"
                  className="popup-select"
                  value={actionId}
                  onChange={(e) => setActionId(e.target.value)}
                  data-testid="script-builder-action"
                >
                  {actions.map((action) => (
                    <option key={action.id} value={action.id}>{action.label}</option>
                  ))}
                </select>

                {selectedAction?.requiresVarName && (
                  <>
                    <label className="field-label" htmlFor="script-builder-var-name">Nome da variável</label>
                    <input
                      id="script-builder-var-name"
                      className="popup-input"
                      value={varName}
                      onChange={(e) => setVarName(e.target.value)}
                      placeholder="access_token"
                      data-testid="script-builder-var-name"
                    />
                  </>
                )}

                {selectedAction?.requiresHeaderName && (
                  <>
                    <label className="field-label" htmlFor="script-builder-header-name">Nome do header</label>
                    <input
                      id="script-builder-header-name"
                      className="popup-input"
                      value={headerName}
                      onChange={(e) => setHeaderName(e.target.value)}
                      placeholder="Authorization"
                      data-testid="script-builder-header-name"
                    />
                  </>
                )}

                {selectedAction?.requiresQueryParamName && (
                  <>
                    <label className="field-label" htmlFor="script-builder-query-param">Query param</label>
                    <input
                      id="script-builder-query-param"
                      className="popup-input"
                      value={queryParamName}
                      onChange={(e) => setQueryParamName(e.target.value)}
                      placeholder="access_token"
                      data-testid="script-builder-query-param"
                    />
                  </>
                )}

                {validationError && !parsedSample.error && (
                  <div className="popup-error">{validationError}</div>
                )}
              </div>

              <div className="popup-footer">
                <span className="field-hint">Gera script JS compatível com o runtime Bruno</span>
                <button
                  className="btn-generate"
                  type="button"
                  onClick={handleGenerate}
                  disabled={Boolean(validationError)}
                  data-testid="script-builder-generate"
                >
                  Gerar
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="popup-body">
                <div className="preview-section">
                  <span className="preview-label">Preview do script</span>
                  <pre className="preview-code" data-testid="script-builder-preview">{generated}</pre>
                </div>
              </div>

              <div className="popup-footer">
                <div className="preview-modes">
                  {hasExistingScript ? (
                    <>
                      <span>Aplicar:</span>
                      <button
                        type="button"
                        className={`preview-mode-btn ${applyMode === 'replace' ? 'active' : ''}`}
                        onClick={() => setApplyMode('replace')}
                      >
                        Substituir
                      </button>
                      <button
                        type="button"
                        className={`preview-mode-btn ${applyMode === 'append' ? 'active' : ''}`}
                        onClick={() => setApplyMode('append')}
                      >
                        Anexar
                      </button>
                    </>
                  ) : (
                    <span className="field-hint">Substituir script vazio</span>
                  )}
                </div>
                <div style={{ display: 'inline-flex', gap: 8 }}>
                  <button className="btn-secondary" type="button" onClick={handleBackToForm}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <IconArrowBackUp size={12} /> Voltar
                    </span>
                  </button>
                  <button className="btn-generate" type="button" onClick={handleApply} data-testid="script-builder-apply">
                    Aplicar
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </StyledWrapper>
  );
};

export default ScriptBuilder;
