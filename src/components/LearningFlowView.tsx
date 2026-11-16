import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Image as ImageIcon,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
  Video,
} from 'lucide-react';
import {
  AIReviewRecord,
  AIValidationResult,
  AnnotationMarker,
  CaseErrorItem,
  IntroMediaItem,
  LearningStep,
  Modality,
  ReadinessStatus,
  ReportingDemoVideo,
  UserRole,
} from '../types/radiology';
import {
  QUIZ_QUESTIONS,
  REPORTING_CASES,
  SPOT_TASKS,
} from '../data/mockClinicalData';
import { DicomAnnotatorCanvas } from './DicomAnnotatorCanvas';
import { StructuredReportEditor } from './StructuredReportEditor';

interface LearningFlowViewProps {
  userRole: UserRole;
  modality: Modality;
  introMedia: IntroMediaItem[];
  onAddIntroMedia: (item: Omit<IntroMediaItem, 'id'>) => void;
  onRemoveIntroMedia: (id: string) => void;
  demoVideos: ReportingDemoVideo[];
  onAddDemoVideo: (video: Omit<ReportingDemoVideo, 'id'>) => void;
  onRemoveDemoVideo: (id: string) => void;
  qaPassed: boolean;
  onPassQa: () => void;
  casesCompleted: number;
  onCompleteCase: (countIncrement?: number) => void;
  errorItems: CaseErrorItem[];
  onMarkErrorReviewed: (id: string) => void;
  aiReviews: AIReviewRecord[];
  onRecordAiReview: (record: Omit<AIReviewRecord, 'id' | 'timestamp'>) => void;
  traineeStatus: ReadinessStatus;
  onBackToHub: () => void;
}

const STEP_LABELS: { step: LearningStep; title: string; short: string }[] = [
  { step: 1, title: 'Course Intro', short: '1. Intro' },
  { step: 2, title: 'QA Assessment', short: '2. QA & Annotate' },
  { step: 3, title: 'Reporting Demo Video', short: '3. Demo Video' },
  { step: 4, title: 'Case Reporting', short: '4. Case Reporting' },
  { step: 5, title: 'Review Errors', short: '5. Error Review' },
  { step: 6, title: 'Course Completed', short: '6. Completion' },
];

export const LearningFlowView: React.FC<LearningFlowViewProps> = ({
  userRole,
  modality,
  introMedia,
  onAddIntroMedia,
  onRemoveIntroMedia,
  demoVideos,
  onAddDemoVideo,
  onRemoveDemoVideo,
  qaPassed,
  onPassQa,
  casesCompleted,
  onCompleteCase,
  errorItems,
  onMarkErrorReviewed,
  aiReviews,
  onRecordAiReview,
  traineeStatus,
  onBackToHub,
}) => {
  const [currentStep, setCurrentStep] = useState<LearningStep>(1);

  // Step 1 Intro Media Upload State (Admin Only)
  const [showMediaForm, setShowMediaForm] = useState(false);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [mediaTitle, setMediaTitle] = useState('');
  const [mediaCaption, setMediaCaption] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaFileName, setMediaFileName] = useState('');

  const modalityIntroMedia = introMedia.filter((item) => item.modality === modality);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setMediaUrl(objectUrl);
    setMediaFileName(file.name);
    if (!mediaTitle.trim()) {
      setMediaTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
    if (file.type.startsWith('video/')) setMediaType('video');
    else if (file.type.startsWith('image/')) setMediaType('image');
  };

  const handleAddMediaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaTitle.trim() || !mediaUrl.trim()) return;
    onAddIntroMedia({
      modality,
      type: mediaType,
      title: mediaTitle.trim(),
      url: mediaUrl.trim(),
      caption: mediaCaption.trim() || `${modality} orientation ${mediaType}`,
      addedBy: 'Admin',
    });
    setMediaTitle('');
    setMediaCaption('');
    setMediaUrl('');
    setMediaFileName('');
    setShowMediaForm(false);
  };

  // Step 2 QA State
  const [qaSubTab, setQaSubTab] = useState<'mcq' | 'spot' | 'annotate'>('mcq');
  const modalityQuestions = QUIZ_QUESTIONS.filter((q) => q.modality === modality);
  const activeQuestions = modalityQuestions.length > 0 ? modalityQuestions : QUIZ_QUESTIONS.slice(0, 2);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [mcqSubmitted, setMcqSubmitted] = useState(false);

  const spotTask = SPOT_TASKS[modality];
  const [spotAttempt, setSpotAttempt] = useState<{ x: number; y: number; matched: boolean } | null>(
    null
  );
  const [qaMarkers, setQaMarkers] = useState<AnnotationMarker[]>([]);

  // Step 3 Reporting Demo Video Upload State (Admin Only)
  const [showDemoVideoForm, setShowDemoVideoForm] = useState(false);
  const [demoTitle, setDemoTitle] = useState('');
  const [demoDescription, setDemoDescription] = useState('');
  const [demoVideoUrl, setDemoVideoUrl] = useState('');
  const [demoFileName, setDemoFileName] = useState('');

  const modalityDemoVideos = demoVideos.filter((video) => video.modality === modality);

  const handleDemoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setDemoVideoUrl(objectUrl);
    setDemoFileName(file.name);
    if (!demoTitle.trim()) {
      setDemoTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleAddDemoVideoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoTitle.trim() || !demoVideoUrl.trim()) return;
    onAddDemoVideo({
      modality,
      title: demoTitle.trim(),
      description: demoDescription.trim() || `${modality} reporting demonstration video`,
      videoUrl: demoVideoUrl.trim(),
      addedBy: 'Admin',
    });
    setDemoTitle('');
    setDemoDescription('');
    setDemoVideoUrl('');
    setDemoFileName('');
    setShowDemoVideoForm(false);
  };

  // Step 4 Case Reporting State (100 cases, first 30 with checklist)
  const modalityCases = REPORTING_CASES.filter((c) => c.modality === modality);
  const availableCases = modalityCases.length > 0 ? modalityCases : REPORTING_CASES;
  const [selectedCaseIndex, setSelectedCaseIndex] = useState(0);
  const activeCase = availableCases[selectedCaseIndex % availableCases.length];

  const [simulatedCaseNum, setSimulatedCaseNum] = useState<number>(
    Math.min(100, Math.max(1, casesCompleted))
  );
  const isChecklistPhase = simulatedCaseNum <= 30;
  const checklistList =
    activeCase.checklistItems.length > 0
      ? activeCase.checklistItems
      : [
          'Systematic anatomic compartments verified',
          'Primary pathology laterality and extent documented',
          'Incidental findings and clinical correlation addressed',
        ];

  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [reportDraft, setReportDraft] = useState('');
  const [caseAnnotations, setCaseAnnotations] = useState<AnnotationMarker[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AIValidationResult | null>(null);
  const [aiError, setAiError] = useState('');
  const [submitBanner, setSubmitBanner] = useState('');

  // Step 5 Error Review State
  const [selectedErrorId, setSelectedErrorId] = useState(errorItems[0]?.id ?? '');
  const activeError = errorItems.find((e) => e.id === selectedErrorId) || errorItems[0];


  useEffect(() => {
    setCheckedItems({});
    setReportDraft('');
    setCaseAnnotations([]);
    setAiResult(null);
    setAiError('');
    setSubmitBanner('');
  }, [activeCase.id, simulatedCaseNum]);

  const mcqCorrectCount = activeQuestions.filter(
    (q) => selectedAnswers[q.id] === q.correctIndex
  ).length;
  const mcqPassed = mcqSubmitted && mcqCorrectCount === activeQuestions.length;
  const spotPassed = Boolean(spotAttempt?.matched);
  const annotatePassed = qaMarkers.length >= 1;
  const allQaComplete = mcqPassed && spotPassed && annotatePassed;

  useEffect(() => {
    if (allQaComplete && !qaPassed) {
      onPassQa();
    }
  }, [allQaComplete, qaPassed, onPassQa]);

  const allChecklistDone =
    !isChecklistPhase || checklistList.every((item) => Boolean(checkedItems[item]));

  const handleRunAiValidation = async () => {
    if (!reportDraft.trim()) {
      setAiError('Enter your Findings and Impression before running AI validation.');
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
          track: 'VRA2 Training',
          caseId: activeCase.id,
          caseTitle: activeCase.title,
          clinicalHistory: activeCase.clinicalHistory,
          traineeReport: reportDraft,
          referenceFindings: activeCase.referenceFindings,
          referenceImpression: activeCase.referenceImpression,
          annotationsCount: caseAnnotations.length,
          checklistCompleted: allChecklistDone,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'AI validation request failed.');
      }

      const data = (await res.json()) as AIValidationResult;
      setAiResult(data);
      onRecordAiReview({
        caseId: activeCase.id,
        caseTitle: activeCase.title,
        modality,
        track: 'VRA2 Training',
        traineeName: userRole === 'admin' ? 'Admin Review Session' : 'Dr. Keerthana R.',
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

  const handleSubmitCaseReport = () => {
    if (!reportDraft.trim() || !allChecklistDone) return;
    onCompleteCase(1);
    setSubmitBanner(`Case #${simulatedCaseNum} (${activeCase.id}) recorded in VRA2 Training log.`);
    setSimulatedCaseNum((n) => Math.min(100, n + 1));
    setSelectedCaseIndex((i) => i + 1);
  };

  const reviewedCount = errorItems.filter((e) => e.reviewed).length;
  const errorPercentage =
    casesCompleted > 0 ? ((errorItems.length / casesCompleted) * 100).toFixed(1) : '0.0';
  const relevantAiReviews = aiReviews.filter((r) => r.track === 'VRA2 Training');
  const avgAiConcordance =
    relevantAiReviews.length > 0
      ? Math.round(
          relevantAiReviews.reduce((sum, r) => sum + r.concordanceScore, 0) /
            relevantAiReviews.length
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Top Track Header */}
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
              <span>VRA2 Training</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{casesCompleted} / 100 Cases</span>
            </div>
            <h1 className="font-display text-xl font-semibold text-slate-900 mt-0.5">
              6-Step Clinical Learning Workflow
            </h1>
          </div>
        </div>

        <span className="text-xs font-medium text-emerald-700 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Reporting Enabled
        </span>
      </div>

      {/* Horizontal 6-Step Course Stepper */}
      <nav aria-label="Learning Flow Steps" className="bg-white rounded-xl border border-slate-200 p-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5">
          {STEP_LABELS.map((item) => {
            const active = currentStep === item.step;
            return (
              <button
                key={item.step}
                type="button"
                onClick={() => setCurrentStep(item.step)}
                className={`px-3 py-2.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#0F4C81] text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>{item.short}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* STEP 1: INTRO MEDIA (Images & Videos added by Admin) */}
      {currentStep === 1 && (
        <section className="space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-[#0F4C81]">Step 1 · Orientation Media</p>
              <h2 className="font-display text-xl font-semibold text-slate-900 mt-0.5">
                {modality} — Reference Images &amp; Training Videos
              </h2>
            </div>

            <div className="flex items-center gap-3">
              {userRole === 'admin' && (
                <button
                  type="button"
                  onClick={() => setShowMediaForm((s) => !s)}
                  className="px-4 py-2 text-xs font-semibold border border-[#0F4C81] text-[#0F4C81] hover:bg-[#0F4C81]/5 rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {showMediaForm ? 'Close Uploader' : 'Add Image / Video'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 bg-[#0F4C81] hover:bg-[#0B3B66] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Proceed to Step 2: QA Assessment</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Admin Uploader Form */}
          {userRole === 'admin' && showMediaForm && (
            <form
              onSubmit={handleAddMediaSubmit}
              className="bg-white rounded-xl border border-[#0F4C81]/30 p-6 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <h3 className="font-display text-base font-semibold text-slate-900">
                  Add Image or Video to {modality} Intro
                </h3>
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setMediaType('image')}
                    className={`px-3 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 cursor-pointer ${
                      mediaType === 'image' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    Image
                  </button>
                  <button
                    type="button"
                    onClick={() => setMediaType('video')}
                    className={`px-3 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 cursor-pointer ${
                      mediaType === 'video' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" />
                    Video
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Title</label>
                  <input
                    type="text"
                    required
                    value={mediaTitle}
                    onChange={(e) => setMediaTitle(e.target.value)}
                    placeholder="e.g., Thoracic Apical Search Walkthrough"
                    className="w-full h-10 px-3.5 rounded-lg border border-slate-300 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Caption / Notes
                  </label>
                  <input
                    type="text"
                    value={mediaCaption}
                    onChange={(e) => setMediaCaption(e.target.value)}
                    placeholder="Brief teaching note for trainees..."
                    className="w-full h-10 px-3.5 rounded-lg border border-slate-300 text-sm text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Upload {mediaType === 'image' ? 'Image' : 'Video'} File
                  </label>
                  <label className="flex items-center justify-center gap-2 h-10 px-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 cursor-pointer">
                    <Upload className="w-4 h-4 text-[#0F4C81]" />
                    <span className="truncate">
                      {mediaFileName || `Choose ${mediaType} file from computer`}
                    </span>
                    <input
                      type="file"
                      accept={mediaType === 'image' ? 'image/*' : 'video/*'}
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Or Paste Media URL
                  </label>
                  <input
                    type="text"
                    required={!mediaUrl}
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder={
                      mediaType === 'image'
                        ? 'https://... or /src/assets/...'
                        : 'https://.../walkthrough.mp4'
                    }
                    className="w-full h-10 px-3.5 rounded-lg border border-slate-300 text-sm text-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMediaForm(false)}
                  className="px-4 py-2 text-xs font-medium border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-[#0F4C81] hover:bg-[#0B3B66] text-white rounded-lg cursor-pointer"
                >
                  Add {mediaType === 'image' ? 'Image' : 'Video'} to Intro
                </button>
              </div>
            </form>
          )}

          {/* Media Cards Grid */}
          {modalityIntroMedia.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center space-y-2">
              <p className="text-sm font-medium text-slate-700">
                No {modality} intro images or videos added yet.
              </p>
              <p className="text-xs text-slate-500">
                {userRole === 'admin'
                  ? 'Click "Add Image / Video" above to upload reference scans or training videos.'
                  : 'An Admin can upload reference images and training videos for this modality.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {modalityIntroMedia.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col"
                >
                  <div className="aspect-[16/10] bg-black overflow-hidden flex items-center justify-center">
                    {item.type === 'video' ? (
                      <video
                        src={item.url}
                        controls
                        className="w-full h-full object-contain bg-black"
                      />
                    ) : (
                      <img
                        src={item.url}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain bg-black"
                      />
                    )}
                  </div>
                  <div className="p-5 flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="font-semibold text-[#0F4C81]">
                          {item.type === 'video' ? 'Training Video' : 'Reference Image'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{item.modality}</span>
                      </div>
                      <h3 className="font-display text-base font-semibold text-slate-900 mt-1">
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">{item.caption}</p>
                    </div>

                    {userRole === 'admin' && (
                      <button
                        type="button"
                        onClick={() => onRemoveIntroMedia(item.id)}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                        title="Remove media item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* STEP 2: QA (IMAGE QUIZ, MCQ, SPOT THE FINDING, ANNOTATE THE IMAGE) */}
      {currentStep === 2 && (
        <section className="space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-[#0F4C81]">Step 2 · Diagnostic QA Gate</p>
              <h2 className="font-display text-xl font-semibold text-slate-900 mt-0.5">
                Image Quiz, Spot the Finding &amp; Image Annotation
              </h2>
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start lg:self-auto">
              <button
                type="button"
                onClick={() => setQaSubTab('mcq')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 cursor-pointer ${
                  qaSubTab === 'mcq' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                A. Image MCQ {mcqPassed ? '✓' : ''}
              </button>
              <button
                type="button"
                onClick={() => setQaSubTab('spot')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 cursor-pointer ${
                  qaSubTab === 'spot' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                B. Spot Finding {spotPassed ? '✓' : ''}
              </button>
              <button
                type="button"
                onClick={() => setQaSubTab('annotate')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 cursor-pointer ${
                  qaSubTab === 'annotate' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                C. Annotate Image {annotatePassed ? '✓' : ''}
              </button>
            </div>
          </div>

          {qaSubTab === 'mcq' && (
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
                        <h3 className="font-display text-lg font-semibold text-slate-900 mt-1">
                          {q.question}
                        </h3>
                        <div className="mt-4 space-y-2.5">
                          {q.options.map((opt, oIdx) => {
                            const selected = chosen === oIdx;
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => {
                                  setSelectedAnswers((prev) => ({ ...prev, [q.id]: oIdx }));
                                  setMcqSubmitted(false);
                                }}
                                className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors flex items-center justify-between cursor-pointer ${
                                  selected
                                    ? 'border-[#0F4C81] bg-[#0F4C81]/5 text-slate-900 font-medium'
                                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                                }`}
                              >
                                <span>{opt}</span>
                                {mcqSubmitted && oIdx === q.correctIndex && (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                )}
                              </button>
                            );
                          })}
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
                          <p className="font-semibold">
                            {isRight ? 'Correct Localization' : 'Review Answer'}
                          </p>
                          <p className="mt-1">{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 p-4">
                <span className="text-xs font-mono text-slate-600 tabular-nums">
                  MCQ Score: {mcqSubmitted ? `${mcqCorrectCount} / ${activeQuestions.length}` : 'Pending submission'}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setMcqSubmitted(true)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Grade MCQ Answers
                  </button>
                  <button
                    type="button"
                    onClick={() => setQaSubTab('spot')}
                    className="px-4 py-2 bg-[#0F4C81] hover:bg-[#0B3B66] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <span>Next: Spot the Finding</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {qaSubTab === 'spot' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7">
                <DicomAnnotatorCanvas
                  imageUrl={spotTask.imageUrl}
                  alt={spotTask.title}
                  mode="spot"
                  spotTarget={spotTask.target}
                  spotHit={spotAttempt}
                  onSpotAttempt={(x, y, matched) => setSpotAttempt({ x, y, matched })}
                  caption="Click directly on the abnormal anatomical region."
                />
              </div>
              <div className="lg:col-span-5 flex flex-col justify-between space-y-5">
                <div>
                  <p className="text-xs font-semibold text-[#0F4C81]">Interactive Finding Drill</p>
                  <h3 className="font-display text-lg font-semibold text-slate-900 mt-1">
                    {spotTask.title}
                  </h3>
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
                          ? `Target Hit: ${spotTask.findingName}`
                          : 'Off-Target Click — Try Again'}
                      </p>
                      <p className="mt-1.5 leading-relaxed">
                        {spotAttempt.matched
                          ? spotTask.explanation
                          : `Click coordinates (${spotAttempt.x}%, ${spotAttempt.y}%) fell outside the target lesion.`}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-5 p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
                      Click on the radiograph or cross-sectional slice to register localization.
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
                    Reset Click
                  </button>
                  <button
                    type="button"
                    onClick={() => setQaSubTab('annotate')}
                    className="px-4 py-2 bg-[#0F4C81] hover:bg-[#0B3B66] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Next: Annotate Image</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {qaSubTab === 'annotate' && (
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
                  caption="Drag to draw a bounding ROI box or switch to Pin mode."
                />
              </div>

              <div className="lg:col-span-5 flex flex-col justify-between space-y-5">
                <div>
                  <p className="text-xs font-semibold text-[#0F4C81]">ROI Markup Exercise</p>
                  <h3 className="font-display text-lg font-semibold text-slate-900 mt-1">
                    Annotate the Primary Pathology
                  </h3>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                    Draw a bounding ROI box or drop a labeled pin on the scan to document lesion
                    margins.
                  </p>

                  <div className="mt-5 space-y-2">
                    <p className="text-xs font-semibold text-slate-700">
                      Recorded Annotations ({qaMarkers.length})
                    </p>
                    {qaMarkers.length === 0 ? (
                      <p className="text-xs text-slate-500 p-3 rounded-lg bg-slate-50 border border-slate-200">
                        No ROI boxes or pins placed yet. Drag across the lesion on the canvas.
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

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  {!qaPassed && (
                    <button
                      type="button"
                      onClick={onPassQa}
                      className="px-3.5 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium rounded-lg cursor-pointer"
                    >
                      Verify QA
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="ml-auto px-4 py-2 bg-[#0F4C81] hover:bg-[#0B3B66] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Step 3: Reporting Demo Video</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* STEP 3: REPORTING DEMO VIDEO (Added by Admin) */}
      {currentStep === 3 && (
        <section className="space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-[#0F4C81]">Step 3 · Reporting Demo Video</p>
              <h2 className="font-display text-xl font-semibold text-slate-900 mt-0.5">
                {modality} — Reporting Demonstration Videos
              </h2>
            </div>

            <div className="flex items-center gap-3">
              {userRole === 'admin' && (
                <button
                  type="button"
                  onClick={() => setShowDemoVideoForm((s) => !s)}
                  className="px-4 py-2 text-xs font-semibold border border-[#0F4C81] text-[#0F4C81] hover:bg-[#0F4C81]/5 rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {showDemoVideoForm ? 'Close Uploader' : 'Add Demo Video'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="px-4 py-2 bg-[#0F4C81] hover:bg-[#0B3B66] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Step 4: Start 100 Cases</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {userRole === 'admin' && showDemoVideoForm && (
            <form
              onSubmit={handleAddDemoVideoSubmit}
              className="bg-white rounded-xl border border-[#0F4C81]/30 p-6 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <h3 className="font-display text-base font-semibold text-slate-900">
                  Add Reporting Demo Video ({modality})
                </h3>
                <span className="text-xs font-medium text-[#0F4C81] flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5" />
                  Reporting Walkthrough
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Video Title
                  </label>
                  <input
                    type="text"
                    required
                    value={demoTitle}
                    onChange={(e) => setDemoTitle(e.target.value)}
                    placeholder={`e.g., ${modality} Structured Case Reporting Demo`}
                    className="w-full h-10 px-3.5 rounded-lg border border-slate-300 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Description / Reporting Notes
                  </label>
                  <input
                    type="text"
                    value={demoDescription}
                    onChange={(e) => setDemoDescription(e.target.value)}
                    placeholder="Key dictation sequence and checklist walkthrough..."
                    className="w-full h-10 px-3.5 rounded-lg border border-slate-300 text-sm text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Upload Reporting Demo Video
                  </label>
                  <label className="flex items-center justify-center gap-2 h-10 px-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 cursor-pointer">
                    <Upload className="w-4 h-4 text-[#0F4C81]" />
                    <span className="truncate">
                      {demoFileName || 'Choose video file from computer'}
                    </span>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleDemoFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Or Paste Video URL
                  </label>
                  <input
                    type="text"
                    required={!demoVideoUrl}
                    value={demoVideoUrl}
                    onChange={(e) => setDemoVideoUrl(e.target.value)}
                    placeholder="https://.../reporting-demo.mp4"
                    className="w-full h-10 px-3.5 rounded-lg border border-slate-300 text-sm text-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDemoVideoForm(false)}
                  className="px-4 py-2 text-xs font-medium border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-[#0F4C81] hover:bg-[#0B3B66] text-white rounded-lg cursor-pointer"
                >
                  Add Demo Video
                </button>
              </div>
            </form>
          )}

          {modalityDemoVideos.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center space-y-2">
              <p className="text-sm font-medium text-slate-700">
                No {modality} reporting demo videos added yet.
              </p>
              <p className="text-xs text-slate-500">
                {userRole === 'admin'
                  ? 'Click "Add Demo Video" above to upload a reporting walkthrough video for trainees.'
                  : 'An Admin can upload reporting demonstration videos for this modality.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {modalityDemoVideos.map((video) => (
                <div
                  key={video.id}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col"
                >
                  <div className="aspect-[16/10] bg-black overflow-hidden flex items-center justify-center">
                    <video
                      src={video.videoUrl}
                      controls
                      className="w-full h-full object-contain bg-black"
                    />
                  </div>
                  <div className="p-5 flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="font-semibold text-[#0F4C81]">Reporting Demo Video</span>
                        <span aria-hidden="true">·</span>
                        <span>{video.modality}</span>
                      </div>
                      <h3 className="font-display text-base font-semibold text-slate-900 mt-1">
                        {video.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">{video.description}</p>
                    </div>

                    {userRole === 'admin' && (
                      <button
                        type="button"
                        onClick={() => onRemoveDemoVideo(video.id)}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                        title="Remove demo video"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* STEP 4: 100 CASES FOR REPORT (FIRST 30 WITH CHECKLIST) */}
      {currentStep === 4 && (
        <section className="space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                Case #{simulatedCaseNum} of 100
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="text-xs font-medium text-slate-600">
                {activeCase.id} · {activeCase.title} ({activeCase.patientAgeSex})
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              {isChecklistPhase ? (
                <span className="text-xs font-semibold text-[#0F4C81]">
                  Checklist Phase (Cases 1–30)
                </span>
              ) : (
                <span className="text-xs font-semibold text-emerald-700">
                  Independent Phase (Cases 31–100)
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start lg:self-auto">
              <button
                type="button"
                onClick={() => setSimulatedCaseNum(1)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 cursor-pointer ${
                  isChecklistPhase ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                Case 1–30 (Checklist)
              </button>
              <button
                type="button"
                onClick={() => setSimulatedCaseNum(35)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 cursor-pointer ${
                  !isChecklistPhase ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                Case 31–100 (Independent)
              </button>
            </div>
          </div>

          {submitBanner && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-lg text-xs font-medium flex items-center justify-between">
              <span>{submitBanner}</span>
              <span className="font-mono tabular-nums">Total Completed: {casesCompleted} / 100</span>
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
              {isChecklistPhase && (
                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-[#0F4C81] flex items-center gap-1.5">
                      <ClipboardCheck className="w-4 h-4" />
                      Mandatory Structured Checklist (First 30 Cases)
                    </h3>
                    <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                      {checklistList.filter((i) => checkedItems[i]).length}/{checklistList.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {checklistList.map((item) => (
                      <label
                        key={item}
                        className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(checkedItems[item])}
                          onChange={(e) =>
                            setCheckedItems((prev) => ({ ...prev, [item]: e.target.checked }))
                          }
                          className="mt-0.5 rounded border-slate-300 text-[#0F4C81]"
                        />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <StructuredReportEditor
                activeCase={activeCase}
                value={reportDraft}
                onChange={setReportDraft}
                onRunAiValidation={handleRunAiValidation}
                aiLoading={aiLoading}
                onSaveCase={handleSubmitCaseReport}
                saveLabel={`Save Case #${simulatedCaseNum}`}
                saveDisabled={!reportDraft.trim() || !allChecklistDone}
                extraRightAction={
                  <button
                    type="button"
                    onClick={() => setCurrentStep(5)}
                    className="px-3.5 py-2 rounded-md border border-[#4A4A4A] bg-[#18181B] hover:bg-[#333333] text-white text-xs font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <span>Step 5</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                }
              />

              {aiError && (
                <p className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5" role="alert">
                  {aiError}
                </p>
              )}

              {aiResult && (
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#0F4C81]" />
                      AI Validation Result ({aiResult.engine})
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
                  {aiResult.missedFindings.length > 0 && (
                    <p className="text-red-700">
                      <strong>Missed:</strong> {aiResult.missedFindings.join('; ')}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* STEP 5: REVIEW THEIR ERRORS */}
      {currentStep === 5 && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="font-display text-base font-semibold text-slate-900">
                Discrepancy Queue
              </h2>
              <span className="font-mono text-xs text-slate-500 tabular-nums">
                {reviewedCount}/{errorItems.length} Reviewed
              </span>
            </div>

            <div className="space-y-2">
              {errorItems.map((err) => (
                <button
                  key={err.id}
                  type="button"
                  onClick={() => setSelectedErrorId(err.id)}
                  className={`w-full text-left p-3.5 rounded-lg border transition-colors cursor-pointer ${
                    activeError?.id === err.id
                      ? 'border-[#0F4C81] bg-[#0F4C81]/5'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-semibold text-slate-900">{err.caseId}</span>
                    <span
                      className={`font-medium ${
                        err.reviewed ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {err.reviewed ? 'Reviewed' : err.discrepancyType}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{err.title}</p>
                </button>
              ))}
            </div>
          </div>

          {activeError && (
            <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
                <div>
                  <p className="text-xs font-mono text-red-600 font-semibold">
                    {activeError.caseId} · {activeError.discrepancyType}
                  </p>
                  <h3 className="font-display text-lg font-semibold text-slate-900 mt-0.5">
                    {activeError.title}
                  </h3>
                </div>
                {!activeError.reviewed ? (
                  <button
                    type="button"
                    onClick={() => onMarkErrorReviewed(activeError.id)}
                    className="px-4 py-2 bg-[#0F4C81] hover:bg-[#0B3B66] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Acknowledge &amp; Mark Reviewed
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Error Reviewed
                  </span>
                )}
              </div>

              <DicomAnnotatorCanvas
                imageUrl={activeError.imageUrl}
                alt={activeError.title}
                mode="review"
                reviewOverlay={{
                  targetZone: activeError.targetZone,
                  traineeMarker: activeError.traineeMarker,
                }}
                caption="Green Zone: Attending Gold Standard · Red Pin: Trainee Localization"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border border-red-200 bg-red-50/40">
                  <p className="text-xs font-semibold text-red-700">Trainee Submitted Report</p>
                  <p className="text-xs text-slate-700 leading-relaxed mt-1.5">
                    {activeError.traineeReport}
                  </p>
                </div>
                <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50/40">
                  <p className="text-xs font-semibold text-emerald-700">Attending Gold Standard</p>
                  <p className="text-xs text-slate-700 leading-relaxed mt-1.5">
                    {activeError.attendingReport}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong className="font-semibold text-slate-900">Root Cause Note:</strong>{' '}
                  {activeError.errorNote}
                </span>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(6)}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Step 6: Course Completion &amp; Readiness</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* STEP 6: COURSE COMPLETED */}
      {currentStep === 6 && userRole === 'trainee' && (
        <section className="bg-white rounded-xl border border-slate-200 p-8 max-w-3xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#0F4C81]">Step 6 · {modality}</p>
                <h2 className="font-display text-2xl font-semibold text-slate-900">
                  Course Completed
                </h2>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs text-slate-500">Status</p>
              <p
                className={`text-sm font-semibold mt-0.5 ${
                  traineeStatus === 'Repeat 50 Cases' ? 'text-red-700' : 'text-emerald-700'
                }`}
              >
                {traineeStatus === 'Repeat 50 Cases' ? traineeStatus : 'Course Completed'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-xs text-slate-500">Course Completion</p>
              <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums mt-1">
                {casesCompleted}/100 Cases
              </p>
            </div>
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-xs text-slate-500">Error Percentage</p>
              <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums mt-1">
                {errorPercentage}%
              </p>
            </div>
          </div>
        </section>
      )}

      {/* STEP 6 (ADMIN VIEW): DETAILED BREAKDOWN */}
      {currentStep === 6 && userRole === 'admin' && (
        <section className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 lg:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#0F4C81]/10 text-[#0F4C81] flex items-center justify-center shrink-0">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#0F4C81]">
                    Step 6 · Admin Detailed Evaluation ({modality})
                  </p>
                  <h2 className="font-display text-2xl font-semibold text-slate-900">
                    Trainee Completion, Error Rate &amp; AI Review Details
                  </h2>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs text-slate-500">Admin Readiness Decision</p>
                <p
                  className={`text-sm font-semibold mt-0.5 ${
                    traineeStatus === 'Ready for Live Cases'
                      ? 'text-emerald-700'
                      : traineeStatus === 'Repeat 50 Cases'
                      ? 'text-red-700'
                      : 'text-[#0F4C81]'
                  }`}
                >
                  {traineeStatus}
                </p>
              </div>
            </div>

            {/* Admin Summary Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-xs text-slate-500">Cases Completed</p>
                <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums mt-1">
                  {casesCompleted}/100
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {Math.min(30, casesCompleted)}/30 Checklist · {Math.max(0, casesCompleted - 30)}/70
                  Independent
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-xs text-slate-500">Error Percentage</p>
                <p className="font-mono text-2xl font-semibold text-red-700 tabular-nums mt-1">
                  {errorPercentage}%
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {errorItems.length} total discrepancies ({reviewedCount} audited)
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-xs text-slate-500">AI Avg Concordance</p>
                <p className="font-mono text-2xl font-semibold text-[#0F4C81] tabular-nums mt-1">
                  {avgAiConcordance}%
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Across {relevantAiReviews.length} AI-validated cases
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-xs text-slate-500">QA &amp; Checklist Gate</p>
                <p className="font-mono text-2xl font-semibold text-emerald-700 mt-1">
                  {qaPassed ? 'Passed' : 'Pending'}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">94% checklist adherence</p>
              </div>
            </div>

            {/* AI Review & Missed Findings Breakdown */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#0F4C81]" />
                  AI Review — Missed Findings, Overcalls &amp; Case Discrepancies
                </h3>
                <span className="text-xs text-slate-500 font-mono tabular-nums">
                  {relevantAiReviews.length} AI Review Logs
                </span>
              </div>

              <div className="space-y-3">
                {relevantAiReviews.map((review) => (
                  <div
                    key={review.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono font-semibold text-slate-900">
                          {review.caseId}
                        </span>
                        <span aria-hidden="true" className="text-slate-300">
                          ·
                        </span>
                        <span className="font-medium text-slate-700">{review.caseTitle}</span>
                        <span aria-hidden="true" className="text-slate-300">
                          ·
                        </span>
                        <span className="text-slate-500">{review.modality}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="font-mono font-semibold text-slate-900 tabular-nums">
                          AI Score: {review.concordanceScore}%
                        </span>
                        <span
                          className={`font-semibold ${
                            review.verdict === 'Concordant'
                              ? 'text-emerald-700'
                              : review.verdict === 'Minor Discrepancy'
                              ? 'text-amber-700'
                              : 'text-red-700'
                          }`}
                        >
                          {review.verdict}
                        </span>
                      </div>
                    </div>

                    {review.missedFindings.length > 0 && (
                      <div className="text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                        <span className="font-semibold">AI Missed Findings: </span>
                        {review.missedFindings.join('; ')}
                      </div>
                    )}

                    {review.overcalls.length > 0 && (
                      <div className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        <span className="font-semibold">AI Overcalls / Laterality: </span>
                        {review.overcalls.join('; ')}
                      </div>
                    )}

                    <p className="text-xs text-slate-600 leading-relaxed">
                      <strong className="font-semibold text-slate-800">AI Clinical Review:</strong>{' '}
                      {review.clinicalFeedback}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
