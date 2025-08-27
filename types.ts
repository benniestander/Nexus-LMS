

export enum Role {
  STUDENT = 'student',
  INSTRUCTOR = 'instructor',
  ADMIN = 'admin',
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  avatarUrl: string;
  bio: string;
  company?: string;
  createdAt: string;
}

export enum LessonType {
  VIDEO = 'video',
  TEXT = 'text',
  PDF = 'pdf',
  QUIZ = 'quiz',
}

export interface Question {
  id: string;
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
}

export interface QuizData {
  questions: Question[];
  passingScore: number; // Percentage (e.g., 80)
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  type: LessonType;
  content: {
    videoId?: string; // YouTube video ID
    text?: string;
    pdfUrl?: string;
    quizData?: QuizData;
  };
  duration: number; // in minutes
  order: number;
}

export interface Module {
  id:string;
  courseId: string;
  title: string;
  lessons: Lesson[];
  order: number;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  category: string;
  instructorId: string;
  instructorName: string; // denormalized for convenience
  modules: Module[];
  totalLessons: number;
  estimatedDuration: number; // in hours
}

export interface Enrollment {
  userId: string;
  courseId:string;
  progress: number; // percentage
  completedLessonIds: string[];
  quizScores: {
      [lessonId: string]: { // key is now lessonId for quiz lessons
          score: number; // highest score achieved
          passed: boolean;
      }
  };
  lastAccessedLessonId?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  content: string;
}

export interface DiscussionPost {
    id: string;
    lessonId: string;
    author: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatarUrl'>;
    content: string;
    timestamp: string;
    replies: DiscussionPost[];
}

// For Analytics Page
export interface EngagementData {
    name: string;
    value: number;
}

// For Messaging/Inbox
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  subject?: string;
  content: string;
  timestamp: string;
  isRead: boolean;
}

export interface Conversation {
  id: string;
  participantIds: string[]; // [user1_id, user2_id]
  lastMessageTimestamp: string;
}

// For Calendar Page
export interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  courseId?: string;
  type: 'deadline' | 'live_session' | 'assignment';
  liveSessionId?: string;
}

// For History Page
export type HistoryAction = 'course_enrolled' | 'lesson_completed' | 'quiz_passed' | 'certificate_earned' | 'discussion_posted';

export interface HistoryLog {
    id: string;
    userId: string;
    action: HistoryAction;
    targetId: string; // e.g., courseId, lessonId
    targetName: string; // e.g., "Advanced React & TypeScript"
    timestamp: string; // ISO date string
}

// For Live Sessions
export interface LiveSession {
  id: string;
  title: string;
  description: string;
  dateTime: string; // ISO String for date and time
  duration: number; // in minutes
  instructorId: string;
  audience: 'all' | string; // 'all' or courseId
}