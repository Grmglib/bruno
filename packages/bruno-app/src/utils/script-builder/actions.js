export const POST_RESPONSE_ACTIONS = [
  {
    id: 'set-env-var',
    label: 'Salvar em variável de ambiente',
    requiresVarName: true
  },
  {
    id: 'set-env-var-persist',
    label: 'Salvar em variável de ambiente (persistir)',
    requiresVarName: true
  },
  {
    id: 'set-runtime-var',
    label: 'Salvar em variável de runtime',
    requiresVarName: true
  }
];

export const PRE_REQUEST_ACTIONS = [
  {
    id: 'set-header-from-env',
    label: 'Definir header a partir de variável',
    requiresVarName: true,
    requiresHeaderName: true
  },
  {
    id: 'set-body-field-from-env',
    label: 'Definir campo do body a partir de variável',
    requiresVarName: true,
    requiresPropertyPath: true
  },
  {
    id: 'set-query-param-from-env',
    label: 'Definir query param a partir de variável',
    requiresVarName: true,
    requiresQueryParamName: true
  }
];

export const getActionsForPhase = (scriptPhase) => {
  return scriptPhase === 'pre-request' ? PRE_REQUEST_ACTIONS : POST_RESPONSE_ACTIONS;
};
