import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Lock,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  AIReviewRecord,
  AIValidationResult,
  AnnotationMarker,
  Modality,
} from '../types/radiology';
import {
  QUIZ_QUESTIONS,
  REPORTING_CASES,
  SPOT_TASKS,
} from '../data/mockClinicalData';
import { DicomAnnotatorCanvas } from './DicomAnnotatorCanvas';
import { StructuredReportEditor } from './StructuredReportEditor';

interface AssistantTrainingViewProps {
  modality: Modality;
  qaPassed: boolean;
  onPassQa: () => void;
  casesCompleted: number;
  onCompleteCase: (inc?: number) => void;
  onRecordAiReview?: (record: Omit<AIReviewRecord, 'id' | 'timestamp'>) => void;
  onBackToHub: () => void;
}

export const AssistantTrainingView: React.FC<AssistantTrainingViewProps> = ({
  modality,
  qaPassed,
  onPassQa,
  casesCompleted,
  onCompleteCase,
  onRecordAiReview,
  onBackToHub,
}) => {
  const [stage, setStage] = useState<'quiz' | 'reporting'>(qaPassed ? 'reporting' : 'quiz');
  const [quizTab, setQuizTab] = useState<'mcq' | 'annotate' | 'spot'>('mcq');

  // Quiz: MCQ
  const modalityQuestions = QUIZ_QUESTIONS.filter((q) => q.modality === modality);
  const activeQuestions = modalityQuestions.length > 0 ? modalityQuestions : QUIZ_QUESTIONS.slice(0, 2);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [mcqSubmitted, setMcqSubmitted] = useState(false);

  // Quiz: Annotate the Image
  const [qaMarkers, setQaMarkers] = useState<AnnotationMarker[]>([]);

  // Quiz: Spot the Findings
  const spotTask = SPOT_TASKS[modality];
  const [spotAttempt, setSpotAttempt] = useState<{ x: number; y: number; matched: boolean } | null>(
    null
  );

  // 50 Cases to Report
  const modalityCases = REPORTING_CASES.filter((c) => c.modality === modality);
  const availableCases = modalityCases.length > 0 ? modalityCases : REPORTING_CASES;
  const [selectedCaseIndex, setSelectedCaseIndex] = useState(0);
  const activeCase = availableCases[selectedCaseIndex % availableCases.length];
  const [currentCaseNum, setCurrentCaseNum] = useState<number>(
    Math.min(50, Math.max(1, casesCompleted + 1))
  );
  const [caseAnnotations, setCaseAnnotations] = useState<AnnotationMarker[]>([]);
  const [reportDraft, setReportDraft] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AIValidationResult | null>(null);
  const [aiError, setAiError] = useState('');
  const [submitMessage, setSubmitMessage] = useState('');

  const mcqCorrectCount = activeQuestions.filter(
    (q) => selectedAnswers[q.id] === q.correctIndex
  ).length;
  const mcqPassed = mcqSubmitted && mcqCorrectCount === activeQuestions.length;
  const annotatePassed = qaMarkers.length >= 1;
  const spotPassed = Boolean(spotAttempt?.matched);
  const allQuizComplete = mcqPassed && annotatePassed && spotPassed;

  useEffect(() => {
    if (allQuizComplete && !qaPassed) {
      onPassQa();
    }
  }, [allQuizComplete, qaPassed, onPassQa]);

  useEffect(() => {
    setCaseAnnotations([]);
    setReportDraft('');
    setAiResult(null);
    setAiError('');
    setSubmitMessage('');
  }, [activeCase.id, currentCaseNum]);

  const handleRunAiValidation = async () => {
    if (!reportDraft.trim()) {
      setAiError('Enter your radiology report before running AI validation.');
      return;
    }
    setAiLoading(true);
    setAiError('');
    try {
      const res = await fetch('/api/ai-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modality,
          track: 'Assistant Training',
          caseId: activeCase.id,
          caseTitle: activeCase.title,
          clinicalHistory: activeCase.clinicalHistory,
          traineeReport: reportDraft,
          referenceFindings: activeCase.referenceFindings,
          referenceImpression: activeCase.referenceImpression,
          annotationsCount: caseAnnotations.length,
          checklistCompleted: true,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'AI validation failed.');
      }
      const data = (await res.json()) as AIValidationResult;
      setAiResult(data);
      onRecordAiReview?.({
        caseId: activeCase.id,
        caseTitle: activeCase.title,
        modality,
        track: 'Assistant Training',
        traineeName: 'Dr. Keerthana R.',
        concordanceScore: data.concordanceScore,
        verdict: data.verdict,
        missedFindings: data.missedFindings,
        overcalls: data.overcalls,
        clinicalFeedback: data.clinicalFeedback,
      });
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Unable to reach AI validator.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmitReport = () => {
    if (!reportDraft.trim()) return;
    onCompleteCase(1);
    setSubmitMessage(`Case #${currentCaseNum} (${activeCase.id}) submitted to Assistant Training log.`);
    setCurrentCaseNum((n) => Math.min(50, n + 1));
    setSelectedCaseIndex((i) => i + 1);
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-start sm:items-center gap-4">
          <button
            type="button"
            onClick={onBackToHub}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer shrink-0"
            title="Back to Programs"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-[#0F4C81]">{modality}</span>
              <span aria-hidden="true">·</span>
              <span>Assistant Training</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{casesCompleted} / 50 Cases Reported</span>
            </div>
            <h1 className="font-display text-xl font-semibold text-slate-900 mt-0.5">
              Assistant Training — Quiz &amp; 50 Cases to Report
            </h1>
          </div>
        </div>

        {/* 2-Stage Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start lg:self-auto">
          <button
            type="button"
            onClick={() => setStage('quiz')}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              stage === 'quiz' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            1. Quiz (MCQ · Annotate · Spot Findings)
          </button>
          <button
            type="button"
            onClick={() => setStage('reporting')}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
              stage === 'reporting'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {!qaPassed && <Lock className="w-3 h-3" />}
            <span>2. 50 Cases to Report</span>
          </button>
        </div>
      </div>

      {/* STAGE 1: QUIZ (MCQ, ANNOTATE THE IMAGE, SPOT THE FINDINGS) */}
      {stage === 'quiz' && (
        <section className="space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
              <button
                type="button"
                onClick={() => setQuizTab('mcq')}
                className={`px-3.5 py-2 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 cursor-pointer ${
                  quizTab === 'mcq' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                MCQ {mcqPassed ? '✓' : ''}
              </button>
              <button
                type="button"
                onClick={() => setQuizTab('annotate')}
                className={`px-3.5 py-2 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 cursor-pointer ${
                  quizTab === 'annotate' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                Annotate the Image {annotatePassed ? '✓' : ''}
              </button>
              <button
                type="button"
                onClick={() => setQuizTab('spot')}
                className={`px-3.5 py-2 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 cursor-pointer ${
                  quizTab === 'spot' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                Spot the Findings {spotPassed ? '✓' : ''}
              </button>
            </div>

            <div className="flex items-center gap-3">
              {qaPassed ? (
                <button
                  type="button"
                  onClick={() => setStage('reporting')}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Proceed to 50 Cases</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onPassQa();
                    setStage('reporting');
                  }}
                  className="px-3.5 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Complete Quiz &amp; Open 50 Cases
                </button>
              )}
            </div>
          </div>

          {/* Sub-tab 1: MCQ */}
          {quizTab === 'mcq' && (
            <div className="space-y-5">
              {activeQuestions.map((q, idx) => {
                const chosen = selectedAnswers[q.id];
                const isRight = chosen === q.correctIndex;
                return (
                  <div
                    key={q.id}
                    className="bg-white rounded-xl border border-slate-200 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6"
                  >
                    <div className="lg:col-span-5">
                      <DicomAnnotatorCanvas
                        imageUrl={q.imageUrl}
                        alt={q.question}
                        mode="view"
                        caption={`${q.modality} Quiz Reference`}
                      />
                    </div>
                    <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
                      <div>
                        <p className="text-xs font-mono text-slate-500">
                          Question {idx + 1} of {activeQuestions.length}
                        </p>
                        <h2 className="font-display text-lg font-semibold text-slate-900 mt-1">
                          {q.question}
                        </h2>
                        <div className="mt-4 space-y-2.5">
                          {q.options.map((opt, oIdx) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => {
                                setSelectedAnswers((prev) => ({ ...prev, [q.id]: oIdx }));
                                setMcqSubmitted(false);
                              }}
                              className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors flex items-center justify-between cursor-pointer ${
                                chosen === oIdx
                                  ? 'border-[#0F4C81] bg-[#0F4C81]/5 text-slate-900 font-medium'
                                  : 'border-slate-200 hover:border-slate-300 text-slate-700'
                              }`}
                            >
                              <span>{opt}</span>
                              {mcqSubmitted && oIdx === q.correctIndex && (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      {mcqSubmitted && (
                        <div
                          className={`p-3.5 rounded-lg border text-xs ${
                            isRight
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                              : 'bg-amber-50 border-amber-200 text-amber-900'
                          }`}
                        >
                          <p className="font-semibold">{isRight ? 'Correct' : 'Review Explanation'}</p>
                          <p className="mt-1">{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 p-4">
                <span className="text-xs font-mono text-slate-600 tabular-nums">
                  MCQ Score: {mcqSubmitted ? `${mcqCorrectCount} / ${activeQuestions.length}` : 'Pending'}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setMcqSubmitted(true)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    Check MCQ Answers
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuizTab('annotate')}
                    className="px-4 py-2 bg-[#0F4C81] hover:bg-[#0B3B66] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Next: Annotate the Image</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sub-tab 2: Annotate the Image */}
          {quizTab === 'annotate' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7">
                <DicomAnnotatorCanvas
                  imageUrl={activeCase.imageUrl}
                  alt={activeCase.title}
                  mode="annotate"
                  markers={qaMarkers}
                  onAddMarker={(m) => setQaMarkers((prev) => [...prev, m])}
                  onRemoveMarker={(id) =>
                    setQaMarkers((prev) => prev.filter((item) => item.id !== id))
                  }
                  onClearMarkers={() => setQaMarkers([])}
                  caption="Drag to draw a bounding ROI box or drop a labeled pin."
                />
              </div>

              <div className="lg:col-span-5 flex flex-col justify-between space-y-5">
                <div>
                  <p className="text-xs font-semibold text-[#0F4C81]">ROI Annotation</p>
                  <h2 className="font-display text-lg font-semibold text-slate-900 mt-1">
                    Annotate the Image
                  </h2>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                    Mark the region of interest on the {modality} scan using a bounding box or pin
                    with an anatomical label.
                  </p>

                  <div className="mt-5 space-y-2">
                    <p className="text-xs font-semibold text-slate-700">
                      Placed Annotations ({qaMarkers.length})
                    </p>
                    {qaMarkers.length === 0 ? (
                      <p className="text-xs text-slate-500 p-3 rounded-lg bg-slate-50 border border-slate-200">
                        No annotations placed yet. Drag across the finding on the scan.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {qaMarkers.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                          >
                            <span className="font-medium text-slate-900">{m.label}</span>
                            <span className="font-mono text-slate-500 tabular-nums">
                              {m.type.toUpperCase()} ({m.x}%, {m.y}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setQuizTab('spot')}
                    className="px-4 py-2 bg-[#0F4C81] hover:bg-[#0B3B66] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Next: Spot the Findings</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sub-tab 3: Spot the Findings */}
          {quizTab === 'spot' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7">
                <DicomAnnotatorCanvas
                  imageUrl={spotTask.imageUrl}
                  alt={spotTask.title}
                  mode="spot"
                  spotTarget={spotTask.target}
                  spotHit={spotAttempt}
                  onSpotAttempt={(x, y, matched) => setSpotAttempt({ x, y, matched })}
                  caption="Click directly on the primary finding."
                />
              </div>
              <div className="lg:col-span-5 flex flex-col justify-between space-y-5">
                <div>
                  <p className="text-xs font-semibold text-[#0F4C81]">Localization Drill</p>
                  <h2 className="font-display text-lg font-semibold text-slate-900 mt-1">
                    {spotTask.title}
                  </h2>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">{spotTask.prompt}</p>

                  {spotAttempt ? (
                    <div
                      className={`mt-5 p-4 rounded-lg border text-xs ${
                        spotAttempt.matched
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : 'bg-red-50 border-red-200 text-red-900'
                      }`}
                    >
                      <p className="font-semibold text-sm">
                        {spotAttempt.matched
                          ? `Matched: ${spotTask.findingName}`
                          : 'Off-Target — Try Again'}
                      </p>
                      <p className="mt-1.5 leading-relaxed">
                        {spotAttempt.matched
                          ? spotTask.explanation
                          : `Click (${spotAttempt.x}%, ${spotAttempt.y}%) missed the target region.`}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-5 p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
                      Click directly on the abnormal area to verify localization.
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSpotAttempt(null)}
                    className="px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onPassQa();
                      setStage('reporting');
                    }}
                    className="px-4 py-2 bg-[#0F4C81] hover:bg-[#0B3B66] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Start 50 Cases to Report</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* STAGE 2: 50 CASES TO REPORT */}
      {stage === 'reporting' && (
        <section className="space-y-5">
          {!qaPassed ? (
            <div className="bg-white rounded-xl border border-amber-200 p-8 text-center max-w-xl mx-auto">
              <Lock className="w-8 h-8 text-amber-600 mx-auto" />
              <h2 className="font-display text-xl font-semibold text-slate-900 mt-3">
                Complete Assistant Quiz First
              </h2>
              <p className="text-sm text-slate-600 mt-2">
                Pass the MCQ, Image Annotation, and Spot-the-Findings quiz to unlock the 50-case
                reporting workspace.
              </p>
              <button
                type="button"
                onClick={() => setStage('quiz')}
                className="mt-5 px-5 py-2.5 bg-[#0F4C81] hover:bg-[#0B3B66] text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Go to Quiz
              </button>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                    Case #{currentCaseNum} of 50
                  </span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className="font-medium text-slate-700">
                    {activeCase.id} · {activeCase.title} ({activeCase.patientAgeSex})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentCaseNum((n) => Math.max(1, n - 1))}
                    className="px-3 py-1.5 border border-slate-300 rounded-md text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Prev Case
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentCaseNum((n) => Math.min(50, n + 1));
                      setSelectedCaseIndex((i) => i + 1);
                    }}
                    className="px-3 py-1.5 border border-slate-300 rounded-md text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Next Case
                  </button>
                </div>
              </div>

              {submitMessage && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-lg text-xs font-medium flex items-center justify-between">
                  <span>{submitMessage}</span>
                  <span className="font-mono tabular-nums">{casesCompleted} / 50 Completed</span>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-6">
                  <DicomAnnotatorCanvas
                    imageUrl={activeCase.imageUrl}
                    alt={activeCase.title}
                    mode="annotate"
                    markers={caseAnnotations}
                    onAddMarker={(m) => setCaseAnnotations((prev) => [...prev, m])}
                    onRemoveMarker={(id) =>
                      setCaseAnnotations((prev) => prev.filter((item) => item.id !== id))
                    }
                    onClearMarkers={() => setCaseAnnotations([])}
                    caption={`History: ${activeCase.clinicalHistory}`}
                  />
                </div>

                <div className="lg:col-span-6 space-y-4">
                  <StructuredReportEditor
                    activeCase={activeCase}
                    value={reportDraft}
                    onChange={setReportDraft}
                    onRunAiValidation={handleRunAiValidation}
                    aiLoading={aiLoading}
                    onSaveCase={handleSubmitReport}
                    saveLabel={`Save Case #${currentCaseNum}`}
                    saveDisabled={!reportDraft.trim()}
                  />

                  {aiError && (
                    <p className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5" role="alert">
                      {aiError}
                    </p>
                  )}

                  {aiResult && (
                    <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-[#0F4C81]" />
                          AI Validation ({aiResult.engine})
                        </span>
                        <span
                          className={`font-mono font-semibold tabular-nums ${
                            aiResult.verdict === 'Concordant'
                              ? 'text-emerald-700'
                              : aiResult.verdict === 'Minor Discrepancy'
                              ? 'text-amber-700'
                              : 'text-red-700'
                          }`}
                        >
                          {aiResult.concordanceScore}% · {aiResult.verdict}
                        </span>
                      </div>
                      <p className="text-slate-700 leading-relaxed">{aiResult.clinicalFeedback}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
};
