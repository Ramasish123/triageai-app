const HISTORY_KEY = 'triageai.assessment-history.v2';
const PREFERENCES_KEY = 'triageai.preferences.v1';

function canUseStorage() {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
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
  let history;
  try {
    history = safelyParse(window.localStorage.getItem(HISTORY_KEY), []);
  } catch {
    return [];
  }
  return Array.isArray(history) ? history.filter(isValidHistoryRecord).slice(0, 20) : [];
}

export function saveHistoryRecord(record) {
  if (!canUseStorage()) return [];
  const current = getHistory();
  const next = [record, ...current.filter((item) => item.id !== record.id)].slice(0, 20);
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    return current;
  }
  return next;
}

export function removeHistoryRecord(id) {
  if (!canUseStorage()) return [];
  const next = getHistory().filter((item) => item.id !== id);
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    return getHistory();
  }
  return next;
}

export function clearHistory() {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(HISTORY_KEY);
  } catch { /* Storage can be disabled by browser privacy settings. */ }
}

export function getPreferences() {
  if (!canUseStorage()) return {};
  let preferences;
  try {
    preferences = safelyParse(window.localStorage.getItem(PREFERENCES_KEY), {});
  } catch {
    return {};
  }
  return preferences && typeof preferences === 'object' && !Array.isArray(preferences) ? preferences : {};
}

export function savePreferences(preferences) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  } catch { /* Preferences remain in memory if persistence is unavailable. */ }
}

function isValidHistoryRecord(record) {
  return Boolean(
    record &&
      typeof record === 'object' &&
      typeof record.id === 'string' &&
      typeof record.createdAt === 'string' &&
      !Number.isNaN(Date.parse(record.createdAt)) &&
      record.input &&
      Array.isArray(record.input.symptomIds) &&
      typeof record.input.ageGroup === 'string' &&
      typeof record.result?.level === 'string',
  );
}
