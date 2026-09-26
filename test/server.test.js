import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/index.js';

let server;
let baseUrl;

test.before(async () => {
  server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  if (!server?.listening) return;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('health endpoint reports readiness', async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok', service: 'triageai' });
});

test('triage endpoint calculates an assessment and ignores client score', async () => {
  const response = await fetch(`${baseUrl}/api/triage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ symptomIds: ['mild_headache'], ageGroup: 'age_18_39', answers: {}, score: 999 }),
  });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.level, 'self');
  assert.equal(body.score, 1);
});

test('triage endpoint rejects invalid JSON and invalid data', async () => {
  const malformed = await fetch(`${baseUrl}/api/triage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' });
  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json()).error, 'invalid_json');

  const invalid = await fetch(`${baseUrl}/api/triage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}) });
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).error, 'invalid_assessment');
});
