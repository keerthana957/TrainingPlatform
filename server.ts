import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

interface ValidationRequestBody {
  modality: string;
  track: string;
  caseId: string;
  caseTitle: string;
  clinicalHistory: string;
  traineeReport: string;
  referenceFindings: string[];
  referenceImpression: string;
  annotationsCount: number;
  checklistCompleted?: boolean;
}

function deterministicFallbackValidation(body: ValidationRequestBody) {
  const reportLower = (body.traineeReport || '').toLowerCase();
  const matchedFindings: string[] = [];
  const missedFindings: string[] = [];

  for (const finding of body.referenceFindings) {
    const tokens = finding
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 3);
    const hits = tokens.filter((t) => reportLower.includes(t));
    if (hits.length >= Math.max(1, Math.ceil(tokens.length * 0.4))) {
      matchedFindings.push(finding);
    } else {
      missedFindings.push(finding);
    }
  }

  const ratio =
    body.referenceFindings.length > 0
      ? matchedFindings.length / body.referenceFindings.length
      : 0;
  const annotationBonus = body.annotationsCount > 0 ? 10 : 0;
  const score = Math.min(100, Math.round(ratio * 85 + annotationBonus + (body.checklistCompleted ? 5 : 0)));

  let verdict: 'Concordant' | 'Minor Discrepancy' | 'Major Discrepancy' = 'Major Discrepancy';
  if (score >= 80) verdict = 'Concordant';
  else if (score >= 55) verdict = 'Minor Discrepancy';

  return {
    concordanceScore: score,
    verdict,
    matchedFindings,
    missedFindings,
    overcalls: [],
    clinicalFeedback:
      missedFindings.length === 0
        ? 'Primary diagnostic findings and impression align closely with the attending reference standard.'
        : `Review ${missedFindings.join('; ')} and ensure explicit mention in the Impression section.`,
    engine: 'Clinical Rubric Engine',
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/ai-validate', async (req, res) => {
    const body = req.body as ValidationRequestBody;
    if (!body || !body.traineeReport || !body.traineeReport.trim()) {
      res.status(400).json({ error: 'Please enter a radiology report before running AI validation.' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.json(deterministicFallbackValidation(body));
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const prompt = [
        `Evaluate the following radiology trainee report against the attending reference standard.`,
        `Modality: ${body.modality}`,
        `Training Track: ${body.track}`,
        `Case: ${body.caseId} — ${body.caseTitle}`,
        `Clinical History: ${body.clinicalHistory}`,
        `Trainee Image Annotations Placed: ${body.annotationsCount}`,
        `Structured Checklist Completed: ${body.checklistCompleted ? 'Yes' : 'No'}`,
        ``,
        `Attending Reference Findings: ${body.referenceFindings.join(' | ')}`,
        `Attending Reference Impression: ${body.referenceImpression}`,
        ``,
        `Trainee Submitted Report:`,
        body.traineeReport,
      ].join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            'You are a senior board-certified radiologist validating trainee reports in a QA training workflow. Score clinical concordance from 0 to 100, list matched findings, missed findings, overcalls, and provide concise, actionable clinical feedback.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              concordanceScore: {
                type: Type.INTEGER,
                description: 'Overall clinical concordance percentage from 0 to 100.',
              },
              verdict: {
                type: Type.STRING,
                description: 'Must be one of: Concordant, Minor Discrepancy, Major Discrepancy.',
              },
              matchedFindings: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Reference findings accurately identified by the trainee.',
              },
              missedFindings: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Reference findings omitted or mischaracterized by the trainee.',
              },
              overcalls: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'False-positive findings reported by the trainee that are absent in reference.',
              },
              clinicalFeedback: {
                type: Type.STRING,
                description: 'Concise 1-2 sentence clinical coaching summary.',
              },
            },
            required: [
              'concordanceScore',
              'verdict',
              'matchedFindings',
              'missedFindings',
              'overcalls',
              'clinicalFeedback',
            ],
          },
        },
      });

      const raw = (response.text ?? '{}').trim();
      const parsed = JSON.parse(raw);
      res.json({
        ...parsed,
        engine: 'Gemini AI Validator',
      });
    } catch (err) {
      console.error('AI validation error:', err);
      const fallback = deterministicFallbackValidation(body);
      res.json({
        ...fallback,
        warning: err instanceof Error ? err.message : 'AI service unavailable; used clinical rubric.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
