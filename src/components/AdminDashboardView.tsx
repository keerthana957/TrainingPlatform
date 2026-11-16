import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Image as ImageIcon,
  LayoutDashboard,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  TrendingUp,
  Upload,
  UserCheck,
  Video,
} from 'lucide-react';
import {
  AIReviewRecord,
  IntroMediaItem,
  Modality,
  ReadinessStatus,
  ReportingDemoVideo,
  TraineeRecord,
} from '../types/radiology';

interface AdminDashboardViewProps {
  trainees: TraineeRecord[];
  onUpdateTraineeStatus: (id: string, status: ReadinessStatus, notes?: string) => void;
  aiReviews: AIReviewRecord[];
  introMedia: IntroMediaItem[];
  onAddIntroMedia: (item: Omit<IntroMediaItem, 'id'>) => void;
  onRemoveIntroMedia: (id: string) => void;
  demoVideos: ReportingDemoVideo[];
  onAddDemoVideo: (video: Omit<ReportingDemoVideo, 'id'>) => void;
  onRemoveDemoVideo: (id: string) => void;
  onOpenCourseView?: () => void;
  onOpenDailyLearningComposer: () => void;
}

const TRACK_TABS: {
  id: 'dashboard' | 'vra2' | 'assistant' | 'media';
  label: string;
  quotaNote: string;
}[] = [
  { id: 'dashboard', label: 'Dashboard', quotaNote: 'Overall Program Analytics' },
  { id: 'vra2', label: 'VRA2 Training', quotaNote: '100 Cases (First 30 Checklist)' },
  { id: 'assistant', label: 'Assistant Training', quotaNote: 'Quiz + 50 Cases + AI Validation' },
  { id: 'media', label: 'Images & Videos', quotaNote: 'Upload Course Media' },
];

const TrajectoryGraph: React.FC<{ trainee: TraineeRecord }> = ({ trainee }) => {
  const points = trainee.trajectory;
  const width = 560;
  const height = 210;
  const padX = 44;
  const padY = 24;
  const plotW = width - padX * 2;
  const plotH = height - padY * 2;

  const minAcc = 55;
  const maxAcc = 100;

  const getX = (idx: number) => {
    if (points.length <= 1) return padX + plotW / 2;
    return padX + (idx / (points.length - 1)) * plotW;
  };

  const getY = (acc: number) => {
    const clamped = Math.max(minAcc, Math.min(maxAcc, acc));
    return padY + ((maxAcc - clamped) / (maxAcc - minAcc)) * plotH;
  };

  const linePath = points
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(pt.accuracy).toFixed(1)}`)
    .join(' ');

  const areaPath =
    points.length > 0
      ? `${linePath} L ${getX(points.length - 1).toFixed(1)} ${(padY + plotH).toFixed(1)} L ${getX(0).toFixed(1)} ${(padY + plotH).toFixed(1)} Z`
      : '';

  const thresholdY = getY(85);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto min-w-[420px]"
        role="img"
        aria-label={`Accuracy trajectory graph for ${trainee.name}`}
      >
        {[60, 70, 80, 90, 100].map((val) => {
          const y = getY(val);
          return (
            <g key={val}>
              <line
                x1={padX}
                y1={y}
                x2={width - padX}
                y2={y}
                stroke="#E2E8F0"
                strokeWidth="1"
              />
              <text
                x={padX - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-slate-400 text-[10px] font-mono"
              >
                {val}%
              </text>
            </g>
          );
        })}

        <line
          x1={padX}
          y1={thresholdY}
          x2={width - padX}
          y2={thresholdY}
          stroke="#059669"
          strokeWidth="1.25"
          strokeDasharray="4 4"
        />
        <text
          x={width - padX}
          y={thresholdY - 5}
          textAnchor="end"
          className="fill-emerald-700 text-[10px] font-medium"
        >
          85% Live Readiness Threshold
        </text>

        {areaPath && <path d={areaPath} fill="#0F4C81" fillOpacity="0.08" />}

        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke="#0F4C81"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {points.map((pt, idx) => {
          const cx = getX(idx);
          const cy = getY(pt.accuracy);
          return (
            <g key={pt.label}>
              <circle cx={cx} cy={cy} r="4.5" fill="#FFFFFF" stroke="#0F4C81" strokeWidth="2.5" />
              <text
                x={cx}
                y={cy - 10}
                textAnchor="middle"
                className="fill-slate-900 text-[11px] font-mono font-semibold"
              >
                {pt.accuracy}%
              </text>
              <text
                x={cx}
                y={height - 6}
                textAnchor="middle"
                className="fill-slate-500 text-[10px]"
              >
                {pt.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  trainees,
  onUpdateTraineeStatus,
  aiReviews,
  introMedia,
  onAddIntroMedia,
  onRemoveIntroMedia,
  demoVideos,
  onAddDemoVideo,
  onRemoveDemoVideo,
  onOpenCourseView,
  onOpenDailyLearningComposer,
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'vra2' | 'assistant' | 'media'>(
    'dashboard'
  );
  const [modalityFilter, setModalityFilter] = useState<'All' | Modality>('All');

  // Admin Media Library Uploader State
  const [mediaTarget, setMediaTarget] = useState<'intro' | 'demo'>('intro');
  const [newMediaModality, setNewMediaModality] = useState<Modality>('X-ray');
  const [newMediaType, setNewMediaType] = useState<'image' | 'video'>('image');
  const [newMediaTitle, setNewMediaTitle] = useState('');
  const [newMediaCaption, setNewMediaCaption] = useState('');
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [newMediaFileName, setNewMediaFileName] = useState('');
  const [mediaSavedMsg, setMediaSavedMsg] = useState('');

  const handleMediaFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setNewMediaUrl(objectUrl);
    setNewMediaFileName(file.name);
    if (!newMediaTitle.trim()) {
      setNewMediaTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
    if (file.type.startsWith('video/')) setNewMediaType('video');
    else if (file.type.startsWith('image/')) setNewMediaType('image');
  };

  const handleCreateMedia = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMediaTitle.trim() || !newMediaUrl.trim()) return;
    if (mediaTarget === 'demo') {
      onAddDemoVideo({
        modality: newMediaModality,
        title: newMediaTitle.trim(),
        description: newMediaCaption.trim() || `${newMediaModality} reporting demo video`,
        videoUrl: newMediaUrl.trim(),
        addedBy: 'Dr. Arvind Menon (Admin)',
      });
      setMediaSavedMsg(`Added reporting demo video to ${newMediaModality} Step 3.`);
    } else {
      onAddIntroMedia({
        modality: newMediaModality,
        type: newMediaType,
        title: newMediaTitle.trim(),
        url: newMediaUrl.trim(),
        caption: newMediaCaption.trim() || `${newMediaModality} training ${newMediaType}`,
        addedBy: 'Dr. Arvind Menon (Admin)',
      });
      setMediaSavedMsg(`Added ${newMediaType} to ${newMediaModality} Step 1 Intro.`);
    }
    setNewMediaTitle('');
    setNewMediaCaption('');
    setNewMediaUrl('');
    setNewMediaFileName('');
    setTimeout(() => setMediaSavedMsg(''), 3500);
  };

  const filteredAllTrainees = trainees.filter(
    (t) => modalityFilter === 'All' || t.modality === modalityFilter
  );
  const filteredAiReviews = aiReviews.filter(
    (r) => modalityFilter === 'All' || r.modality === modalityFilter
  );

  const trackTrainees =
    activeTab === 'dashboard' || activeTab === 'media'
      ? []
      : trainees.filter(
          (t) =>
            t.track === activeTab && (modalityFilter === 'All' || t.modality === modalityFilter)
        );
  const [selectedTraineeId, setSelectedTraineeId] = useState<string>(trainees[0]?.id ?? '');

  const selectedTrainee =
    trackTrainees.find((t) => t.id === selectedTraineeId) || trackTrainees[0] || null;

  const [notesDraft, setNotesDraft] = useState<string>('');
  const [decisionFeedback, setDecisionFeedback] = useState<string>('');

  const avgAccuracy =
    trackTrainees.length > 0
      ? Math.round(
          trackTrainees.reduce((acc, t) => acc + t.independentAccuracy, 0) / trackTrainees.length
        )
      : 0;
  const pendingReviewCount = trackTrainees.filter(
    (t) => t.status === 'Completed - Pending Review'
  ).length;
  const liveReadyCount = trackTrainees.filter((t) => t.status === 'Ready for Live Cases').length;

  const handleDecision = (status: ReadinessStatus) => {
    if (!selectedTrainee) return;
    const updatedNote =
      notesDraft.trim() ||
      (status === 'Ready for Live Cases'
        ? 'Verified diagnostic concordance and error remediation. Cleared for live clinical reporting.'
        : 'Assigned 50-case repeat cohort to reinforce independent accuracy.');
    onUpdateTraineeStatus(selectedTrainee.id, status, updatedNote);
    setNotesDraft('');
    setDecisionFeedback(`${selectedTrainee.name} updated to "${status}".`);
    setTimeout(() => setDecisionFeedback(''), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Admin Top Header */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#0F4C81]">Clinical QA Admin Console</p>
          <h1 className="font-display text-2xl font-semibold text-slate-900 mt-0.5">
            Program Dashboards, Trainee Graphs &amp; Course Media
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Inspect per-person learning curves across VRA2 and Assistant Training, approve live
            readiness, assign 50-case repeat sets, or upload training media.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto shrink-0">
          {onOpenCourseView && (
            <button
              type="button"
              onClick={onOpenCourseView}
              className="px-4 py-2.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              View Courses
            </button>
          )}
          <button
            type="button"
            onClick={onOpenDailyLearningComposer}
            className="px-4 py-2.5 bg-[#0F4C81] hover:bg-[#0B3B66] text-white text-xs font-semibold rounded-lg flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Case to Daily Learning
          </button>
        </div>
      </section>

      {/* Program Segmented Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg self-start">
          {TRACK_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.id === 'dashboard' && <LayoutDashboard className="w-3.5 h-3.5 text-[#0F4C81]" />}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start lg:self-auto">
          {(['All', 'X-ray', 'CT', 'US'] as const).map((mod) => (
            <button
              key={mod}
              type="button"
              onClick={() => setModalityFilter(mod)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 cursor-pointer ${
                modalityFilter === mod
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {mod}
            </button>
          ))}
        </div>
      </div>

      {/* SEPARATE ADMIN DASHBOARD OVERVIEW */}
      {activeTab === 'dashboard' ? (
        <div className="space-y-6">
          {/* Executive KPI Strip */}
          {(() => {
            const totalTrainees = filteredAllTrainees.length;
            const totalCases = filteredAllTrainees.reduce((s, t) => s + t.casesCompleted, 0);
            const totalErrors = filteredAllTrainees.reduce((s, t) => s + t.errorCount, 0);
            const overallErrorPct =
              totalCases > 0 ? ((totalErrors / totalCases) * 100).toFixed(1) : '0.0';
            const liveReady = filteredAllTrainees.filter(
              (t) => t.status === 'Ready for Live Cases'
            ).length;
            const pendingReview = filteredAllTrainees.filter(
              (t) => t.status === 'Completed - Pending Review'
            ).length;
            const avgAiConcordance =
              filteredAllTrainees.length > 0
                ? Math.round(
                    filteredAllTrainees.reduce(
                      (s, t) => s + t.aiReviewSummary.averageConcordance,
                      0
                    ) / filteredAllTrainees.length
                  )
                : 0;

            return (
              <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <p className="text-xs text-slate-500">Total Active Trainees</p>
                  <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums mt-1">
                    {totalTrainees}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {liveReady} live-ready · {pendingReview} pending sign-off
                  </p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <p className="text-xs text-slate-500">Total Cases Completed</p>
                  <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums mt-1">
                    {totalCases}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Across VRA2 &amp; Assistant tracks
                  </p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <p className="text-xs text-slate-500">Cohort Error Percentage</p>
                  <p className="font-mono text-2xl font-semibold text-red-700 tabular-nums mt-1">
                    {overallErrorPct}%
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {totalErrors} total discrepancies logged
                  </p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <p className="text-xs text-slate-500">AI Validation Concordance</p>
                  <p className="font-mono text-2xl font-semibold text-[#0F4C81] tabular-nums mt-1">
                    {avgAiConcordance}%
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {filteredAiReviews.length} AI case reviews logged
                  </p>
                </div>
              </section>
            );
          })()}

          {/* All Trainees Performance Summary Table */}
          <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900">
                  All Trainees — Completion, Error Rate &amp; AI Concordance
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select Inspect to open a trainee&apos;s individual curve, missed findings, and
                  readiness sign-off.
                </p>
              </div>
              <span className="font-mono text-xs text-slate-500 tabular-nums">
                {filteredAllTrainees.length} Trainees
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-500">
                    <th className="py-3 px-5">Trainee</th>
                    <th className="py-3 px-4">Program Track</th>
                    <th className="py-3 px-4">Modality</th>
                    <th className="py-3 px-4">Cases Completed</th>
                    <th className="py-3 px-4">Error %</th>
                    <th className="py-3 px-4">AI Concordance</th>
                    <th className="py-3 px-4">Readiness Status</th>
                    <th className="py-3 px-5 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredAllTrainees.map((t) => {
                    const errPct =
                      t.casesCompleted > 0
                        ? ((t.errorCount / t.casesCompleted) * 100).toFixed(1)
                        : '0.0';
                    return (
                      <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-5">
                          <p className="font-semibold text-slate-900">{t.name}</p>
                          <p className="text-[11px] font-mono text-slate-400">{t.email}</p>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-medium">
                          {t.track === 'vra2' ? 'VRA2 Training' : 'Assistant Training'}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-700">{t.modality}</td>
                        <td className="py-3.5 px-4 font-mono tabular-nums text-slate-900">
                          {t.casesCompleted}/{t.totalCasesRequired}
                        </td>
                        <td className="py-3.5 px-4 font-mono tabular-nums font-semibold text-red-700">
                          {errPct}%
                        </td>
                        <td className="py-3.5 px-4 font-mono tabular-nums font-semibold text-[#0F4C81]">
                          {t.aiReviewSummary.averageConcordance}%
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`font-medium ${
                              t.status === 'Ready for Live Cases'
                                ? 'text-emerald-700'
                                : t.status === 'Repeat 50 Cases'
                                ? 'text-red-700'
                                : t.status === 'Completed - Pending Review'
                                ? 'text-[#0F4C81]'
                                : 'text-slate-600'
                            }`}
                          >
                            {t.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTraineeId(t.id);
                              setActiveTab(t.track);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-[#0F4C81] hover:text-[#0F4C81] text-slate-700 font-medium cursor-pointer whitespace-nowrap"
                          >
                            <span>Inspect</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Recent AI Review & Missed Findings Feed */}
          <section className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-base font-semibold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#0F4C81]" />
                Recent AI Review Alerts &amp; Missed Findings
              </h2>
              <span className="font-mono text-xs text-slate-500 tabular-nums">
                {filteredAiReviews.length} Logs
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredAiReviews.slice(0, 4).map((review) => (
                <div
                  key={review.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-slate-900">
                        {review.caseId}
                      </span>
                      <span aria-hidden="true" className="text-slate-300">
                        ·
                      </span>
                      <span className="font-medium text-slate-700">{review.traineeName}</span>
                    </div>
                    <span
                      className={`font-mono font-semibold tabular-nums ${
                        review.verdict === 'Concordant'
                          ? 'text-emerald-700'
                          : review.verdict === 'Minor Discrepancy'
                          ? 'text-amber-700'
                          : 'text-red-700'
                      }`}
                    >
                      {review.concordanceScore}% · {review.verdict}
                    </span>
                  </div>
                  {review.missedFindings.length > 0 && (
                    <p className="text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
                      <span className="font-semibold">Missed Finding: </span>
                      {review.missedFindings.join('; ')}
                    </p>
                  )}
                  <p className="text-xs text-slate-600 leading-relaxed">{review.clinicalFeedback}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : activeTab === 'media' ? (
        <div className="space-y-6">
          <form
            onSubmit={handleCreateMedia}
            className="bg-white rounded-xl border border-slate-200 p-6 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h2 className="font-display text-lg font-semibold text-slate-900">
                  Add Training Images &amp; Videos
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload Step 1 Intro media or Step 3 Reporting Demo Videos for trainees.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setMediaTarget('intro')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
                      mediaTarget === 'intro' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    Step 1 Intro
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMediaTarget('demo');
                      setNewMediaType('video');
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
                      mediaTarget === 'demo' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    Step 3 Demo Video
                  </button>
                </div>

                {mediaTarget === 'intro' && (
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setNewMediaType('image')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 cursor-pointer ${
                        newMediaType === 'image'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600'
                      }`}
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      Image
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewMediaType('video')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 cursor-pointer ${
                        newMediaType === 'video'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600'
                      }`}
                    >
                      <Video className="w-3.5 h-3.5" />
                      Video
                    </button>
                  </div>
                )}
              </div>
            </div>

            {mediaSavedMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-lg text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{mediaSavedMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Modality</label>
                <select
                  value={newMediaModality}
                  onChange={(e) => setNewMediaModality(e.target.value as Modality)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
                >
                  <option value="X-ray">X-ray</option>
                  <option value="CT">CT</option>
                  <option value="US">US</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Title</label>
                <input
                  type="text"
                  required
                  value={newMediaTitle}
                  onChange={(e) => setNewMediaTitle(e.target.value)}
                  placeholder={
                    mediaTarget === 'demo'
                      ? 'e.g., Chest Reporting Walkthrough Demo'
                      : 'e.g., Chest Search Pattern Video'
                  }
                  className="w-full h-10 px-3.5 rounded-lg border border-slate-300 text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  {mediaTarget === 'demo' ? 'Reporting Notes' : 'Caption'}
                </label>
                <input
                  type="text"
                  value={newMediaCaption}
                  onChange={(e) => setNewMediaCaption(e.target.value)}
                  placeholder="Key teaching focus..."
                  className="w-full h-10 px-3.5 rounded-lg border border-slate-300 text-sm text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Upload {mediaTarget === 'demo' || newMediaType === 'video' ? 'Video' : 'Image'} File
                </label>
                <label className="flex items-center justify-center gap-2 h-10 px-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 cursor-pointer">
                  <Upload className="w-4 h-4 text-[#0F4C81]" />
                  <span className="truncate">
                    {newMediaFileName ||
                      `Choose ${mediaTarget === 'demo' || newMediaType === 'video' ? 'video' : 'image'} file from computer`}
                  </span>
                  <input
                    type="file"
                    accept={mediaTarget === 'demo' || newMediaType === 'video' ? 'video/*' : 'image/*'}
                    onChange={handleMediaFileUpload}
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
                  required={!newMediaUrl}
                  value={newMediaUrl}
                  onChange={(e) => setNewMediaUrl(e.target.value)}
                  placeholder={
                    mediaTarget === 'demo'
                      ? 'https://.../reporting-demo.mp4'
                      : 'https://... or /src/assets/...'
                  }
                  className="w-full h-10 px-3.5 rounded-lg border border-slate-300 text-sm text-slate-900"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2.5 bg-[#0F4C81] hover:bg-[#0B3B66] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                {mediaTarget === 'demo'
                  ? 'Publish to Step 3 Demo Video'
                  : 'Publish to Step 1 Intro'}
              </button>
            </div>
          </form>

          {/* Step 3 Reporting Demo Videos List */}
          <div className="space-y-3">
            <h3 className="font-display text-base font-semibold text-slate-900">
              Step 3 Reporting Demo Videos
            </h3>
            {demoVideos.filter((v) => modalityFilter === 'All' || v.modality === modalityFilter)
              .length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-6 text-xs text-slate-500">
                No Step 3 reporting demo videos uploaded yet. Select &ldquo;Step 3 Demo Video&rdquo;
                above to add one.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {demoVideos
                  .filter((v) => modalityFilter === 'All' || v.modality === modalityFilter)
                  .map((video) => (
                    <div
                      key={video.id}
                      className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col"
                    >
                      <div className="aspect-[16/10] bg-black flex items-center justify-center overflow-hidden">
                        <video
                          src={video.videoUrl}
                          controls
                          className="w-full h-full object-contain bg-black"
                        />
                      </div>
                      <div className="p-4 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold text-[#0F4C81]">
                            {video.modality} · Step 3 Demo Video
                          </p>
                          <h4 className="font-display text-sm font-semibold text-slate-900 mt-1">
                            {video.title}
                          </h4>
                          <p className="text-xs text-slate-500 mt-1">{video.description}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemoveDemoVideo(video.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer shrink-0"
                          title="Remove demo video"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Step 1 Intro Media List */}
          <div className="space-y-3">
            <h3 className="font-display text-base font-semibold text-slate-900">
              Step 1 Intro Images &amp; Videos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {introMedia
                .filter((m) => modalityFilter === 'All' || m.modality === modalityFilter)
                .map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col"
                  >
                    <div className="aspect-[16/10] bg-black flex items-center justify-center overflow-hidden">
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
                    <div className="p-4 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-[#0F4C81]">
                          {item.modality} · {item.type === 'video' ? 'Video' : 'Image'}
                        </p>
                        <h3 className="font-display text-sm font-semibold text-slate-900 mt-1">
                          {item.title}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">{item.caption}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveIntroMedia(item.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer shrink-0"
                        title="Remove media"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* KPI Strip */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-xs text-slate-500">Cohort Trainees</p>
              <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums mt-1">
                {trackTrainees.length}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-xs text-slate-500">Avg Independent Accuracy</p>
              <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums mt-1">
                {avgAccuracy}%
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-xs text-slate-500">Pending Live Sign-off</p>
              <p className="font-mono text-2xl font-semibold text-amber-700 tabular-nums mt-1">
                {pendingReviewCount}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-xs text-slate-500">Approved for Live Cases</p>
              <p className="font-mono text-2xl font-semibold text-emerald-700 tabular-nums mt-1">
                {liveReadyCount}
              </p>
            </div>
          </section>

          {decisionFeedback && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-lg text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{decisionFeedback}</span>
            </div>
          )}

          {/* Main Split: Roster Table + Individual Performance Graph & Decision */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <section className="lg:col-span-5 bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="font-display text-base font-semibold text-slate-900">
                  Trainee Roster
                </h2>
                <span className="text-xs text-slate-500">
                  {TRACK_TABS.find((t) => t.id === activeTab)?.quotaNote}
                </span>
              </div>

              {trackTrainees.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No trainees enrolled under this modality filter.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {trackTrainees.map((trainee) => {
                    const isSelected = selectedTrainee?.id === trainee.id;
                    return (
                      <button
                        key={trainee.id}
                        type="button"
                        onClick={() => setSelectedTraineeId(trainee.id)}
                        className={`w-full text-left px-5 py-4 transition-colors cursor-pointer ${
                          isSelected ? 'bg-[#0F4C81]/5' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-slate-900">
                            {trainee.name}
                          </span>
                          <span className="font-mono text-xs font-semibold text-slate-700 tabular-nums">
                            {trainee.independentAccuracy}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-1.5 text-xs text-slate-500">
                          <span className="font-mono tabular-nums">
                            {trainee.modality} · {trainee.casesCompleted}/
                            {trainee.totalCasesRequired} cases
                          </span>
                          <span
                            className={`font-medium ${
                              trainee.status === 'Ready for Live Cases'
                                ? 'text-emerald-700'
                                : trainee.status === 'Repeat 50 Cases'
                                ? 'text-red-700'
                                : trainee.status === 'Completed - Pending Review'
                                ? 'text-[#0F4C81]'
                                : 'text-slate-500'
                            }`}
                          >
                            {trainee.status}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {selectedTrainee && (
              <section className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{selectedTrainee.modality}</span>
                      <span aria-hidden="true">·</span>
                      <span>{selectedTrainee.cohortWeek}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{selectedTrainee.email}</span>
                    </div>
                    <h2 className="font-display text-xl font-semibold text-slate-900 mt-1">
                      {selectedTrainee.name} — Performance Curve
                    </h2>
                  </div>
                  <span
                    className={`text-xs font-semibold whitespace-nowrap ${
                      selectedTrainee.status === 'Ready for Live Cases'
                        ? 'text-emerald-700'
                        : selectedTrainee.status === 'Repeat 50 Cases'
                        ? 'text-red-700'
                        : 'text-[#0F4C81]'
                    }`}
                  >
                    {selectedTrainee.status}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-[#0F4C81]" />
                      Case-by-Case Accuracy Progression
                    </span>
                    <span className="font-mono text-xs text-slate-500 tabular-nums">
                      QA Score: {selectedTrainee.qaScore}%
                    </span>
                  </div>
                  <TrajectoryGraph trainee={selectedTrainee} />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
                  <div className="p-3.5 rounded-lg border border-slate-200">
                    <p className="text-xs text-slate-500">Cases Completed</p>
                    <p className="font-mono text-lg font-semibold text-slate-900 tabular-nums mt-0.5">
                      {selectedTrainee.casesCompleted}/{selectedTrainee.totalCasesRequired}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-lg border border-slate-200">
                    <p className="text-xs text-slate-500">Error Percentage</p>
                    <p className="font-mono text-lg font-semibold text-red-700 tabular-nums mt-0.5">
                      {selectedTrainee.casesCompleted > 0
                        ? (
                            (selectedTrainee.errorCount / selectedTrainee.casesCompleted) *
                            100
                          ).toFixed(1)
                        : '0.0'}
                      %
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5">
                      {selectedTrainee.errorCount} errors
                    </p>
                  </div>
                  <div className="p-3.5 rounded-lg border border-slate-200">
                    <p className="text-xs text-slate-500">Checklist Phase</p>
                    <p className="font-mono text-lg font-semibold text-slate-900 tabular-nums mt-0.5">
                      {selectedTrainee.checklistAccuracy}%
                    </p>
                  </div>
                  <div className="p-3.5 rounded-lg border border-slate-200">
                    <p className="text-xs text-slate-500">Independent Phase</p>
                    <p className="font-mono text-lg font-semibold text-slate-900 tabular-nums mt-0.5">
                      {selectedTrainee.independentAccuracy}%
                    </p>
                  </div>
                </div>

                {/* AI Review — Missed Findings & Discrepancy Details */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#0F4C81]" />
                      AI Review — Missed Findings &amp; Clinical Discrepancies
                    </h3>
                    <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
                      <span className="text-[#0F4C81] font-semibold">
                        AI Concordance: {selectedTrainee.aiReviewSummary.averageConcordance}%
                      </span>
                      <span className="text-slate-500">
                        Laterality Errors: {selectedTrainee.aiReviewSummary.lateralityErrors}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed">
                    {selectedTrainee.aiReviewSummary.aiSummaryNote}
                  </p>

                  {selectedTrainee.aiReviewSummary.missedFindings.length > 0 && (
                    <div className="p-3 rounded-lg bg-red-50/70 border border-red-200 space-y-1.5">
                      <p className="text-xs font-semibold text-red-800 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        Missed Findings Flagged by AI
                      </p>
                      <ul className="space-y-1 text-xs text-red-900 list-disc pl-4">
                        {selectedTrainee.aiReviewSummary.missedFindings.map((finding) => (
                          <li key={finding}>{finding}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedTrainee.aiReviewSummary.overcalls.length > 0 && (
                    <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200 space-y-1.5">
                      <p className="text-xs font-semibold text-amber-900">
                        AI-Flagged Overcalls &amp; Laterality Reversals
                      </p>
                      <ul className="space-y-1 text-xs text-amber-900 list-disc pl-4">
                        {selectedTrainee.aiReviewSummary.overcalls.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {(() => {
                    const traineeCaseReviews = aiReviews.filter(
                      (r) =>
                        r.traineeName === selectedTrainee.name ||
                        (r.modality === selectedTrainee.modality &&
                          r.track ===
                            (selectedTrainee.track === 'vra2'
                              ? 'VRA2 Training'
                              : 'Assistant Training'))
                    );
                    if (traineeCaseReviews.length === 0) return null;
                    return (
                      <div className="space-y-2 pt-1">
                        <p className="text-[11px] font-semibold text-slate-600">
                          Recent Case-Level AI Validation Reviews
                        </p>
                        <div className="space-y-2">
                          {traineeCaseReviews.slice(0, 3).map((log) => (
                            <div
                              key={log.id}
                              className="p-3 rounded-lg bg-white border border-slate-200 text-xs space-y-1"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-mono font-semibold text-slate-900">
                                  {log.caseId} · {log.caseTitle}
                                </span>
                                <span
                                  className={`font-semibold ${
                                    log.verdict === 'Concordant'
                                      ? 'text-emerald-700'
                                      : log.verdict === 'Minor Discrepancy'
                                      ? 'text-amber-700'
                                      : 'text-red-700'
                                  }`}
                                >
                                  {log.concordanceScore}% · {log.verdict}
                                </span>
                              </div>
                              {log.missedFindings.length > 0 && (
                                <p className="text-red-700">
                                  <span className="font-semibold">Missed:</span>{' '}
                                  {log.missedFindings.join(', ')}
                                </p>
                              )}
                              <p className="text-slate-600">{log.clinicalFeedback}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="pt-4 border-t border-slate-200 space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-700">Current Admin Assessment</p>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {selectedTrainee.adminNotes}
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="admin-decision-note"
                      className="block text-xs font-medium text-slate-700 mb-1.5"
                    >
                      Update Evaluation Note (optional)
                    </label>
                    <input
                      id="admin-decision-note"
                      type="text"
                      value={notesDraft}
                      onChange={(e) => setNotesDraft(e.target.value)}
                      placeholder="Enter readiness feedback or remediation focus..."
                      className="w-full h-10 px-3.5 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#0F4C81]"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => handleDecision('Repeat 50 Cases')}
                      className="px-4 py-2.5 border border-red-300 bg-white hover:bg-red-50 text-red-700 text-xs font-semibold rounded-lg flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Repeat with Another 50 Cases
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDecision('Ready for Live Cases')}
                      className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Approve for Live Cases
                    </button>
                  </div>
                </div>
              </section>
            )}
          </div>
        </>
      )}
    </div>
  );
};
