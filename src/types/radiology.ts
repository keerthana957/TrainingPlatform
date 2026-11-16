export type UserRole = 'trainee' | 'admin';

export type Modality = 'X-ray' | 'CT' | 'US';

export type TrackId = 'vra2' | 'assistant' | 'daily';

export type LearningStep = 1 | 2 | 3 | 4 | 5 | 6;

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
}

export interface TimelineMilestone {
  id: string;
  timeFrame: string;
  targetDate: string;
  title: string;
  detail: string;
}

export interface IntroMediaItem {
  id: string;
  modality: Modality;
  type: 'image' | 'video';
  title: string;
  url: string;
  caption: string;
  addedBy: string;
}

export interface ReportingDemoVideo {
  id: string;
  modality: Modality;
  title: string;
  description: string;
  videoUrl: string;
  addedBy: string;
}

export interface AnnotationMarker {
  id: string;
  type: 'pin' | 'box';
  x: number;
  y: number;
  width?: number;
  height?: number;
  label: string;
}

export interface QuizQuestion {
  id: string;
  modality: Modality;
  question: string;
  imageUrl: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface SpotFindingTask {
  id: string;
  modality: Modality;
  title: string;
  prompt: string;
  imageUrl: string;
  target: {
    x: number;
    y: number;
    radius: number;
  };
  findingName: string;
  explanation: string;
}

export interface RadiologyCase {
  id: string;
  caseNumber: number;
  modality: Modality;
  title: string;
  patientAgeSex: string;
  clinicalHistory: string;
  imageUrl: string;
  checklistItems: string[];
  referenceFindings: string[];
  referenceImpression: string;
  targetZone: {
    x: number;
    y: number;
    radius: number;
  };
}

export interface AIValidationResult {
  concordanceScore: number;
  verdict: 'Concordant' | 'Minor Discrepancy' | 'Major Discrepancy';
  matchedFindings: string[];
  missedFindings: string[];
  overcalls: string[];
  clinicalFeedback: string;
  engine: string;
  warning?: string;
}

export interface CaseErrorItem {
  id: string;
  caseId: string;
  modality: Modality;
  title: string;
  imageUrl: string;
  traineeReport: string;
  attendingReport: string;
  discrepancyType: 'Missed Finding' | 'Laterality / Localization' | 'Overcall';
  errorNote: string;
  targetZone: { x: number; y: number; radius: number };
  traineeMarker: { x: number; y: number };
  reviewed: boolean;
}

export interface DailyComment {
  id: string;
  author: string;
  role: UserRole;
  timestamp: string;
  text: string;
}

export interface DailyLearningPost {
  id: string;
  modality: Modality;
  title: string;
  clinicalPrompt: string;
  teachingPearl: string;
  imageUrl: string;
  postedBy: string;
  timestamp: string;
  unread: boolean;
  comments: DailyComment[];
}

export type ReadinessStatus =
  | 'In Progress'
  | 'Completed - Pending Review'
  | 'Ready for Live Cases'
  | 'Repeat 50 Cases';

export interface AIReviewRecord {
  id: string;
  caseId: string;
  caseTitle: string;
  modality: Modality;
  track: 'VRA2 Training' | 'Assistant Training';
  traineeName: string;
  concordanceScore: number;
  verdict: 'Concordant' | 'Minor Discrepancy' | 'Major Discrepancy';
  missedFindings: string[];
  overcalls: string[];
  clinicalFeedback: string;
  timestamp: string;
}

export interface TraineeRecord {
  id: string;
  name: string;
  email: string;
  track: 'vra2' | 'assistant';
  modality: Modality;
  casesCompleted: number;
  totalCasesRequired: number;
  qaScore: number;
  qaPassed: boolean;
  checklistAccuracy: number;
  independentAccuracy: number;
  errorCount: number;
  status: ReadinessStatus;
  cohortWeek: string;
  trajectory: { label: string; accuracy: number; cases: number }[];
  adminNotes: string;
  aiReviewSummary: {
    averageConcordance: number;
    missedFindings: string[];
    overcalls: string[];
    lateralityErrors: number;
    aiSummaryNote: string;
  };
}
