import React, { useState } from 'react';
import {
  ArrowLeft,
  Bell,
  Check,
  Lock,
  MessageSquare,
  Plus,
  Send,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { DailyLearningPost, Modality, UserSession } from '../types/radiology';
import { SCAN_IMAGES } from '../data/mockClinicalData';
import { DicomAnnotatorCanvas } from './DicomAnnotatorCanvas';

interface DailyLearningViewProps {
  session: UserSession;
  posts: DailyLearningPost[];
  onPublishPost: (post: Omit<DailyLearningPost, 'id' | 'timestamp' | 'comments' | 'unread'>) => void;
  onAddComment: (postId: string, text: string) => void;
  onDeleteComment: (postId: string, commentId: string) => void;
  onMarkRead: (postId: string) => void;
  onMarkAllRead: () => void;
  onBack?: () => void;
}

const IMAGE_PRESETS: { label: string; url: string; modality: Modality }[] = [
  { label: 'PA Chest Radiograph', url: SCAN_IMAGES.chestXray, modality: 'X-ray' },
  { label: 'AP Wrist Radiograph', url: SCAN_IMAGES.wristXray, modality: 'X-ray' },
  { label: 'Axial Head CT', url: SCAN_IMAGES.headCt, modality: 'CT' },
  { label: 'RUQ Gallbladder Ultrasound', url: SCAN_IMAGES.biliaryUs, modality: 'US' },
];

export const DailyLearningView: React.FC<DailyLearningViewProps> = ({
  session,
  posts,
  onPublishPost,
  onAddComment,
  onDeleteComment,
  onMarkRead,
  onMarkAllRead,
  onBack,
}) => {
  const [filterModality, setFilterModality] = useState<'All' | Modality>('All');
  const [showComposer, setShowComposer] = useState(false);

  // Admin composer state
  const [newModality, setNewModality] = useState<Modality>('X-ray');
  const [newPrompt, setNewPrompt] = useState('');
  const [newPearl, setNewPearl] = useState('');
  const [selectedImage, setSelectedImage] = useState(SCAN_IMAGES.chestXray);
  const [publishNotice, setPublishNotice] = useState('');

  // Comment draft per post
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  const unreadCount = posts.filter((p) => p.unread).length;
  const filteredPosts =
    filterModality === 'All' ? posts : posts.filter((p) => p.modality === filterModality);

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrompt.trim() || !newPearl.trim()) return;

    const matchedPreset = IMAGE_PRESETS.find((p) => p.url === selectedImage);
    const derivedTitle = matchedPreset
      ? `Daily Case: ${matchedPreset.label}`
      : `${newModality} Daily Learning Case`;

    onPublishPost({
      modality: newModality,
      title: derivedTitle,
      clinicalPrompt: newPrompt.trim(),
      teachingPearl: newPearl.trim(),
      imageUrl: selectedImage,
      postedBy: `${session.name} (Admin)`,
    });

    setNewPrompt('');
    setNewPearl('');
    setShowComposer(false);
    setPublishNotice('Published to Daily Learning channel. Team notification sent.');
    setTimeout(() => setPublishNotice(''), 4000);
  };

  const handleCommentSubmit = (postId: string) => {
    const draft = (commentDrafts[postId] || '').trim();
    if (!draft) return;
    onAddComment(postId, draft);
    setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
  };

  return (
    <div className="space-y-6">
      {/* Channel Header + Notification Banner */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer shrink-0 mt-0.5"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Bell className="w-3.5 h-3.5 text-[#0F4C81]" />
              <span>Team Notification Channel</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {unreadCount > 0 ? `${unreadCount} Unread Updates` : 'All Caught Up'}
              </span>
            </div>
            <h1 className="font-display text-2xl font-semibold text-slate-900 mt-1">
              Daily Learning Channel
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Admin-published daily diagnostic cases pushed directly to all training cohorts.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(['All', 'X-ray', 'CT', 'US'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilterModality(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  filterModality === tab
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="px-3.5 py-2 text-xs font-medium border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Mark All Read
            </button>
          )}

          {session.role === 'admin' ? (
            <button
              type="button"
              onClick={() => setShowComposer((s) => !s)}
              className="px-4 py-2 text-xs font-semibold bg-[#0F4C81] hover:bg-[#0B3B66] text-white rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              {showComposer ? 'Close Composer' : 'Add Case to Daily Learning'}
            </button>
          ) : (
            <div className="px-3.5 py-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              Admin Only Publishing
            </div>
          )}
        </div>
      </section>

      {publishNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-4 py-3 text-xs font-medium flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{publishNotice}</span>
        </div>
      )}

      {/* Admin-Only Daily Case Composer */}
      {session.role === 'admin' && showComposer && (
        <form
          onSubmit={handlePublish}
          className="bg-white rounded-xl border border-[#0F4C81]/30 p-6 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Publish New Daily Learning Case
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Immediately reflects in the channel and triggers unread notifications for all team members.
              </p>
            </div>
            <span className="text-xs font-medium text-[#0F4C81]">Admin Only Action</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Modality</label>
              <select
                value={newModality}
                onChange={(e) => {
                  const m = e.target.value as Modality;
                  setNewModality(m);
                  const match = IMAGE_PRESETS.find((p) => p.modality === m);
                  if (match) setSelectedImage(match.url);
                }}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
              >
                <option value="X-ray">X-ray</option>
                <option value="CT">CT</option>
                <option value="US">US</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Reference Study Image
              </label>
              <select
                value={selectedImage}
                onChange={(e) => setSelectedImage(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
              >
                {IMAGE_PRESETS.map((preset) => (
                  <option key={preset.label} value={preset.url}>
                    {preset.label} ({preset.modality})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Clinical Prompt for Team
              </label>
              <textarea
                rows={3}
                required
                value={newPrompt}
                onChange={(e) => setNewPrompt(e.target.value)}
                placeholder="Patient presentation and what trainees should inspect..."
                className="w-full p-3 rounded-lg border border-slate-300 text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Key Teaching Pearl
              </label>
              <textarea
                rows={3}
                required
                value={newPearl}
                onChange={(e) => setNewPearl(e.target.value)}
                placeholder="Diagnostic takeaway and error-prevention guidance..."
                className="w-full p-3 rounded-lg border border-slate-300 text-sm text-slate-900"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowComposer(false)}
              className="px-4 py-2 text-xs font-medium border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold bg-[#0F4C81] hover:bg-[#0B3B66] text-white rounded-lg cursor-pointer"
            >
              Publish &amp; Notify Team
            </button>
          </div>
        </form>
      )}

      {/* Channel Feed */}
      <div className="space-y-6">
        {filteredPosts.map((post) => (
          <article
            key={post.id}
            className={`bg-white rounded-xl border p-6 transition-colors ${
              post.unread ? 'border-[#0F4C81]/50' : 'border-slate-200'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-[#0F4C81]">{post.modality}</span>
                  <span aria-hidden="true">·</span>
                  <span>{post.postedBy}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">{post.timestamp}</span>
                  {post.unread && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-amber-700">New Notification</span>
                    </>
                  )}
                </div>
                <h2 className="font-display text-lg font-semibold text-slate-900 mt-1">
                  {post.title}
                </h2>
              </div>

              {post.unread && (
                <button
                  type="button"
                  onClick={() => onMarkRead(post.id)}
                  className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 self-start sm:self-auto whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Acknowledge Case
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-5">
              <div className="lg:col-span-6">
                <DicomAnnotatorCanvas
                  imageUrl={post.imageUrl}
                  alt={post.title}
                  mode="view"
                  caption={`${post.modality} Teaching Reference`}
                />
              </div>

              <div className="lg:col-span-6 flex flex-col justify-between space-y-5">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500">Clinical Prompt</h3>
                    <p className="text-sm text-slate-800 leading-relaxed mt-1">
                      {post.clinicalPrompt}
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                    <h3 className="text-xs font-semibold text-[#0F4C81]">Teaching Pearl</h3>
                    <p className="text-sm text-slate-700 leading-relaxed mt-1">
                      {post.teachingPearl}
                    </p>
                  </div>
                </div>

                {/* Team Thread */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-3">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                    <span>Team Discussion ({post.comments.length})</span>
                  </div>

                  {post.comments.length > 0 && (
                    <div className="space-y-2.5 mb-3 max-h-40 overflow-y-auto pr-1">
                      {post.comments.map((comment) => (
                        <div
                          key={comment.id}
                          className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2 text-slate-500">
                            <span className="font-semibold text-slate-900">{comment.author}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px]">{comment.timestamp}</span>
                              <button
                                type="button"
                                onClick={() => onDeleteComment(post.id, comment.id)}
                                className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                title="Delete comment"
                                aria-label="Delete comment"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <p className="text-slate-700 mt-1">{comment.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={commentDrafts[post.id] || ''}
                      onChange={(e) =>
                        setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCommentSubmit(post.id);
                        }
                      }}
                      placeholder="Add clinical observation to channel..."
                      className="flex-1 h-9 px-3 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#0F4C81]"
                    />
                    <button
                      type="button"
                      onClick={() => handleCommentSubmit(post.id)}
                      className="h-9 px-3.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Send className="w-3 h-3" />
                      Post
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
