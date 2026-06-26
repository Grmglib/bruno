import { BrunoError } from 'utils/common/error';
import { apidogToBruno } from '@usebruno/converters';

export const convertApidogToBruno = (data) => {
  try {
    return apidogToBruno(data);
  } catch (err) {
    console.error('Error converting Apidog to Bruno:', err);
    throw new BrunoError('Import collection failed: ' + err.message);
  }
};

export const isApidogCollection = (data) => {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  return data.apidogProject != null
    && data?.$schema?.app === 'apidog'
    && Array.isArray(data.apiCollection);
};

export const getApidogProjectFolderName = (data) => {
  const name = data?.info?.name;
  const trimmed = String(name ?? '').trim();
  if (!trimmed) {
    return 'apidog-project';
  }
  return trimmed.replace(/[^\p{L}\p{N}\-_\s]/gu, '_').replace(/\s+/g, '_').toLowerCase();
};

export const getApidogModuleCount = (data) => {
  if (!isApidogCollection(data)) {
    return 0;
  }

  const moduleIds = new Set();
  (data.apiCollection || []).forEach((entry) => {
    const countRequests = (items = []) => {
      let count = 0;
      items.forEach((item) => {
        if (item?.api) {
          count += 1;
        }
        if (Array.isArray(item?.items)) {
          count += countRequests(item.items);
        }
      });
      return count;
    };

    if (countRequests(entry.items || []) > 0) {
      moduleIds.add(String(entry.moduleId));
    }
  });

  return moduleIds.size;
};

export const getApidogModuleNames = (data) => {
  if (!isApidogCollection(data)) {
    return [];
  }

  const moduleNameMap = {};
  (data.moduleSettings || []).forEach((module) => {
    if (module?.id != null) {
      moduleNameMap[String(module.id)] = module.name || `Module_${module.id}`;
    }
  });

  const names = [];
  (data.apiCollection || []).forEach((entry) => {
    const countRequests = (items = []) => {
      let count = 0;
      items.forEach((item) => {
        if (item?.api) {
          count += 1;
        }
        if (Array.isArray(item?.items)) {
          count += countRequests(item.items);
        }
      });
      return count;
    };

    if (countRequests(entry.items || []) > 0) {
      const moduleId = String(entry.moduleId);
      const name = moduleNameMap[moduleId] || `Module_${moduleId}`;
      if (!names.includes(name)) {
        names.push(name);
      }
    }
  });

  return names;
};
