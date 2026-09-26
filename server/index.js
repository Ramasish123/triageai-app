import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { calculateTriageAssessment, validateTriageInput } from '../src/engine/triageEngine.js';
import { toPublicSymptoms } from '../src/data/symptoms.js';

const app = express();
const port = Number(process.env.PORT) || 3001;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDirectory = path.join(__dirname, '../dist');

app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'triageai' });
});

app.get('/api/symptoms', (req, res) => {
  const language = req.query.lang === 'bn' ? 'bn' : 'en';
  res.json({ symptoms: toPublicSymptoms(language) });
});

app.post('/api/triage', (req, res) => {
  const validation = validateTriageInput(req.body);
  if (!validation.valid) {
    return res.status(400).json({
      error: 'invalid_assessment',
      message: 'Please review the assessment answers and try again.',
      details: validation.errors,
    });
  }

  const language = req.body.language === 'bn' ? 'bn' : 'en';
  // Scores submitted by a client are intentionally ignored. This server always
  // recalculates from ids and rule inputs using the shared deterministic engine.
  return res.json(calculateTriageAssessment(req.body, { language }));
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'not_found', message: 'API endpoint not found.' });
});

app.use(express.static(distDirectory, { index: false, maxAge: '1h' }));

// Express 5 no longer accepts app.get('*'). A pathless middleware safely
// provides the SPA fallback only for browser navigation requests.
app.use((req, res, next) => {
  if (req.method === 'GET' && req.accepts('html')) {
    return res.sendFile(path.join(distDirectory, 'index.html'), (error) => {
      if (error) next(error);
    });
  }
  return res.status(404).json({ error: 'not_found', message: 'Resource not found.' });
});

app.use((error, _req, res, _next) => {
  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({ error: 'invalid_json', message: 'Request body must be valid JSON.' });
  }
  console.error('TriageAI server error:', error.message);
  return res.status(500).json({ error: 'server_error', message: 'The service could not process that request.' });
});

app.listen(port, () => {
  console.log(`TriageAI server running on ${port}`);
});
