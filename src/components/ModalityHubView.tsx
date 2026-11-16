import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Modality, TrackId, UserSession } from '../types/radiology';

interface ModalityHubViewProps {
  session: UserSession;
  selectedModality: Modality;
  onChangeModalityScreen: () => void;
  onSelectTrack: (track: TrackId) => void;
  unreadDailyCount: number;
  vra2Progress: number;
  assistantProgress: number;
  assistantQaPassed: boolean;
}

export const ModalityHubView: React.FC<ModalityHubViewProps> = ({
  session,
  selectedModality,
  onChangeModalityScreen,
  onSelectTrack,
  unreadDailyCount,
  vra2Progress,
  assistantProgress,
  assistantQaPassed,
}) => {
  const displayModality = selectedModality === 'X-ray' ? 'XRAY' : selectedModality;

  return (
    <div className="space-y-8">
      {/* Header matching 3rd reference image */}
      <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <p className="text-xs font-medium text-[#0F4C81]">
            {session.name} · {session.title}
          </p>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 mt-1">
            {displayModality} Programs &amp; Channels
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onChangeModalityScreen}
            className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Switch Modality
          </button>
          <span className="text-xs text-slate-500 whitespace-nowrap">
            Select a track to launch the workflow
          </span>
        </div>
      </section>

      {/* Three Program Cards (VRA2 Training, Assistant Training, Daily Learning) — PIP removed */}
      <section aria-label="Training Tracks" className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. VRA2 Training */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
              <span className="font-medium text-[#0F4C81]">6-Step Curriculum</span>
              <Layers className="w-4 h-4 text-slate-400" />
            </div>
            <h2 className="font-display text-lg font-semibold text-slate-900 mt-2">
              VRA2 Training
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed mt-2">
              Intro, QA quiz &amp; annotation, demo video, 100 reporting cases (first 30 with
              checklist), error audit, and admin live-readiness evaluation.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600 font-mono tabular-nums">
              Progress: {vra2Progress} / 100 cases
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSelectTrack('vra2')}
            className="mt-5 w-full py-2.5 px-4 bg-[#0F4C81] hover:bg-[#0B3B66] text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Open VRA2 Flow</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 2. Assistant Training */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
              <span className="font-medium text-emerald-700">AI-Validated Pre-Drafting</span>
              <Sparkles className="w-4 h-4 text-slate-400" />
            </div>
            <h2 className="font-display text-lg font-semibold text-slate-900 mt-2">
              Assistant Training
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed mt-2">
              Complete the Quiz (MCQ, Annotate the Image, Spot the Findings) and report 50 cases
              validated by Gemini AI concordance checks.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600 font-mono tabular-nums">
              {assistantQaPassed
                ? `Quiz Passed · ${assistantProgress} / 50 cases`
                : 'Quiz Gate · 50 cases to report'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSelectTrack('assistant')}
            className="mt-5 w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Open Assistant Track</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 3. Daily Learning Channel */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
              <span className="font-medium text-[#0F4C81]">Team Channel</span>
              <Bell className="w-4 h-4 text-slate-400" />
            </div>
            <h2 className="font-display text-lg font-semibold text-slate-900 mt-2">
              Daily Learning
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed mt-2">
              Posting-style channel delivering Admin-curated teaching cases and instant team
              notifications across all modalities.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-mono tabular-nums">
              {unreadDailyCount > 0 ? (
                <span className="text-[#0F4C81] font-semibold">
                  {unreadDailyCount} unread team notification{unreadDailyCount > 1 ? 's' : ''}
                </span>
              ) : (
                <span className="text-slate-500">All team posts reviewed</span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSelectTrack('daily')}
            className="mt-5 w-full py-2.5 px-4 border border-slate-300 bg-white hover:bg-slate-50 text-slate-900 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Open Channel</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>
    </div>
  );
};
