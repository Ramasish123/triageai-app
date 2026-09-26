const HISTORY_KEY = 'triageai.assessment-history.v2';
const PREFERENCES_KEY = 'triageai.preferences.v1';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function safelyParse(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function getHistory() {
  if (!canUseStorage()) return [];
  const history = safelyParse(window.localStorage.getItem(HISTORY_KEY), []);
  return Array.isArray(history) ? history.filter(isValidHistoryRecord).slice(0, 20) : [];
}

export function saveHistoryRecord(record) {
  if (!canUseStorage()) return [];
  const current = getHistory();
  const next = [record, ...current.filter((item) => item.id !== record.id)].slice(0, 20);
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return next;
}

export function removeHistoryRecord(id) {
  if (!canUseStorage()) return [];
  const next = getHistory().filter((item) => item.id !== id);
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return next;
}

export function clearHistory() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(HISTORY_KEY);
}

export function getPreferences() {
  if (!canUseStorage()) return {};
  const preferences = safelyParse(window.localStorage.getItem(PREFERENCES_KEY), {});
  return preferences && typeof preferences === 'object' && !Array.isArray(preferences) ? preferences : {};
}

export function savePreferences(preferences) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
}

function isValidHistoryRecord(record) {
  return Boolean(
    record &&
      typeof record === 'object' &&
      typeof record.id === 'string' &&
      typeof record.createdAt === 'string' &&
      record.input &&
      Array.isArray(record.input.symptomIds) &&
      typeof record.input.ageGroup === 'string' &&
      typeof record.result?.level === 'string',
  );
}
