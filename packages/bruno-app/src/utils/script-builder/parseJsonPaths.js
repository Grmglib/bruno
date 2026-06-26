const isPlainObject = (value) => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

export const collectJsonPaths = (value, prefix = '', paths = []) => {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      const nextPrefix = prefix ? `${prefix}.${index}` : String(index);
      collectJsonPaths(item, nextPrefix, paths);
    });
    return paths;
  }

  if (isPlainObject(value)) {
    Object.keys(value).forEach((key) => {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      collectJsonPaths(value[key], nextPrefix, paths);
    });
    return paths;
  }

  if (prefix) {
    paths.push({
      path: prefix,
      valueType: value === null ? 'null' : typeof value,
      sampleValue: value
    });
  }

  return paths;
};

export const parseJsonSample = (jsonString) => {
  const trimmed = (jsonString || '').trim();

  if (!trimmed) {
    return { data: null, error: null, paths: [] };
  }

  try {
    const data = JSON.parse(trimmed);
    const paths = collectJsonPaths(data);
    return { data, error: null, paths };
  } catch (error) {
    return {
      data: null,
      error: error?.message || 'Invalid JSON',
      paths: []
    };
  }
};

export const pathToJsAccess = (base, path) => {
  if (!path) {
    return base;
  }

  const segments = path.split('.');
  let expression = base;

  segments.forEach((segment) => {
    if (/^\d+$/.test(segment)) {
      expression += `[${segment}]`;
      return;
    }

    if (/^[a-zA-Z_$][\w$]*$/.test(segment)) {
      expression += `.${segment}`;
      return;
    }

    expression += `['${segment.replace(/\\/g, '\\\\').replace(/'/g, '\\\'')}']`;
  });

  return expression;
};
