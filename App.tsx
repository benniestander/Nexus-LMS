import React, { useState, useCallback, useEffect, useReducer, useRef } from 'react';
import { Course, Enrollment, Role, User, Conversation, Message, CalendarEvent, LiveSession, Category, QuizAttempt } from './types';
import { Header } from './components/Header';
import { Sidebar, View as SidebarView } from './components/Sidebar';
import { StudentDashboard } from './pages/StudentDashboard';
import CoursePlayer from './pages/CoursePlayer';
import { ManagementPages } from './pages/CertificationPage';
import { supabase } from './supabaseClient';
import { Auth } from './components/Auth';
import * as api from './supabaseApi';
import { XIcon } from './components/Icons';

type View = SidebarView;

// --- FSM for Authentication State ---
interface AuthState {
  status: 'LOADING' | 'AUTHENTICATED' | 'UNAUTHENTICATED' | 'ERROR';
  user: User | null;
  viewAsRole: Role | null;
  error: any | null;
}

type AuthAction =
  | { type: 'SET_AUTHENTICATED'; payload: { user: User } }
  | { type: 'SET_UNAUTHENTICATED' }
  | { type: 'SET_ERROR'; payload: { error: any } }
  | { type: 'LOGOUT' }
  | { type: 'CHANGE_VIEW_ROLE'; payload: { role: Role } };

const initialState: AuthState = {
  status: 'LOADING',
  user: null,
  viewAsRole: null,
  error: null,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_AUTHENTICATED':
      return { 
          ...state, 
          status: 'AUTHENTICATED', 
          user: action.payload.user, 
          viewAsRole: action.payload.user.role, // Set atomically with user
          error: null 
      };
    case 'SET_UNAUTHENTICATED':
      return { ...state, status: 'UNAUTHENTICATED', user: null, viewAsRole: null, error: null };
    case 'SET_ERROR':
      return { ...state, status: 'ERROR', user: null, viewAsRole: null, error: action.payload.error };
    case 'LOGOUT':
       return { ...initialState, status: 'UNAUTHENTICATED' };
    case 'CHANGE_VIEW_ROLE':
        if (state.status !== 'AUTHENTICATED') return state; // Safety check
        return { ...state, viewAsRole: action.payload.role };
    default:
      return state;
  }
};

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode, size?: 'md' | 'lg' | 'xl' }> = ({ isOpen, onClose, title, children, footer, size = 'lg' }) => {
    if (!isOpen) return null;
    
    const sizeClasses = {
        md: 'max-w-md',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={onClose}>
            <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col`} onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-bold">{title}</h3>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"><XIcon className="w-6 h-6" /></button>
                </div>
                <div className="p-6 flex-grow overflow-y-auto">{children}</div>
                {footer && <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">{footer}</div>}
            </div>
        </div>
    );
};

// --- In-App Database Fixer ---
const SECURITY_POLICY_SCRIPT = `-- Nexus LMS Security Policies v2
-- This script configures all required Row-Level Security (RLS) policies.
-- It is idempotent and can be safely run multiple times.
-- v2 Fix: Resolves a recursive loop between profiles and courses policies.

-- ----------------------------------------
-- 1. Enable RLS on all tables
-- ----------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------
-- 2. Utility Functions (SECURITY DEFINER to bypass RLS)
-- ----------------------------------------
-- Function to get a user's role.
CREATE OR REPLACE FUNCTION get_user_role(user_id uuid)
RETURNS text AS $$
BEGIN
  -- This function is SECURITY DEFINER, so it runs as the owner (postgres)
  -- and bypasses RLS on the profiles table. This is crucial to prevent
  -- recursive policy checks.
  RETURN (SELECT role FROM public.profiles WHERE id = user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a user is an instructor of a specific course.
CREATE OR REPLACE FUNCTION is_instructor_of_course(user_id uuid, course_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.courses
    WHERE id = course_id AND instructor_id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- NEW: Function to check if an instructor can view a student's profile.
-- This breaks the recursive RLS check between profiles and courses.
CREATE OR REPLACE FUNCTION can_instructor_view_profile(instructor_id uuid, student_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.courses c
    JOIN public.enrollments e ON c.id = e.course_id
    WHERE c.instructor_id = instructor_id AND e.user_id = student_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------
-- 3. PROFILES Table Policies
-- ----------------------------------------
DROP POLICY IF EXISTS "Users can view their own profile." ON public.profiles;
CREATE POLICY "Users can view their own profile." ON public.profiles
FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles." ON public.profiles;
CREATE POLICY "Admins can view all profiles." ON public.profiles
FOR SELECT USING (get_user_role(auth.uid()) = 'admin');

-- UPDATED POLICY: Uses the new helper function to prevent recursion.
DROP POLICY IF EXISTS "Instructors can view their students' profiles." ON public.profiles;
CREATE POLICY "Instructors can view their students' profiles." ON public.profiles
FOR SELECT USING (get_user_role(auth.uid()) = 'instructor' AND can_instructor_view_profile(auth.uid(), profiles.id));

DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
CREATE POLICY "Users can update their own profile." ON public.profiles
FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can update any profile." ON public.profiles;
CREATE POLICY "Admins can update any profile." ON public.profiles
FOR UPDATE USING (get_user_role(auth.uid()) = 'admin');

-- NEW: Allow authenticated users to create their own profile record.
-- This is crucial for the app's sign-up/first-login flow.
DROP POLICY IF EXISTS "Authenticated users can create their own profile." ON public.profiles;
CREATE POLICY "Authenticated users can create their own profile." ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id);

-- ----------------------------------------
-- 4. CATEGORIES Table Policies
-- ----------------------------------------
DROP POLICY IF EXISTS "Authenticated users can view categories." ON public.categories;
CREATE POLICY "Authenticated users can view categories." ON public.categories
FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins and instructors can manage categories." ON public.categories;
CREATE POLICY "Admins and instructors can manage categories." ON public.categories
FOR ALL USING (get_user_role(auth.uid()) IN ('admin', 'instructor'));

-- ----------------------------------------
-- 5. COURSES Table Policies
-- ----------------------------------------
DROP POLICY IF EXISTS "Users can view published or enrolled courses." ON public.courses;
CREATE POLICY "Users can view published or enrolled courses." ON public.courses
FOR SELECT USING (
  is_published = true OR
  EXISTS (SELECT 1 FROM public.enrollments WHERE course_id = courses.id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "Instructors/Admins can view their own courses." ON public.courses;
CREATE POLICY "Instructors/Admins can view their own courses." ON public.courses
FOR SELECT USING (instructor_id = auth.uid() OR get_user_role(auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Admins and instructors can create courses." ON public.courses;
CREATE POLICY "Admins and instructors can create courses." ON public.courses
FOR INSERT WITH CHECK (get_user_role(auth.uid()) IN ('admin', 'instructor'));

DROP POLICY IF EXISTS "Instructors can update their own courses." ON public.courses;
CREATE POLICY "Instructors can update their own courses." ON public.courses
FOR UPDATE USING (instructor_id = auth.uid());

DROP POLICY IF EXISTS "Admins can update any course." ON public.courses;
CREATE POLICY "Admins can update any course." ON public.courses
FOR UPDATE USING (get_user_role(auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Course owners and admins can delete courses." ON public.courses;
CREATE POLICY "Course owners and admins can delete courses." ON public.courses
FOR DELETE USING (instructor_id = auth.uid() OR get_user_role(auth.uid()) = 'admin');

-- ----------------------------------------
-- 6. MODULES & LESSONS Policies (depend on course access)
-- ----------------------------------------
DROP POLICY IF EXISTS "Users can view modules of accessible courses." ON public.modules;
CREATE POLICY "Users can view modules of accessible courses." ON public.modules
FOR SELECT USING (EXISTS (
  SELECT 1 FROM public.courses WHERE id = modules.course_id
));

DROP POLICY IF EXISTS "Course owners and admins can manage modules." ON public.modules;
CREATE POLICY "Course owners and admins can manage modules." ON public.modules
FOR ALL USING (
  is_instructor_of_course(auth.uid(), course_id)
  OR get_user_role(auth.uid()) = 'admin'
);

DROP POLICY IF EXISTS "Users can view lessons of accessible courses." ON public.lessons;
CREATE POLICY "Users can view lessons of accessible courses." ON public.lessons
FOR SELECT USING (EXISTS (
  SELECT 1 FROM public.modules m
  JOIN public.courses c ON m.course_id = c.id
  WHERE m.id = lessons.module_id
));

DROP POLICY IF EXISTS "Course owners and admins can manage lessons." ON public.lessons;
CREATE POLICY "Course owners and admins can manage lessons." ON public.lessons
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.modules m
  WHERE m.id = lessons.module_id AND (
    is_instructor_of_course(auth.uid(), m.course_id)
    OR get_user_role(auth.uid()) = 'admin'
  )
));

-- ----------------------------------------
-- 7. ENROLLMENTS Table Policies
-- ----------------------------------------
DROP POLICY IF EXISTS "Users can manage their own enrollments." ON public.enrollments;
CREATE POLICY "Users can manage their own enrollments." ON public.enrollments
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Instructors can view enrollments for their courses." ON public.enrollments;
CREATE POLICY "Instructors can view enrollments for their courses." ON public.enrollments
FOR SELECT USING (is_instructor_of_course(auth.uid(), course_id));

DROP POLICY IF EXISTS "Admins can view all enrollments." ON public.enrollments;
CREATE POLICY "Admins can view all enrollments." ON public.enrollments
FOR SELECT USING (get_user_role(auth.uid()) = 'admin');

-- ----------------------------------------
-- 8. QUIZ_ATTEMPTS Table Policies
-- ----------------------------------------
DROP POLICY IF EXISTS "Users can manage their own quiz attempts." ON public.quiz_attempts;
CREATE POLICY "Users can manage their own quiz attempts." ON public.quiz_attempts
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Instructors and admins can view relevant quiz attempts." ON public.quiz_attempts;
CREATE POLICY "Instructors and admins can view relevant quiz attempts." ON public.quiz_attempts
FOR SELECT USING (
  is_instructor_of_course(auth.uid(), course_id)
  OR get_user_role(auth.uid()) = 'admin'
);

-- ----------------------------------------
-- 9. DISCUSSION_POSTS Table Policies
-- ----------------------------------------
DROP POLICY IF EXISTS "Enrolled users can view discussions." ON public.discussion_posts;
CREATE POLICY "Enrolled users can view discussions." ON public.discussion_posts
FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.modules m ON l.module_id = m.id
    JOIN public.enrollments e ON m.course_id = e.course_id
    WHERE l.id = discussion_posts.lesson_id AND e.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Users can manage their own posts." ON public.discussion_posts;
CREATE POLICY "Users can manage their own posts." ON public.discussion_posts
FOR ALL USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);

-- ----------------------------------------
-- 10. CONVERSATIONS & MESSAGES Policies
-- ----------------------------------------
DROP POLICY IF EXISTS "Users can access conversations they are part of." ON public.conversations;
CREATE POLICY "Users can access conversations they are part of." ON public.conversations
FOR ALL USING (auth.uid() = ANY(participant_ids));

DROP POLICY IF EXISTS "Users can access messages in their conversations." ON public.messages;
CREATE POLICY "Users can access messages in their conversations." ON public.messages
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.conversations
  WHERE id = messages.conversation_id AND auth.uid() = ANY(participant_ids)
));

-- ----------------------------------------
-- 11. CALENDAR & LIVE_SESSIONS Policies
-- ----------------------------------------
DROP POLICY IF EXISTS "Authenticated users can view live sessions." ON public.live_sessions;
CREATE POLICY "Authenticated users can view live sessions." ON public.live_sessions
FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins and instructors can manage live sessions." ON public.live_sessions;
CREATE POLICY "Admins and instructors can manage live sessions." ON public.live_sessions
FOR ALL USING (get_user_role(auth.uid()) IN ('admin', 'instructor'));

DROP POLICY IF EXISTS "Users can manage their own calendar events." ON public.calendar_events;
CREATE POLICY "Users can manage their own calendar events." ON public.calendar_events
FOR ALL USING (auth.uid() = user_id);

-- ----------------------------------------
-- 12. STORAGE Policies (for Avatars)
-- ----------------------------------------
-- Create the bucket if it doesn't exist.
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Avatar images are publicly accessible." ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible." ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Authenticated users can upload avatars." ON storage.objects;
CREATE POLICY "Authenticated users can upload avatars." ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update their own avatars." ON storage.objects;
CREATE POLICY "Users can update their own avatars." ON storage.objects
FOR UPDATE USING (auth.uid() = owner);

-- --- END OF SCRIPT ---
`;

const DatabaseFixer: React.FC<{ error?: any; onLogout?: () => void; isModal?: boolean; }> = ({ error, onLogout, isModal }) => {
    const [isCopied, setIsCopied] = useState(false);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(SECURITY_POLICY_SCRIPT).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    };
    
    const reloadApp = () => window.location.reload();

    const stage = error?.stage?.replace('Res', '') || 'data';
    const message = error?.message || 'An unknown error occurred.';

    const content = (
        <>
            <h2 className="text-2xl font-bold text-red-500 mb-4">{isModal ? 'Database Configuration Required' : 'Application Failed to Load'}</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
                The application was unable to load essential data. This is almost always caused by a missing or incorrect database security configuration.
            </p>
            {!isModal && (
                <div className="my-6 p-4 bg-red-50 dark:bg-red-900/30 rounded-lg text-left">
                    <p><strong className="font-semibold text-red-800 dark:text-red-300">Diagnostic Info:</strong></p>
                    <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                        - Failed Stage: <code className="font-mono bg-red-100 dark:bg-red-800/50 p-1 rounded capitalize">{stage}</code>
                        <br />
                        - Error: <code className="font-mono bg-red-100 dark:bg-red-800/50 p-1 rounded">{message}</code>
                    </p>
                </div>
            )}

            <div className="text-left space-y-4 mt-6">
                <h3 className="font-bold text-lg">How to Fix This</h3>
                <p className="text-sm text-gray-500 dark:text-gray-300">
                    To resolve this, you need to apply the correct security policies to your Supabase project. Please follow these steps exactly:
                </p>
                <ol className="list-decimal list-inside space-y-3 text-sm bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                    <li>
                        Click the button below to copy the complete configuration script to your clipboard.
                        <button onClick={copyToClipboard} className="ml-4 bg-blue-500 text-white font-semibold text-xs py-1 px-3 rounded-md hover:bg-blue-600 transition-colors">
                            {isCopied ? 'Copied!' : 'Copy Configuration Script'}
                        </button>
                    </li>
                    <li>
                        Open your project in the <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-pink-500 font-semibold underline">Supabase Dashboard</a> and navigate to the <strong className="font-semibold">SQL Editor</strong>.
                    </li>
                    <li>Paste the entire script into the editor window.</li>
                    <li>Click the <strong className="font-semibold">"Run"</strong> button.</li>
                    <li>Once the script finishes successfully, return to this page and reload the application.</li>
                </ol>
            </div>

            <div className="mt-8 flex justify-center gap-4">
                {!isModal && onLogout && (
                    <button
                      onClick={onLogout}
                      className="bg-gray-500 text-white font-semibold py-2 px-6 rounded-lg hover:bg-gray-600"
                    >
                      Sign Out
                    </button>
                )}
                 <button
                  onClick={reloadApp}
                  className="bg-pink-500 text-white font-semibold py-2 px-6 rounded-lg hover:bg-pink-600"
                >
                  Reload Application
                </button>
            </div>
        </>
    );

    if (isModal) {
        return content;
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 text-center">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl max-w-3xl w-full">
                {content}
            </div>
        </div>
    );
};


const App: React.FC = () => {
  const [authState, authDispatch] = useReducer(authReducer, initialState);
  
  // --- Live Data States ---
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);

  // --- UI State ---
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isCertificationModalOpen, setIsCertificationModalOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);
  const [isDbFixModalOpen, setIsDbFixModalOpen] = useState(false);
  
  useEffect(() => {
    let isMounted = true;

    const fetchAppData = async (sessionUser: { id: string }) => {
        try {
            const userProfile = await api.getProfile(sessionUser.id);
            if (!userProfile) throw { name: 'DataLoadError', stage: 'Profile', message: 'Your user profile could not be found or created.' };

            // If profile is in degraded mode, we still try to fetch data.
            // Other RLS policies might be in place allowing access.
            // If they are not, `getInitialData` will throw and the error screen will show.
            const appData = await api.getInitialData(userProfile);
            if (!appData) throw { name: 'DataLoadError', stage: 'InitialData', message: 'Failed to load critical application data.' };

            if (isMounted) {
                setCourses(appData.courses);
                setEnrollments(appData.enrollments);
                setAllUsers(appData.allUsers);
                setCategories(appData.categories);
                setConversations(appData.conversations);
                setMessages(appData.messages);
                setCalendarEvents(appData.calendarEvents);
                setLiveSessions(appData.liveSessions);
                authDispatch({ type: 'SET_AUTHENTICATED', payload: { user: userProfile } });
            }
        } catch (error: any) {
            console.error("Error during app initialization:", error);
            // Don't sign out, so the user can see the error screen with their context.
            if (isMounted) {
                authDispatch({ type: 'SET_ERROR', payload: { error } });
            }
        }
    };

    const checkSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && isMounted) {
            await fetchAppData(session.user);
        } else if (isMounted) {
            authDispatch({ type: 'SET_UNAUTHENTICATED' });
        }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (!isMounted) return;
        if (event === 'SIGNED_IN' && session) {
            fetchAppData(session.user);
        } else if (event === 'SIGNED_OUT') {
            authDispatch({ type: 'LOGOUT' });
        }
    });

    return () => {
        isMounted = false;
        subscription?.unsubscribe();
    };
  }, []);


  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    authDispatch({ type: 'LOGOUT' });
  }, []);

  // --- Auto-logout on inactivity ---
  const inactivityTimer = useRef<number | null>(null);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
    }
    // Set a new timer to log the user out after 10 minutes of inactivity.
    inactivityTimer.current = window.setTimeout(() => {
      console.log("User inactive for 10 minutes. Logging out.");
      handleLogout();
    }, 10 * 60 * 1000); // 10 minutes in milliseconds
  }, [handleLogout]);

  useEffect(() => {
    // This effect should only run when the user is authenticated.
    if (authState.status === 'AUTHENTICATED') {
      const activityEvents: (keyof WindowEventMap)[] = [
        'mousemove',
        'mousedown',
        'keypress',
        'scroll',
        'touchstart',
        'keydown',
      ];

      // Initialize the timer when the component mounts or the user authenticates.
      resetInactivityTimer();

      // Add event listeners to reset the timer on user activity.
      activityEvents.forEach((event) => {
        window.addEventListener(event, resetInactivityTimer, { passive: true });
      });

      // Cleanup function to remove listeners and clear the timer.
      return () => {
        if (inactivityTimer.current) {
          clearTimeout(inactivityTimer.current);
        }
        activityEvents.forEach((event) => {
          window.removeEventListener(event, resetInactivityTimer);
        });
      };
    }
  }, [authState.status, resetInactivityTimer]);
  
  const handleSetViewAsRole = (role: Role) => {
      authDispatch({ type: 'CHANGE_VIEW_ROLE', payload: { role } });
      setCurrentView('dashboard'); // Reset to dashboard on role change
  };

  const refetchData = useCallback(async () => {
    if (authState.user) {
      const data = await api.getInitialData(authState.user);
        if (data) {
            setCourses(data.courses);
            setEnrollments(data.enrollments);
            setAllUsers(data.allUsers);
            setCategories(data.categories);
            setConversations(data.conversations);
            setMessages(data.messages);
            setCalendarEvents(data.calendarEvents);
            setLiveSessions(data.liveSessions);
        }
      // Also refetch the user profile itself in case the name/role was changed
      const userProfile = await api.getProfile(authState.user.id);
      if (userProfile) {
          authDispatch({ type: 'SET_AUTHENTICATED', payload: { user: userProfile } });
      }
    }
  }, [authState.user]);
  
  const handleToggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);
  
  const handleNavigate = (view: View) => {
    if (view === currentView && view === 'dashboard') {
        closeMobileMenu();
        return;
    };
    setCurrentView(view);
    setSelectedCourse(null);
    setEditingCourse(null);
    setSelectedCategoryId(null);
    closeMobileMenu();
  };

  const handleSelectCategory = (categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
    setCurrentView('dashboard'); // Navigate to dashboard to see filtered results
    closeMobileMenu();
  };

  const handleSelectCourse = (course: Course) => {
    setSelectedCourse(course);
    setCurrentView('player');
    closeMobileMenu();
  };
  
  const handleCreateCourse = (withCertification: boolean) => {
    if (authState.user) {
        const newCourse: Course = {
            id: `new-course-${Date.now()}`,
            title: '',
            description: '',
            thumbnail: 'https://placehold.co/600x400/e2e8f0/e2e8f0',
            categoryId: categories[0]?.id || '',
            instructorId: authState.user.id,
            instructorName: `${authState.user.firstName} ${authState.user.lastName}`,
            modules: [],
            totalLessons: 0,
            estimatedDuration: 0,
            hasQuizzes: false,
            isCertificationCourse: withCertification,
            isHidden: true, // New courses start as hidden by default
            isPublished: false, // New courses start as drafts
        };

        setEditingCourse(newCourse);
        setCurrentView('course-editor');
        setIsCertificationModalOpen(false);
    }
  };

  const handleEditCourse = (course: Course | null) => {
      closeMobileMenu();
      if (course) {
        setEditingCourse(course);
        setCurrentView('course-editor');
      } else {
        // This is a new course, open the modal to ask about certification.
        setIsCertificationModalOpen(true);
      }
  };

  const handleExitCourseEditor = () => {
    setEditingCourse(null);
    setCurrentView('my-courses');
  }

  const handleSaveCourse = async (updatedCourse: Course) => {
    // Foreign key validation for category.
    // An empty categoryId is caught by the editor's own validation,
    // so we only check for non-empty, invalid IDs.
    if (updatedCourse.categoryId && !categories.some(cat => cat.id === updatedCourse.categoryId)) {
        alert("The selected category no longer exists. Please choose a different category before saving.");
        
        // Update the editor's state via props to clear the invalid category
        // and force the user to re-select.
        setEditingCourse({ ...updatedCourse, categoryId: '' });

        return; // Stop the save process
    }

    const result = await api.saveCourse(updatedCourse);
    if (result.success) {
      await refetchData();
      handleExitCourseEditor(); // Exit ONLY on success
    } else {
      // Don't exit on error, so user can retry without losing their work.
      alert("Error saving course. Please check the console for details.");
    }
  };

  const handleOpenDeleteConfirm = (course: Course) => {
    setCourseToDelete(course);
    setIsDeleteConfirmModalOpen(true);
  };

  const handleCloseDeleteConfirm = () => {
    setCourseToDelete(null);
    setIsDeleteConfirmModalOpen(false);
  };

  const handleDeleteCourse = async () => {
    if (!courseToDelete) return;
    const result = await api.deleteCourse(courseToDelete.id);
    if (result.success) {
        await refetchData();
        handleCloseDeleteConfirm();
    } else {
        alert(`Error deleting course: ${result.error?.message}`);
    }
  };
  
  const handleToggleCourseVisibility = async (course: Course) => {
    const result = await api.updateCourseVisibility(course.id, !course.isHidden);
    if (result.success) {
        // Use an optimistic update for a snappy UI response
        setCourses(prev => prev.map(c => c.id === course.id ? { ...c, isHidden: !course.isHidden } : c));
    } else {
        alert(`Error updating course visibility: ${result.error?.message}`);
        // Optionally refetch to revert optimistic update on failure
        refetchData();
    }
  };

  const handleSaveUserProfile = async (updates: Partial<User> & { id?: string }) => {
    if (!authState.user) return;
    const { id, ...profileUpdates } = updates;

    const targetUserId = id || authState.user.id;
    
    // Update profile table (name, role, etc.)
    if (Object.keys(profileUpdates).length > 0) {
        const { success, error } = await api.updateUserProfile(targetUserId, profileUpdates);
        if (!success) {
            const friendlyMessage = error?.message.includes('user_role') 
                ? "Failed to update profile due to a database configuration issue with user roles. Please contact an administrator."
                : `Failed to update profile. Error: ${error?.message}`;
            alert(friendlyMessage);
            throw new Error(friendlyMessage); // Throw to allow UI to handle loading state
        }
    }

    await refetchData(); // Re-fetch all data to ensure UI is consistent
  };

  const handleUpdatePassword = async (newPassword: string) => {
    if (!authState.user) return;
    
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
        console.error("Error updating password:", error);
        alert(`Error updating password: ${error.message}`);
        throw error;
    }
  };

  const handleExitPlayer = () => {
    setSelectedCourse(null);
    setCurrentView('dashboard');
  };

  const handleEnrollmentUpdate = async (updatedEnrollment: Enrollment) => {
    setEnrollments(prev => prev.map(e => e.courseId === updatedEnrollment.courseId && e.userId === updatedEnrollment.userId ? updatedEnrollment : e));
    await api.updateEnrollment(updatedEnrollment);
  }

  const handleSaveQuizAttempt = async (attempt: Omit<QuizAttempt, 'id' | 'submittedAt'>) => {
    await api.saveQuizAttempt(attempt);
    // Optionally, could add a history log here or refetch analytics data.
  };

  const handleSendMessage = async (recipientIds: string[], subject: string, content: string) => {
    if(!authState.user) return;
    // Simplified: assumes 1-on-1, finds or creates convo
    for(const recipientId of recipientIds) {
      let convo = conversations.find(c => c.participantIds.includes(authState.user!.id) && c.participantIds.includes(recipientId));
      if (!convo) {
        // Create conversation if it doesn't exist
        const { data: newConvoData } = await supabase.from('conversations').insert({ participant_ids: [authState.user.id, recipientId] }).select().single();
        if (newConvoData) {
            convo = api.snakeToCamel(newConvoData);
            setConversations(prev => [...prev, convo!]);
        }
      }
      if (convo) {
        const newMessage = {
            conversationId: convo.id,
            senderId: authState.user.id,
            subject,
            content,
            timestamp: new Date().toISOString()
        };
        const savedMessage = await api.sendMessage(newMessage);
        if (savedMessage) {
            setMessages(prev => [...prev, savedMessage]);
        }
      }
    }
  };
  
  const handleUpdateMessages = (updatedMessages: Message[]) => {
      setMessages(updatedMessages);
      // In a real app, you might only update the changed messages in Supabase
  };

  const handleScheduleSession = async (session: Omit<LiveSession, 'id'>) => {
    await api.scheduleSession(session);
    refetchData(); // Re-fetch to get new session and calendar event
  };

  const handleDeleteSession = async (sessionId: string) => {
    await api.deleteSession(sessionId);
    refetchData();
  };

  const handleAddCategory = async (category: { name: string; parentId: string | null; }) => {
    const result = await api.addCategory(category);
    if (result.success) {
        // Use a functional update to ensure the new category is available immediately
        setCategories(prev => [...prev, result.data]);
        // Also trigger a full refetch to ensure consistency, but don't wait for it
        refetchData();
    } else {
        alert(`Error adding category: ${result.error?.message}`);
    }
    return result;
  };

  const handleUpdateCategory = async (category: { id: string; name: string; parentId: string | null; }) => {
    const result = await api.updateCategory(category);
    if (result.success) {
        await refetchData();
    } else {
        alert(`Error updating category: ${result.error?.message}`);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
        const result = await api.deleteCategory(categoryId);
        if (result.success) {
            await refetchData();
        } else if (result.error) {
            alert(`Error deleting category: ${result.error.message}`);
        }
    } catch (error: any) {
        alert(`Error: ${error.message}`);
    }
  };


  const getEnrollmentForCourse = (courseId: string): Enrollment => {
      if (!authState.user) throw new Error("User not logged in");
      const existingEnrollment = enrollments.find(e => e.courseId === courseId && e.userId === authState.user!.id);
      if (existingEnrollment) return existingEnrollment;
      
      const newEnrollment: Enrollment = {
          userId: authState.user.id,
          courseId: courseId,
          progress: 0,
          completedLessonIds: [],
          quizScores: {},
      };
      setEnrollments(prev => [...prev, newEnrollment]);
      api.updateEnrollment(newEnrollment); // Create it in DB
      return newEnrollment;
  };

  const renderContent = () => {
    if (!authState.user || !authState.viewAsRole) return null;
    
    // Common props for ManagementPages
    const managementPagesProps = {
        user: authState.user,
        courses,
        enrollments,
        allUsers,
        conversations,
        messages,
        calendarEvents,
        liveSessions,
        categories,
        selectedCategoryId,
        onRefetchData: refetchData,
        // FIX: Changed shorthand property to explicit key-value pair to match handler function names.
        onSendMessage: handleSendMessage,
        // FIX: Changed shorthand property to explicit key-value pair to match handler function names.
        onUpdateMessages: handleUpdateMessages,
        // FIX: Changed shorthand property to explicit key-value pair to match handler function names.
        onScheduleSession: handleScheduleSession,
        // FIX: Changed shorthand property to explicit key-value pair to match handler function names.
        onDeleteSession: handleDeleteSession,
        onEditCourse: handleEditCourse,
        onSelectCourse: handleSelectCourse,
        onSaveUserProfile: handleSaveUserProfile,
        onUpdatePassword: handleUpdatePassword,
        onSave: handleSaveCourse,
        onExit: handleExitCourseEditor,
        courseToEdit: editingCourse,
        onAddCategory: handleAddCategory,
        onUpdateCategory: handleUpdateCategory,
        onDeleteCategory: handleDeleteCategory,
        onDeleteCourse: handleOpenDeleteConfirm,
        onToggleCourseVisibility: handleToggleCourseVisibility,
        // FIX: Add missing onNavigate prop to fix TypeScript errors.
        onNavigate: handleNavigate,
    };

    if (currentView === 'course-editor') {
        return <ManagementPages view="course-editor" {...managementPagesProps} />;
    }

    if (currentView === 'player' && selectedCourse) {
        return (
            <CoursePlayer 
              user={authState.user}
              course={selectedCourse}
              enrollment={getEnrollmentForCourse(selectedCourse.id)}
              onExit={handleExitPlayer}
              onEnrollmentUpdate={handleEnrollmentUpdate}
              onSaveQuizAttempt={handleSaveQuizAttempt}
            />
        );
    }
    
    if (currentView === 'dashboard') {
        return (
             <StudentDashboard
              user={authState.user}
              viewAsRole={authState.viewAsRole}
              courses={courses}
              enrollments={enrollments}
              allUsers={allUsers}
              onSelectCourse={handleSelectCourse}
              onNavigate={handleNavigate}
              onEditCourse={handleEditCourse}
              categories={categories}
              selectedCategoryId={selectedCategoryId}
            />
        );
    }

    // This handles all other management views
    if (currentView !== 'player') {
        return <ManagementPages view={currentView} {...managementPagesProps} />;
    }

    return null; // Should not happen
  }

  switch (authState.status) {
    case 'LOADING':
      return <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200"><div className="bg-purple-600 text-white font-semibold px-6 py-3 rounded-lg">Loading Nexus...</div></div>;
    
    case 'UNAUTHENTICATED':
      return <Auth />;

    case 'ERROR':
      return <DatabaseFixer error={authState.error} onLogout={handleLogout} />;

    case 'AUTHENTICATED':
      if (!authState.user || !authState.viewAsRole) {
         return <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200"><div className="bg-purple-600 text-white font-semibold px-6 py-3 rounded-lg">Loading Nexus...</div></div>;
      }
      return (
        <div className="min-h-screen flex">
          <Modal
                isOpen={isCertificationModalOpen}
                onClose={() => setIsCertificationModalOpen(false)}
                title="Create New Course"
            >
                <div className="text-center">
                    <h4 className="text-lg font-semibold mb-2">Will this course offer a certificate upon completion?</h4>
                    <p className="text-gray-600 dark:text-gray-400">
                        Certification is based on passing all module quizzes within the course.
                    </p>
                </div>
                <div className="flex justify-center gap-4 mt-8">
                    <button 
                        onClick={() => handleCreateCourse(false)}
                        className="bg-gray-200 dark:bg-gray-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                    >
                        No
                    </button>
                    <button 
                        onClick={() => handleCreateCourse(true)}
                        className="bg-pink-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-pink-600 transition-colors"
                    >
                        Yes
                    </button>
                </div>
            </Modal>
             <Modal
                isOpen={isDeleteConfirmModalOpen}
                onClose={handleCloseDeleteConfirm}
                title="Confirm Deletion"
            >
                <div>
                    <p className="text-gray-600 dark:text-gray-400">Are you sure you want to delete the course "<strong>{courseToDelete?.title}</strong>"? This action is irreversible and will delete all associated modules, lessons, and enrollment data.</p>
                </div>
                 <div className="flex justify-end gap-4 mt-8">
                    <button onClick={handleCloseDeleteConfirm} className="bg-gray-200 dark:bg-gray-600 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">Cancel</button>
                    <button onClick={handleDeleteCourse} className="bg-red-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors">Delete Course</button>
                </div>
            </Modal>
            <Modal
              isOpen={isDbFixModalOpen}
              onClose={() => setIsDbFixModalOpen(false)}
              title="Database Configuration Fix"
              size="xl"
            >
                <DatabaseFixer isModal />
            </Modal>
          <Sidebar 
            userRole={authState.user.role} 
            viewAsRole={authState.viewAsRole}
            onNavigate={handleNavigate} 
            currentView={currentView} 
            isMobileMenuOpen={isMobileMenuOpen}
            closeMenu={closeMobileMenu}
            onLogout={handleLogout}
            categories={categories}
            onSelectCategory={handleSelectCategory}
            selectedCategoryId={selectedCategoryId}
          />
           {isMobileMenuOpen && (
            <div 
              onClick={closeMobileMenu} 
              className="fixed inset-0 bg-black/60 z-40 md:hidden"
              aria-hidden="true"
            ></div>
          )}
          <div className="flex-1 flex flex-col">
            {authState.user?.isDegraded && (
              <div className="bg-yellow-400 dark:bg-yellow-600 text-black dark:text-white p-3 text-center z-50 flex items-center justify-center gap-4">
                <p><span className="font-bold">Configuration Issue:</span> Your user profile could not be fully loaded due to a database permission error. Please apply the required configuration to restore full functionality.</p>
                <button onClick={() => setIsDbFixModalOpen(true)} className="bg-black/20 hover:bg-black/30 text-white font-bold py-1 px-3 rounded-md transition-colors whitespace-nowrap">
                  Show Fix
                </button>
              </div>
            )}
            <Header 
                user={authState.user} 
                viewAsRole={authState.viewAsRole} 
                onSetViewAsRole={handleSetViewAsRole} 
                onLogout={handleLogout} 
                onNavigate={handleNavigate}
            />
            <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 h-[calc(100vh-96px)]">
              {renderContent()}
            </main>
          </div>
        </div>
      );
  }
};

export default App;
