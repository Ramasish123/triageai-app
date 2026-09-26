import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateTriageAssessment } from '../src/engine/triageEngine.js';

const assessment = (symptomIds, overrides = {}) => calculateTriageAssessment({
  symptomIds,
  ageGroup: 'age_18_39',
  answers: {},
  ...overrides,
});

test('rejects no symptoms', () => {
  const result = assessment([]);
  assert.equal(result.valid, false);
  assert.match(result.errors[0], /at least one symptom/i);
});

test('rejects unknown symptoms', () => {
  const result = assessment(['unknown_symptom']);
  assert.equal(result.valid, false);
});

test('rejects malformed input', () => {
  const result = calculateTriageAssessment(null);
  assert.equal(result.valid, false);
});

test('mild headache is self-care', () => {
  const result = assessment(['mild_headache']);
  assert.equal(result.level, 'self');
  assert.equal(result.score, 1);
});

test('fever alone starts at one point', () => {
  const result = assessment(['fever']);
  assert.equal(result.level, 'self');
  assert.equal(result.score, 1);
});

test('fever lasting more than three days receives its explicit adjustment', () => {
  const result = assessment(['fever'], { answers: { duration: 'four_to_seven_days' } });
  assert.equal(result.score, 3);
  assert.deepEqual(result.adjustments.map((item) => item.id), ['fever_duration']);
});

test('persistent cough has its documented base score', () => {
  const result = assessment(['persistent_cough']);
  assert.equal(result.score, 2);
  assert.equal(result.level, 'self');
});

test('moderate symptoms can produce doctor guidance', () => {
  const result = assessment(['fever', 'persistent_cough', 'abdominal_pain'], {
    answers: { duration: 'one_to_three_days' },
  });
  assert.equal(result.score, 5);
  assert.equal(result.level, 'doctor');
});

test('score three is self-care', () => {
  const result = assessment(['mild_headache', 'persistent_cough']);
  assert.equal(result.score, 3);
  assert.equal(result.level, 'self');
});

test('score four is doctor guidance', () => {
  const result = assessment(['persistent_cough', 'abdominal_pain']);
  assert.equal(result.score, 4);
  assert.equal(result.level, 'doctor');
});

test('score seven is doctor guidance', () => {
  const result = assessment(['chest_pain', 'abdominal_pain']);
  assert.equal(result.score, 7);
  assert.equal(result.level, 'doctor');
});

test('score eight is emergency guidance without a red flag', () => {
  const result = assessment(['chest_pain', 'repeated_vomiting']);
  assert.equal(result.score, 8);
  assert.equal(result.redFlag, false);
  assert.equal(result.level, 'emergency');
});

test('chest pain with shortness of breath overrides the score', () => {
  const result = assessment(['chest_pain', 'shortness_of_breath']);
  assert.equal(result.redFlag, true);
  assert.equal(result.scoreOverridden, true);
  assert.equal(result.level, 'emergency');
  assert.equal(result.redFlags[0].id, 'chest_pain_and_breathlessness');
});

test('sudden confusion is an emergency red flag', () => {
  const result = assessment(['sudden_confusion']);
  assert.equal(result.level, 'emergency');
  assert.equal(result.redFlag, true);
});

test('severe bleeding is an emergency red flag', () => {
  const result = assessment(['severe_bleeding']);
  assert.equal(result.level, 'emergency');
  assert.equal(result.redFlag, true);
});

test('multiple red flags remain emergency guidance', () => {
  const result = assessment(['sudden_confusion', 'severe_bleeding']);
  assert.equal(result.level, 'emergency');
  assert.equal(result.redFlags.length, 2);
});

test('65+ adjustment is explicit and explainable', () => {
  const result = assessment(['mild_headache'], { ageGroup: 'age_65_plus' });
  assert.equal(result.score, 2);
  assert.equal(result.adjustments.at(-1).id, 'age_65_plus');
});


test('returns auditable model metadata', () => {
  const result = assessment(['fever'], { answers: { duration: 'one_to_three_days' } });
  assert.equal(result.model.engineVersion, '2.1.0');
  assert.equal(result.model.deterministic, true);
  assert.equal(result.model.inputCoverage, 100);
  assert.equal(result.model.emergencyRulesEvaluated, 10);
});

test('reports incomplete contextual coverage without failing the base calculation', () => {
  const result = assessment(['fever']);
  assert.equal(result.valid, true);
  assert.equal(result.model.inputCoverage, 0);
});


test('safety checklist warning sign overrides a low symptom score', () => {
  const result = assessment(['mild_headache'], { answers: { safetyFlags: ['hard_to_wake'] } });
  assert.equal(result.redFlag, true);
  assert.equal(result.level, 'emergency');
  assert.ok(result.redFlags.some((item) => item.id === 'hard_to_wake'));
});

test('rejects unknown safety warning signs', () => {
  const result = assessment(['mild_headache'], { answers: { safetyFlags: ['unknown_flag'] } });
  assert.equal(result.valid, false);
});
