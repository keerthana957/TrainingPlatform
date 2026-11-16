import React, { useState } from 'react';
import { LayoutDashboard, LogOut } from 'lucide-react';
import {
  AIReviewRecord,
  CaseErrorItem,
  DailyLearningPost,
  IntroMediaItem,
  Modality,
  ReadinessStatus,
  ReportingDemoVideo,
  TrackId,
  TraineeRecord,
  UserSession,
} from './types/radiology';
import {
  INITIAL_AI_REVIEWS,
  INITIAL_DAILY_POSTS,
  INITIAL_ERROR_ITEMS,
  INITIAL_INTRO_MEDIA,
  INITIAL_TRAINEES,
} from './data/mockClinicalData';
import { LoginView } from './components/LoginView';
import { ModalitySelectView } from './components/ModalitySelectView';
import { ModalityHubView } from './components/ModalityHubView';
import { LearningFlowView } from './components/LearningFlowView';
import { AssistantTrainingView } from './components/AssistantTrainingView';
import { DailyLearningView } from './components/DailyLearningView';
import { AdminDashboardView } from './components/AdminDashboardView';

type ActivePage = 'modalitySelect' | 'hub' | 'flow' | 'assistant' | 'daily' | 'admin';

export default function App() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [activePage, setActivePage] = useState<ActivePage>('modalitySelect');
  const [selectedModality, setSelectedModality] = useState<Modality>('X-ray');

  // Shared clinical state across Trainee & Admin views
  const [trainees, setTrainees] = useState<TraineeRecord[]>(INITIAL_TRAINEES);
  const [dailyPosts, setDailyPosts] = useState<DailyLearningPost[]>(INITIAL_DAILY_POSTS);
  const [errorItems, setErrorItems] = useState<CaseErrorItem[]>(INITIAL_ERROR_ITEMS);
  const [introMedia, setIntroMedia] = useState<IntroMediaItem[]>(INITIAL_INTRO_MEDIA);
  const [demoVideos, setDemoVideos] = useState<ReportingDemoVideo[]>([]);
  const [aiReviews, setAiReviews] = useState<AIReviewRecord[]>(INITIAL_AI_REVIEWS);

  const handleAddIntroMedia = (item: Omit<IntroMediaItem, 'id'>) => {
    setIntroMedia((prev) => [{ ...item, id: `im-${Date.now()}` }, ...prev]);
  };

  const handleRemoveIntroMedia = (id: string) => {
    setIntroMedia((prev) => prev.filter((m) => m.id !== id));
  };

  const handleAddDemoVideo = (video: Omit<ReportingDemoVideo, 'id'>) => {
    setDemoVideos((prev) => [{ ...video, id: `dv-${Date.now()}` }, ...prev]);
  };

  const handleRemoveDemoVideo = (id: string) => {
    setDemoVideos((prev) => prev.filter((v) => v.id !== id));
  };

  const handleRecordAiReview = (record: Omit<AIReviewRecord, 'id' | 'timestamp'>) => {
    setAiReviews((prev) => [
      { ...record, id: `air-${Date.now()}`, timestamp: 'Just now' },
      ...prev,
    ]);
  };

  // Per-track progress for the signed-in trainee
  const [vra2Cases, setVra2Cases] = useState(28);
  const [assistantCases, setAssistantCases] = useState(18);
  const [assistantQaPassed, setAssistantQaPassed] = useState(false);
  const [vra2QaPassed, setVra2QaPassed] = useState(true);

  const unreadDailyCount = dailyPosts.filter((p) => p.unread).length;
  const primaryTrainee = trainees.find((t) => t.id === 'tr-1') || trainees[0];

  const handleLogin = (userSession: UserSession) => {
    setSession(userSession);
    setActivePage(userSession.role === 'admin' ? 'admin' : 'modalitySelect');
  };

  const handleChooseModality = (modality: Modality) => {
    setSelectedModality(modality);
    setActivePage('hub');
  };

  const handleSelectTrack = (track: TrackId) => {
    if (track === 'daily') {
      setActivePage('daily');
      return;
    }
    if (track === 'assistant') {
      setActivePage('assistant');
      return;
    }
    setActivePage('flow');
  };

  const handlePublishDailyPost = (
    newPost: Omit<DailyLearningPost, 'id' | 'timestamp' | 'comments' | 'unread'>
  ) => {
    const created: DailyLearningPost = {
      ...newPost,
      id: `dl-${Date.now()}`,
      timestamp: 'Just now',
      unread: true,
      comments: [],
    };
    setDailyPosts((prev) => [created, ...prev]);
  };

  const handleAddDailyComment = (postId: string, text: string) => {
    if (!session) return;
    setDailyPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              comments: [
                ...post.comments,
                {
                  id: `c-${Date.now()}`,
                  author: session.name,
                  role: session.role,
                  timestamp: 'Just now',
                  text,
                },
              ],
            }
          : post
      )
    );
  };

  const handleDeleteDailyComment = (postId: string, commentId: string) => {
    setDailyPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              comments: post.comments.filter((c) => c.id !== commentId),
            }
          : post
      )
    );
  };

  const handleMarkDailyRead = (postId: string) => {
    setDailyPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, unread: false } : p))
    );
  };

  const handleMarkAllDailyRead = () => {
    setDailyPosts((prev) => prev.map((p) => ({ ...p, unread: false })));
  };

  const handleUpdateTraineeStatus = (
    id: string,
    status: ReadinessStatus,
    notes?: string
  ) => {
    setTrainees((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status,
              totalCasesRequired:
                status === 'Repeat 50 Cases' ? t.totalCasesRequired + 50 : t.totalCasesRequired,
              adminNotes: notes ?? t.adminNotes,
            }
          : t
      )
    );
  };

  const handleMarkErrorReviewed = (id: string) => {
    setErrorItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, reviewed: true } : item))
    );
  };

  if (!session) {
    return <LoginView onLogin={handleLogin} />;
  }

  const isDarkStage = activePage === 'modalitySelect';

  return (
    <div
      className={`min-h-screen flex flex-col ${
        isDarkStage ? 'bg-black text-white' : 'bg-[#F8FAFC] text-[#0F172A]'
      }`}
    >
      {/* Top Bar: Brand & Sign Out */}
      <header
        className={`sticky top-0 z-30 border-b ${
          isDarkStage
            ? 'bg-black border-slate-900 text-white'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 h-16 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => setActivePage(session.role === 'admin' ? 'admin' : 'modalitySelect')}
            className={`font-display text-lg font-bold tracking-tight whitespace-nowrap shrink-0 cursor-pointer ${
              isDarkStage ? 'text-white' : 'text-slate-900'
            }`}
          >
            TRAINING PLATFORM
          </button>

          <div className="flex items-center gap-3 shrink-0">
            {session.role === 'admin' && activePage !== 'admin' && (
              <button
                type="button"
                onClick={() => setActivePage('admin')}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                  isDarkStage
                    ? 'bg-[#0F4C81] text-white hover:bg-[#0B3B66]'
                    : 'bg-[#0F4C81] text-white hover:bg-[#0B3B66]'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                Dashboard
              </button>
            )}
            <button
              type="button"
              onClick={() => setSession(null)}
              className={`px-3.5 py-2 text-xs font-medium border rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                isDarkStage
                  ? 'text-slate-200 border-slate-700 bg-slate-900 hover:bg-slate-800'
                  : 'text-slate-700 border-slate-300 bg-white hover:bg-slate-50'
              }`}
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      {activePage === 'modalitySelect' ? (
        <main className="flex-1 w-full">
          <ModalitySelectView onChooseModality={handleChooseModality} />
        </main>
      ) : (
        <main className="flex-1 w-full max-w-[1440px] mx-auto px-6 lg:px-10 py-8">
          {activePage === 'hub' && (
            <ModalityHubView
              session={session}
              selectedModality={selectedModality}
              onChangeModalityScreen={() => setActivePage('modalitySelect')}
              onSelectTrack={handleSelectTrack}
              unreadDailyCount={unreadDailyCount}
              vra2Progress={vra2Cases}
              assistantProgress={assistantCases}
              assistantQaPassed={assistantQaPassed}
            />
          )}

          {activePage === 'flow' && (
            <LearningFlowView
              userRole={session.role}
              modality={selectedModality}
              introMedia={introMedia}
              onAddIntroMedia={handleAddIntroMedia}
              onRemoveIntroMedia={handleRemoveIntroMedia}
              demoVideos={demoVideos}
              onAddDemoVideo={handleAddDemoVideo}
              onRemoveDemoVideo={handleRemoveDemoVideo}
              qaPassed={vra2QaPassed}
              onPassQa={() => setVra2QaPassed(true)}
              casesCompleted={vra2Cases}
              onCompleteCase={(inc = 1) => setVra2Cases((c) => Math.min(100, c + inc))}
              errorItems={errorItems}
              onMarkErrorReviewed={handleMarkErrorReviewed}
              aiReviews={aiReviews}
              onRecordAiReview={handleRecordAiReview}
              traineeStatus={primaryTrainee.status}
              onBackToHub={() => setActivePage('hub')}
            />
          )}

          {activePage === 'assistant' && (
            <AssistantTrainingView
              modality={selectedModality}
              qaPassed={assistantQaPassed}
              onPassQa={() => setAssistantQaPassed(true)}
              casesCompleted={assistantCases}
              onCompleteCase={(inc = 1) => setAssistantCases((c) => Math.min(50, c + inc))}
              onRecordAiReview={handleRecordAiReview}
              onBackToHub={() => setActivePage('hub')}
            />
          )}

          {activePage === 'daily' && (
            <DailyLearningView
              session={session}
              posts={dailyPosts}
              onPublishPost={handlePublishDailyPost}
              onAddComment={handleAddDailyComment}
              onDeleteComment={handleDeleteDailyComment}
              onMarkRead={handleMarkDailyRead}
              onMarkAllRead={handleMarkAllDailyRead}
              onBack={() => setActivePage(session.role === 'admin' ? 'admin' : 'hub')}
            />
          )}

          {activePage === 'admin' && (
            <AdminDashboardView
              trainees={trainees}
              onUpdateTraineeStatus={handleUpdateTraineeStatus}
              aiReviews={aiReviews}
              introMedia={introMedia}
              onAddIntroMedia={handleAddIntroMedia}
              onRemoveIntroMedia={handleRemoveIntroMedia}
              demoVideos={demoVideos}
              onAddDemoVideo={handleAddDemoVideo}
              onRemoveDemoVideo={handleRemoveDemoVideo}
              onOpenCourseView={() => setActivePage('modalitySelect')}
              onOpenDailyLearningComposer={() => {
                if (session.role !== 'admin') {
                  setSession({
                    id: 'admin-1',
                    name: 'Dr. Arvind Menon',
                    email: 'admin@joinflexrads.com',
                    role: 'admin',
                    title: 'Lead Clinical QA Admin',
                  });
                }
                setActivePage('daily');
              }}
            />
          )}
        </main>
      )}
    </div>
  );
}
