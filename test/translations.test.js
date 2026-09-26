import test from 'node:test';
import assert from 'node:assert/strict';
import { translations } from '../src/data/translations.js';

test('English and Bengali translations expose the same UI keys', () => {
  const englishKeys = Object.keys(translations.en).sort();
  const bengaliKeys = Object.keys(translations.bn).sort();
  assert.deepEqual(englishKeys, bengaliKeys);
  assert.ok(englishKeys.every((key) => typeof translations.en[key] === 'string' && translations.en[key].trim()));
  assert.ok(bengaliKeys.every((key) => typeof translations.bn[key] === 'string' && translations.bn[key].trim()));
});
