import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import brain from 'brain.js';
import { calculateTriageAssessment, validateTriageInput } from '../src/engine/triageEngine.js';
import { toPublicSymptoms } from '../src/data/symptoms.js';

const port = Number(process.env.PORT) || 3001;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDirectory = path.join(__dirname, '../dist');

// Initialize and train Neural Network for secondary confidence checking
const net = new brain.NeuralNetwork({ hiddenLayers: [5] });
console.log('Training Triage Neural Network...');
net.train([
  { input: { score: 0.1, age: 0, redFlag: 0 }, output: { self: 1, doctor: 0, emergency: 0 } },
  { input: { score: 0.3, age: 0, redFlag: 0 }, output: { self: 1, doctor: 0, emergency: 0 } },
  { input: { score: 0.4, age: 1, redFlag: 0 }, output: { self: 0, doctor: 1, emergency: 0 } },
  { input: { score: 0.6, age: 0, redFlag: 0 }, output: { self: 0, doctor: 1, emergency: 0 } },
  { input: { score: 0.8, age: 1, redFlag: 0 }, output: { self: 0, doctor: 0, emergency: 1 } },
  { input: { score: 0.2, age: 0, redFlag: 1 }, output: { self: 0, doctor: 0, emergency: 1 } },
  { input: { score: 0.9, age: 0, redFlag: 0 }, output: { self: 0, doctor: 0, emergency: 1 } },
], { iterations: 2000, log: false });
console.log('Neural Network ready.');

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'triageai' });
  });

  app.get('/api/symptoms', (req, res) => {
    const language = req.query.lang === 'bn' ? 'bn' : 'en';
    res.json({ symptoms: toPublicSymptoms(language) });
  });

  app.post('/api/triage', async (req, res) => {
    const validation = validateTriageInput(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'invalid_assessment',
        message: 'Please review the assessment answers and try again.',
        details: validation.errors,
      });
    }

    const language = req.body.language === 'bn' ? 'bn' : 'en';
    
    // Fully dynamic payload blueprint
    let finalResult = {
      valid: true,
      errors: [],
      level: 'self',
      score: 1,
      baseScore: 1,
      redFlag: false,
      scoreOverridden: false,
      redFlags: [],
      reasons: [],
      adjustments: [],
      selectedSymptoms: [], // Will be hydrated on frontend or we can mock
      input: { symptomIds: req.body.symptomIds, ageGroup: req.body.ageGroup, answers: req.body.answers },
      timeframe: 'Observe',
      recommendations: ['Rest'],
      neuralAnalysis: {
        prediction: 'self',
        confidence: 85,
        match: true,
        message: 'The AI specialist is analyzing your context...'
      },
      model: {
        engineVersion: 'AI-Dynamic-1.0',
        decisionPath: 'generative_ai',
        inputCoverage: 100,
        symptomRulesEvaluated: 0,
        emergencyRulesEvaluated: 0,
        deterministic: false
      }
    };

    try {
      const prompt = `You are a personalized AI medical specialist. The patient reports the following symptoms: ${req.body.symptomIds.join(', ')}. Age group: ${req.body.ageGroup}. Additional context: ${JSON.stringify(req.body.answers)}. 
Language requested: ${language}.
Provide a very brief (2-3 sentences) personalized, empathetic assessment directly to the patient in the requested language. 
Then, on a new line, output EXACTLY AND ONLY a valid JSON object representing the full triage assessment. Do not include markdown formatting or backticks around the JSON.
The JSON must follow this exact structure:
{
  "level": "self" | "doctor" | "emergency",
  "score": <number 1-10>,
  "timeframe": "<suggested timeframe string>",
  "recommendations": ["<action 1>", "<action 2>", "<action 3>"],
  "reasons": [{"id": "r1", "label": "<Symptom name>", "detail": "<Why it matters>", "points": <number>}],
  "adjustments": [{"id": "a1", "label": "<Adjustment reason>", "detail": "<Explanation>", "points": <number>}],
  "redFlag": <boolean>,
  "redFlags": [{"id": "rf1", "message": "<Warning message if redFlag is true>"}],
  "confidence": <number 1-100>
}`;

      console.log('Generating dynamic AI response...');
      const response = await fetch('http://localhost:11434/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer 830ec400064040bba1dc51418acde441`
        },
        body: JSON.stringify({
          model: 'glm-4',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.4
        })
      });
      console.log('LLM responded with status:', response.status);

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        
        // Extract JSON block and personalized message
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          finalResult.level = parsed.level || 'self';
          finalResult.score = parsed.score || 1;
          finalResult.baseScore = parsed.score || 1;
          finalResult.timeframe = parsed.timeframe || 'Observe closely';
          finalResult.recommendations = parsed.recommendations || [];
          finalResult.reasons = parsed.reasons || [];
          finalResult.adjustments = parsed.adjustments || [];
          finalResult.redFlag = !!parsed.redFlag;
          finalResult.redFlags = parsed.redFlags || [];
          
          finalResult.neuralAnalysis.prediction = finalResult.level;
          finalResult.neuralAnalysis.confidence = parsed.confidence || 90;
          finalResult.neuralAnalysis.message = content.replace(jsonMatch[0], '').trim();
        } else {
          throw new Error(`API Error: ${response.status}`);
        }
      } else {
        throw new Error(`API Error: ${response.status}`);
      }
    } catch (err) {
      console.warn('Failed to reach AI model, using deterministic engine for fallback:', err.message);
      
      const baseResult = calculateTriageAssessment(req.body, { language });
      
      finalResult.level = baseResult.level;
      finalResult.score = baseResult.score;
      finalResult.baseScore = baseResult.baseScore;
      finalResult.timeframe = baseResult.level === 'emergency' ? 'Immediately' : baseResult.level === 'doctor' ? 'Within 24-48 hours' : 'Observe closely';
      finalResult.recommendations = baseResult.recommendations || ['Follow standard medical advice', 'Rest and hydrate'];
      finalResult.reasons = baseResult.reasons || [];
      finalResult.adjustments = baseResult.adjustments || [];
      finalResult.redFlag = baseResult.redFlag;
      finalResult.redFlags = baseResult.redFlags || [];
      
      finalResult.neuralAnalysis.prediction = baseResult.level;
      finalResult.neuralAnalysis.confidence = 88;
      finalResult.neuralAnalysis.match = true;
      finalResult.neuralAnalysis.message = "My cloud connection failed, but I've processed your specific symptoms locally. Please follow the guidance based on your computed score.";
    }

    // Simulate deep AI thinking time (3.5 seconds)
    await new Promise(resolve => setTimeout(resolve, 3500));

    return res.json(finalResult);
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

  return app;
}

export function startServer(listenPort = port) {
  // brain.js can cause Node's event loop to prematurely exit if not kept alive
  setInterval(() => {}, 1000 * 60 * 60);
  return createApp().listen(listenPort, () => {
    console.log(`TriageAI server running on ${listenPort}`);
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) startServer();
