import { Course, Enrollment, LessonType, Role, User, DiscussionPost, EngagementData, Conversation, Message, CalendarEvent, HistoryLog, LiveSession } from '../types';

// --- USERS ---
export const mockUser: User = {
  id: 'user-1',
  firstName: 'Alex',
  lastName: 'Johnson',
  email: 'alex.j@example.com',
  role: Role.STUDENT,
  avatar: 'https://i.pravatar.cc/150?u=user-1',
  bio: 'Lifelong learner and aspiring full-stack developer. Passionate about new technologies and building cool things.',
  company: 'TechCorp',
  createdAt: '2023-05-10T10:00:00Z',
};

export const mockInstructor: User = {
  id: 'inst-1',
  firstName: 'Sarah',
  lastName: 'Chen',
  email: 'sarah.c@example.com',
  role: Role.INSTRUCTOR,
  avatar: 'https://i.pravatar.cc/150?u=inst-1',
  bio: 'Lead Software Engineer with 10+ years of experience in building scalable web applications. React enthusiast.',
  createdAt: '2022-01-15T09:00:00Z',
};

export const mockAdmin: User = {
  id: 'admin-1',
  firstName: 'Maria',
  lastName: 'Garcia',
  email: 'maria.g@example.com',
  role: Role.ADMIN,
  avatar: 'https://i.pravatar.cc/150?u=admin-1',
  bio: 'Platform administrator for Nexus. Ensuring a smooth learning experience for everyone.',
  createdAt: '2021-11-20T12:00:00Z',
};

export const allMockUsers: User[] = [mockUser, mockInstructor, mockAdmin,
    { id: 'user-2', firstName: 'Ben', lastName: 'Carter', email: 'ben.c@example.com', role: Role.STUDENT, avatar: 'https://i.pravatar.cc/150?u=user-2', bio: 'Designer and front-end dev.', company: 'Creative Solutions', createdAt: '2023-06-12T11:00:00Z' },
    { id: 'user-3', firstName: 'Chloe', lastName: 'Davis', email: 'chloe.d@example.com', role: Role.STUDENT, avatar: 'https://i.pravatar.cc/150?u=user-3', bio: 'Data scientist in training.', company: 'Data Insights Inc.', createdAt: '2023-07-01T15:00:00Z' },
    { id: 'user-4', firstName: 'Daniel', lastName: 'Smith', email: 'daniel.s@example.com', role: Role.STUDENT, avatar: 'https://i.pravatar.cc/150?u=user-4', bio: 'Marketing specialist exploring new skills.', company: 'Growth Co.', createdAt: '2023-08-20T09:00:00Z' },
    { id: 'inst-2', firstName: 'David', lastName: 'Lee', email: 'david.l@example.com', role: Role.INSTRUCTOR, avatar: 'https://i.pravatar.cc/150?u=inst-2', bio: 'UX/UI Design lead at a major tech company.', createdAt: '2022-03-22T14:00:00Z' }
];


// --- COURSES ---
const coursesData: Omit<Course, 'instructorName' | 'totalLessons' | 'estimatedDuration'>[] = [
  {
    id: 'course-1',
    title: 'Advanced React & TypeScript',
    description: 'Master React and TypeScript to build enterprise-grade applications. Dive deep into hooks, state management, and performance.',
    thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=800',
    category: 'Web Development',
    instructorId: 'inst-1',
    modules: [
      {
        id: 'c1-m1', courseId: 'course-1', title: 'Module 1: Foundations',
        lessons: [
          { id: 'c1-m1-l1', moduleId: 'c1-m1', title: 'Intro to React with TypeScript', type: LessonType.VIDEO, duration: 15, content: { videoId: 'SqcY0GlETPk' }},
          { id: 'c1-m1-l2', moduleId: 'c1-m1', title: 'State and Lifecycle', type: LessonType.TEXT, duration: 25, content: { text: 'The `useState` hook is fundamental for managing state... It returns a pair of values: the current state and a function that updates it.' }},
          { id: 'c1-m1-l3', moduleId: 'c1-m1', title: 'Foundation Concepts Quiz', type: LessonType.QUIZ, duration: 10, content: { quizData: { passingScore: 75, questions: [
                { id: 'q1-1', questionText: 'What is JSX?', options: ['A JavaScript syntax extension', 'A CSS pre-processor', 'A database query language'], correctAnswerIndex: 0 },
                { id: 'q1-2', questionText: 'Which hook manages state?', options: ['useEffect', 'useState', 'useContext'], correctAnswerIndex: 1 },
          ]}}},
        ],
      },
      {
        id: 'c1-m2', courseId: 'course-1', title: 'Module 2: Advanced Hooks',
        lessons: [
          { id: 'c1-m2-l1', moduleId: 'c1-m2', title: 'useReducer Deep Dive', type: LessonType.VIDEO, duration: 35, content: { videoId: 'kK_Wqx3RnHk' }},
          { id: 'c1-m2-l2', moduleId: 'c1-m2', title: 'Official Hooks Documentation', type: LessonType.PDF, duration: 20, content: { pdfUrl: '/react-hooks.pdf' }},
        ],
      },
    ],
  },
  {
    id: 'course-2',
    title: 'UI/UX Design Principles',
    description: 'Learn the core principles of great UI/UX design. From user research to prototyping, this course covers it all.',
    thumbnail: 'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?q=80&w=800',
    category: 'Design',
    instructorId: 'inst-2',
    modules: [
      {
        id: 'c2-m1', courseId: 'course-2', title: 'Module 1: Introduction to UX',
        lessons: [
          { id: 'c2-m1-l1', moduleId: 'c2-m1', title: 'What is User Experience?', type: LessonType.VIDEO, duration: 20, content: { videoId: 'c9LprUagi3I'}},
          { id: 'c2-m1-l2', moduleId: 'c2-m1', title: 'The Design Thinking Process', type: LessonType.TEXT, duration: 30, content: { text: 'Design thinking is a non-linear, iterative process that teams use to understand users, challenge assumptions, redefine problems and create innovative solutions to prototype and test.' }},
          { id: 'c2-m1-l3', moduleId: 'c2-m1', title: 'Intro to UX Quiz', type: LessonType.QUIZ, duration: 15, content: { quizData: { passingScore: 80, questions: [
            { id: 'c2q1', questionText: 'What is UX primarily focused on?', options: ['The user\'s overall experience', 'The visual aesthetics', 'The backend technology'], correctAnswerIndex: 0 }
          ]}}},
        ],
      },
    ],
  },
];

const instructors = {
    'inst-1': { name: 'Sarah Chen' },
    'inst-2': { name: 'David Lee' },
};

export const mockCourses: Course[] = coursesData.map(course => {
    const totalLessons = course.modules.reduce((acc, mod) => acc + mod.lessons.length, 0);
    const totalMinutes = course.modules.reduce((acc, mod) => acc + mod.lessons.reduce((lAcc, l) => lAcc + l.duration, 0), 0);
    return {
        ...course,
        instructorName: instructors[course.instructorId as keyof typeof instructors]?.name || 'Unknown',
        totalLessons,
        estimatedDuration: Math.round(totalMinutes / 60),
    }
});

// --- ENROLLMENTS ---
export const mockEnrollments: Enrollment[] = [
  { // Alex in Sarah's course (in progress)
    userId: 'user-1',
    courseId: 'course-1',
    progress: 40,
    completedLessonIds: ['c1-m1-l1', 'c1-m1-l2'],
    quizScores: {},
    lastAccessedLessonId: 'c1-m1-l3',
  },
   { // Alex in David's course (complete)
    userId: 'user-1',
    courseId: 'course-2',
    progress: 100,
    completedLessonIds: ['c2-m1-l1', 'c2-m1-l2', 'c2-m1-l3'],
    quizScores: { 'c2-m1-l3': { score: 100, passed: true } },
  },
  { // Ben in Sarah's course (complete)
    userId: 'user-2',
    courseId: 'course-1',
    progress: 100,
    completedLessonIds: ['c1-m1-l1', 'c1-m1-l2', 'c1-m1-l3', 'c1-m2-l1', 'c1-m2-l2'],
    quizScores: { 'c1-m1-l3': { score: 80, passed: true } },
  },
  { // Chloe in Sarah's course (in progress)
    userId: 'user-3',
    courseId: 'course-1',
    progress: 15,
    completedLessonIds: ['c1-m1-l1'],
    quizScores: {},
  },
  { // Daniel in David's course (in progress)
    userId: 'user-4',
    courseId: 'course-2',
    progress: 50,
    completedLessonIds: ['c2-m1-l1'],
    quizScores: {},
  },
];


// --- DISCUSSIONS ---
export const mockDiscussions: DiscussionPost[] = [
    {
        id: 'd-1',
        lessonId: 'c1-m1-l1',
        author: { id: 'user-1', firstName: 'Alex', lastName: 'Johnson', avatar: 'https://i.pravatar.cc/150?u=user-1' },
        content: "This is a great introduction! I'm excited to learn more about using TypeScript with React.",
        timestamp: '2024-05-20T10:30:00Z',
        replies: [
            {
                id: 'd-2',
                lessonId: 'c1-m1-l1',
                author: { id: 'inst-1', firstName: 'Sarah', lastName: 'Chen', avatar: 'https://i.pravatar.cc/150?u=inst-1' },
                content: "Glad you're enjoying it, Alex! Let me know if you have any questions as you go through the material.",
                timestamp: '2024-05-20T11:00:00Z',
                replies: []
            }
        ]
    }
];

// --- MESSAGES / INBOX ---
export const mockConversations: Conversation[] = [
    {
        id: 'convo-1',
        participantIds: ['user-1', 'inst-1'], // Alex and Sarah
        lastMessageTimestamp: '2024-05-22T10:05:00Z',
    },
    {
        id: 'convo-2',
        participantIds: ['user-3', 'inst-1'], // Chloe and Sarah
        lastMessageTimestamp: '2024-05-21T15:30:00Z',
    },
    {
        id: 'convo-3',
        participantIds: ['user-4', 'inst-2'], // Daniel and David
        lastMessageTimestamp: '2024-05-20T12:00:00Z',
    }
];

export const mockMessages: Message[] = [
    // Convo 1: Alex and Sarah
    {
        id: 'msg-1',
        conversationId: 'convo-1',
        senderId: 'user-1',
        content: "Hi Sarah, I had a quick question about the `useReducer` hook from Module 2. Can you explain when it's better to use it over `useState`?",
        timestamp: '2024-05-22T10:00:00Z',
        isRead: true,
    },
    {
        id: 'msg-2',
        conversationId: 'convo-1',
        senderId: 'inst-1',
        content: "Great question, Alex! `useReducer` is generally preferred when you have complex state logic that involves multiple sub-values or when the next state depends on the previous one. It's also great for performance optimizations with `useCallback` when passing dispatch down to child components.",
        timestamp: '2024-05-22T10:05:00Z',
        isRead: false, // Unread for Alex
    },
    // Convo 2: Chloe and Sarah
    {
        id: 'msg-3',
        conversationId: 'convo-2',
        senderId: 'user-3',
        content: "I'm really enjoying the course! Thanks for putting it together.",
        timestamp: '2024-05-21T15:30:00Z',
        isRead: true,
    },
     // Convo 3: Daniel and David
    {
        id: 'msg-4',
        conversationId: 'convo-3',
        senderId: 'inst-2',
        content: "Hi Daniel, just checking in to see how you're finding the UI/UX course. Let me know if you need any help!",
        timestamp: '2024-05-20T12:00:00Z',
        isRead: true,
    }
];


// --- ANALYTICS ---
export const mockAdminDashboardStats = {
    totalUsers: { value: allMockUsers.length, change: 2 },
    totalCourses: { value: mockCourses.length, change: 1 },
    totalEnrollments: { value: 1523, change: 58 },
};

export const mockInstructorDashboardStats = {
    totalStudents: { value: 832, change: 34 },
    totalCourses: { value: 2, change: 0 },
    avgCompletion: { value: 68, change: 5 },
};

export const mockEngagementData: EngagementData[] = [
    { name: 'Jan', value: 120 },
    { name: 'Feb', value: 240 },
    { name: 'Mar', value: 180 },
    { name: 'Apr', value: 310 },
    { name: 'May', value: 250 },
    { name: 'Jun', value: 410 },
];

export const mockCoursePerformance: EngagementData[] = [
    { name: 'React & TS', value: 85 },
    { name: 'UI/UX Design', value: 65 },
    { name: 'Python Pro', value: 72 },
    { name: 'Data Science', value: 58 },
];


// --- CALENDAR ---
const today = new Date();
const getFutureDate = (days: number) => {
    const date = new Date();
    date.setDate(today.getDate() + days);
    return date.toISOString().split('T')[0];
};

export const mockCalendarEvents: CalendarEvent[] = [
    { id: 'evt-1', date: getFutureDate(3), title: 'React Quiz Deadline', courseId: 'course-1', type: 'deadline' },
    { id: 'evt-2', date: getFutureDate(7), title: 'Live Q&A Session', courseId: 'course-1', type: 'live_session' },
    { id: 'evt-3', date: getFutureDate(10), title: 'UX/UI Quiz Deadline', courseId: 'course-2', type: 'deadline' },
    { id: 'evt-4', date: getFutureDate(10), title: 'Submit UX Case Study', courseId: 'course-2', type: 'assignment' },
    { id: 'evt-5', date: getFutureDate(20), title: 'Project Showcase', courseId: 'course-1', type: 'live_session' },
];

// --- HISTORY ---
const getPastDate = (daysAgo: number) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString();
}

export const mockHistoryLogs: HistoryLog[] = [
    { id: 'hist-1', userId: 'user-1', action: 'certificate_earned', targetId: 'course-2', targetName: 'UI/UX Design Principles', timestamp: getPastDate(1) },
    { id: 'hist-2', userId: 'user-1', action: 'quiz_passed', targetId: 'c2-m1-l3', targetName: 'Intro to UX Quiz', timestamp: getPastDate(2) },
    { id: 'hist-3', userId: 'user-1', action: 'lesson_completed', targetId: 'c1-m1-l2', targetName: 'State and Lifecycle', timestamp: getPastDate(3) },
    { id: 'hist-4', userId: 'user-1', action: 'discussion_posted', targetId: 'c1-m1-l1', targetName: 'Intro to React with TypeScript', timestamp: getPastDate(4) },
    { id: 'hist-5', userId: 'user-1', action: 'course_enrolled', targetId: 'course-2', targetName: 'UI/UX Design Principles', timestamp: getPastDate(10) },
    { id: 'hist-6', userId: 'user-1', action: 'lesson_completed', targetId: 'c1-m1-l1', targetName: 'Intro to React with TypeScript', timestamp: getPastDate(12) },
    { id: 'hist-7', userId: 'user-1', action: 'course_enrolled', targetId: 'course-1', targetName: 'Advanced React & TypeScript', timestamp: getPastDate(15) },
];

// --- LIVE SESSIONS ---
const getFutureDateTime = (days: number, hours: number, minutes: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    date.setHours(hours, minutes, 0, 0);
    return date.toISOString();
}

const getPastDateTime = (days: number, hours: number, minutes: number) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    date.setHours(hours, minutes, 0, 0);
    return date.toISOString();
}

export const mockLiveSessions: LiveSession[] = [
    {
        id: 'ls-1',
        title: 'React Hooks Q&A',
        description: 'Join me for a live Q&A session to answer all your questions about React Hooks from Module 2.',
        dateTime: getFutureDateTime(5, 14, 0), // 5 days from now at 2 PM
        duration: 60,
        instructorId: 'inst-1',
        audience: 'course-1',
    },
    {
        id: 'ls-2',
        title: 'Design Principles Webinar',
        description: 'A special webinar covering advanced design principles and a portfolio review.',
        dateTime: getFutureDateTime(12, 10, 30), // 12 days from now at 10:30 AM
        duration: 90,
        instructorId: 'inst-2',
        audience: 'all',
    },
    {
        id: 'ls-3',
        title: 'Course Kick-off',
        description: 'The kick-off session for the Advanced React course. We will go over the curriculum and expectations.',
        dateTime: getPastDateTime(20, 18, 0), // 20 days ago at 6 PM
        duration: 45,
        instructorId: 'inst-1',
        audience: 'course-1',
    }
];