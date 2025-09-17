// FIX: Replaced placeholder content with a fully functional root component.
// This component manages application state, authentication, data fetching, and routing between different views.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Auth } from './components/Auth';
import { supabase, supabaseInitializationError, configuredSupabaseUrl } from './supabaseClient';
import * as api from './supabaseApi';
import { User, Role, Course, Enrollment, Conversation, Message, CalendarEvent, LiveSession, Category, QuizAttempt } from './types';
import { Sidebar, View } from './components/Sidebar';
import { Header } from './components/Header';
import { StudentDashboard } from './pages/StudentDashboard';
import CoursePlayer from './pages/CoursePlayer';
import { ManagementPages } from './pages/CertificationPage';
import { MenuIcon, BookOpenIcon, FlameIcon } from './components/Icons';

// --- Error Components ---

const SupabaseConfigError: React.FC = () => (
    <div className="bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-200 p-6 rounded-lg shadow-md max-w-4xl mx-auto my-8">
        <div className="flex items-center">
            <FlameIcon className="w-8 h-8 mr-4 text-red-500" />
            <h2 className="text-2xl font-bold">Database Connection Not Configured</h2>
        </div>
        <p className="mt-4">
            This application cannot start because it's using placeholder database credentials.
        </p>
        <p className="mt-2">
            To connect the app to <strong>your</strong> Supabase project, you need to replace the placeholder values in the code with your project's unique URL and Key.
        </p>
        <ol className="mt-4 list-decimal list-inside space-y-2">
            <li>Go to your project on the <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="font-bold underline">Supabase Dashboard</a>.</li>
            <li>In the left sidebar, navigate to <strong>Project Settings</strong> (the gear icon), then select <strong>API</strong>.</li>
            <li>Under <strong>Project URL</strong>, copy your project's URL.</li>
            <li>Under <strong>Project API Keys</strong>, find and copy the <strong>anon public</strong> key.</li>
            <li>Open the file <code>supabaseClient.ts</code> in the code editor.</li>
            <li>Replace the placeholder values for <code>supabaseUrl</code> and <code>supabaseAnonKey</code> with the URL and Key you just copied. The app will automatically reload when you save the file.</li>
        </ol>
        <div className="mt-6 bg-gray-800 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
            <pre>
                <code>
                    <span className="text-gray-400">// supabaseClient.ts</span><br/><br/>
                    const supabaseUrl = "YOUR_SUPABASE_URL";<br/>
                    const supabaseAnonKey = "YOUR_SUPABASE_ANON_KEY";
                </code>
            </pre>
        </div>
    </div>
);


const DatabaseSecurityError: React.FC = () => (
    <div className="bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-200 p-6 rounded-lg shadow-md max-w-4xl mx-auto my-8">
        <div className="flex items-center">
            <FlameIcon className="w-8 h-8 mr-4 text-red-500" />
            <h2 className="text-2xl font-bold">Database Security Policies Required</h2>
        </div>
        <p className="mt-4">
            The application has successfully connected to your database, but it cannot load data.
            This is because Supabase's <strong>Row-Level Security (RLS)</strong> is enabled, but the required security policies have not been applied.
        </p>
        <p className="mt-2">
            To fix this, copy the entire SQL script below and run it in your project's <strong>SQL Editor</strong> on the Supabase dashboard. This one-time setup will grant the necessary permissions for the application to function correctly.
        </p>
        <div className="mt-6 bg-gray-800 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto max-h-96">
            <pre>
                <code>
                    {SECURITY_POLICY_SCRIPT}
                </code>
            </pre>
        </div>
    </div>
);

const App: React.FC = () => {
    // State for auth, user profile, and data
    const [session, setSession] = useState<any>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [appError, setAppError] = useState<string | null>(null);
    const [showRlsError, setShowRlsError] = useState(false);

    // Data state
    const [courses, setCourses] = useState<Course[]>([]);
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
    const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);

    // UI State
    const [view, setView] = useState<View>('dashboard');
    const [viewAsRole, setViewAsRole] = useState<Role>(Role.STUDENT);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [courseToEdit, setCourseToEdit] = useState<Course | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

    const refetchData = useCallback(async () => {
        if (user) {
            setIsLoading(true);
            setAppError(null);
            setShowRlsError(false);
            try {
                const data = await api.getInitialData(user);
                setCourses(data.courses);
                setEnrollments(data.enrollments);
                setAllUsers(data.allUsers);
                setConversations(data.conversations);
                setMessages(data.messages);
                setCalendarEvents(data.calendarEvents);
                setLiveSessions(data.liveSessions);
                setCategories(data.categories);
            } catch (error: any) {
                console.error("Data fetch failed:", error);
    
                const stage = error?.stage || 'unknown';
                // RLS errors have code '42501'
                if (error?.code === '42501' || (typeof error?.message === 'string' && error.message.includes('permission denied'))) {
                    setShowRlsError(true);
                    setAppError(`A database permission error occurred at stage '${stage}'.`);
                } else {
                    // For all other errors, create a detailed message
                    let detail = 'No further details available.';
                    if (typeof error?.message === 'string') {
                        detail = error.message;
                        if(typeof error?.details === 'string') detail += ` Details: ${error.details}`;
                        if(typeof error?.hint === 'string') detail += ` Hint: ${error.hint}`;
                        if(typeof error?.code === 'string') detail += ` (Code: ${error.code})`;
                    } else {
                        try {
                            // As a fallback, stringify the error object
                            detail = JSON.stringify(error);
                        } catch {
                            detail = 'Could not stringify the error object.';
                        }
                    }
                    setAppError(`Failed to load application data at stage '${stage}'. Error: ${detail}`);
                }
            } finally {
                setIsLoading(false);
            }
        }
    }, [user]);

    useEffect(() => {
        if (supabaseInitializationError) {
            setAppError(supabaseInitializationError);
            setIsLoading(false);
            return;
        }

        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (!session) setIsLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (!session) {
                setUser(null);
                setCourses([]);
                setEnrollments([]);
                setAllUsers([]);
                setConversations([]);
                setMessages([]);
                setCalendarEvents([]);
                setLiveSessions([]);
                setCategories([]);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (session && !user) {
            api.getProfile(session.user.id).then(profile => {
                if (profile) {
                    setUser(profile);
                    setViewAsRole(profile.role);
                    if (profile.isDegraded) {
                        setShowRlsError(true);
                        setAppError('A database permission error occurred while fetching your profile.');
                    }
                } else {
                    setAppError("Could not load your user profile. Please contact support.");
                    setIsLoading(false);
                }
            }).catch(err => {
                 setAppError(`Error fetching profile: ${err.message}`);
                 setIsLoading(false);
            });
        }
    }, [session, user]);

    useEffect(() => {
        if (user && !user.isDegraded) {
            refetchData();
        } else if (user?.isDegraded) {
            setIsLoading(false);
        }
    }, [user, refetchData]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setView('dashboard');
    };

    const handleNavigate = (newView: Exclude<View, 'player' | 'course-editor'>) => {
        setView(newView);
        setSelectedCourse(null);
        setCourseToEdit(null);
    };

    const handleSelectCourse = (course: Course) => {
        setSelectedCourse(course);
        setView('player');
    };
    
    const handleEditCourse = (course: Course | null) => {
        // Ensure the course category exists. If not, reset it to prevent errors.
        if (course && course.categoryId && !categories.some(c => c.id === course.categoryId)) {
            course.categoryId = '';
        }
        setCourseToEdit(course);
        setView('course-editor');
    };

    const handleSaveCourse = async (courseToSave: Course) => {
        const result = await api.saveCourse(courseToSave);
        if (result.success) {
            alert('Course saved successfully!');
            setView('my-courses');
            refetchData();
        } else {
            alert(`Error saving course: ${result.error?.message}`);
        }
    };
    
    const handleDeleteCourse = async (courseToDelete: Course) => {
        if (window.confirm(`Are you sure you want to permanently delete "${courseToDelete.title}"? This cannot be undone.`)) {
            const result = await api.deleteCourse(courseToDelete.id);
            if (result.success) {
                alert('Course deleted successfully!');
                refetchData();
            } else {
                alert(`Error deleting course: ${result.error?.message}`);
            }
        }
    };

    const handleToggleCourseVisibility = async (courseToToggle: Course) => {
        const result = await api.updateCourseVisibility(courseToToggle.id, !courseToToggle.isHidden);
        if (result.success) {
            refetchData();
        } else {
            alert('Failed to update visibility.');
        }
    };
    
     const handleSelectCategory = (id: string | null) => {
        setSelectedCategoryId(id);
        setView('dashboard');
    };

    const handleSendMessage = async (recipientIds: string[], subject: string, content: string) => {
        if (!user) return;
        let conversationId: string | undefined;

        if (recipientIds.length === 1) {
            const recipientId = recipientIds[0];
            const existingConvo = conversations.find(c => 
                c.participantIds.length === 2 && 
                c.participantIds.includes(user.id) && 
                c.participantIds.includes(recipientId)
            );
            conversationId = existingConvo?.id;
        }

        if (!conversationId) {
            const { data: newConvo, error } = await supabase.from('conversations').insert({ participant_ids: [user.id, ...recipientIds]}).select().single();
            if(error) { alert("Failed to create conversation"); return; }
            conversationId = newConvo.id;
        }
        
        const timestamp = new Date().toISOString();
        const newMessage = await api.sendMessage({ conversationId, senderId: user.id, subject, content, timestamp });
        if(newMessage) {
            setMessages(prev => [...prev, newMessage]);
            if (!conversations.find(c => c.id === conversationId)) refetchData();
        }
    };

    const handleSaveUserProfile = async (updates: Partial<User> & { id?: string }) => {
        const userId = updates.id || user?.id;
        if (!userId) { alert("User ID not found."); return; }
        const { success, error } = await api.updateUserProfile(userId, updates);
        if (success) {
            alert("Profile updated successfully!");
            refetchData();
        } else {
            alert(`Failed to update profile: ${error.message}`);
            throw new Error(error.message);
        }
    };
    
    const handleUpdatePassword = async (newPassword: string) => {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) {
            alert(`Failed to update password: ${error.message}`);
            throw new Error(error.message);
        }
    };

    const handleAddCategory = async (category: { name: string, parentId: string | null }) => {
        const result = await api.addCategory(category);
        if (result.success) refetchData();
        else alert(`Failed to add category: ${result.error?.message}`);
        return result;
    };

    const handleUpdateCategory = async (category: { id: string, name: string, parentId: string | null }) => {
        await api.updateCategory(category);
        refetchData();
    };

    const handleDeleteCategory = async (categoryId: string) => {
        const result = await api.deleteCategory(categoryId);
        if(result.success) refetchData();
        else alert(`Error: ${result.error?.message}`);
    };

    const currentEnrollment = useMemo(() => {
        if (!user || !selectedCourse) return null;
        return enrollments.find(e => e.userId === user.id && e.courseId === selectedCourse.id) || {
            userId: user.id,
            courseId: selectedCourse.id,
            progress: 0,
            completedLessonIds: [],
            quizScores: {},
        };
    }, [user, selectedCourse, enrollments]);

    const handleEnrollmentUpdate = useCallback(async (enrollment: Enrollment) => {
        const existingEnrollment = enrollments.find(e => e.userId === enrollment.userId && e.courseId === enrollment.courseId);
        
        setEnrollments(prev => {
            if (existingEnrollment) {
                return prev.map(e => (e.userId === enrollment.userId && e.courseId === enrollment.courseId) ? enrollment : e);
            }
            return [...prev, enrollment];
        });

        const updatedEnrollment = await api.updateEnrollment(enrollment);
        if (updatedEnrollment) {
             setEnrollments(prev => prev.map(e => (e.userId === updatedEnrollment.userId && e.courseId === updatedEnrollment.courseId) ? updatedEnrollment : e));
        }
    }, [enrollments]);

    const handleSaveQuizAttempt = async (attempt: Omit<QuizAttempt, 'id' | 'submittedAt'>) => {
        await api.saveQuizAttempt(attempt);
    };

    const handleScheduleSession = async (session: Omit<LiveSession, 'id'>) => {
        const newSession = await api.scheduleSession(session);
        if(newSession) refetchData();
    };

    const handleDeleteSession = async (sessionId: string) => {
        const { success } = await api.deleteSession(sessionId);
        if(success) refetchData();
    };

    // --- RENDER LOGIC ---

    if (isLoading && !appError) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-white dark:bg-gray-900">
                <BookOpenIcon className="w-12 h-12 text-pink-500 animate-pulse" />
            </div>
        );
    }

    if (appError?.includes('Supabase credentials')) {
        return <SupabaseConfigError />;
    }

    if (!session) {
        return <Auth />;
    }
    
    if (appError && !showRlsError) {
        return <div className="p-8 text-red-500 font-mono bg-red-50 dark:bg-red-900/50 h-screen w-full overflow-auto">
            <h2 className="text-xl font-bold mb-4">Application Error</h2>
            <pre className="whitespace-pre-wrap break-words">{appError}</pre>
        </div>;
    }

    if (!user) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-white dark:bg-gray-900">
                <div className="text-center">
                    <BookOpenIcon className="w-12 h-12 text-pink-500 animate-pulse mx-auto" />
                    <p className="mt-4">Finalizing login...</p>
                </div>
            </div>
        );
    }
    
    let mainContent;
    if (view === 'player') {
        if (selectedCourse && currentEnrollment) {
            mainContent = <CoursePlayer 
                user={user} 
                course={selectedCourse} 
                enrollment={currentEnrollment}
                onExit={() => { setView('dashboard'); setSelectedCourse(null); }} 
                onEnrollmentUpdate={handleEnrollmentUpdate}
                onSaveQuizAttempt={handleSaveQuizAttempt}
            />;
        } else {
             mainContent = (
                <div className="h-screen w-full flex items-center justify-center bg-white dark:bg-gray-900">
                    <BookOpenIcon className="w-12 h-12 text-pink-500 animate-pulse" />
                </div>
            );
        }
    } else if (view === 'dashboard') {
        mainContent = <StudentDashboard 
            user={user} 
            viewAsRole={viewAsRole} 
            courses={courses} 
            enrollments={enrollments} 
            allUsers={allUsers}
            onSelectCourse={handleSelectCourse}
            onNavigate={handleNavigate}
            onEditCourse={handleEditCourse}
            categories={categories}
            selectedCategoryId={selectedCategoryId}
        />;
    } else {
        mainContent = <ManagementPages
            view={view}
            user={user}
            courses={courses}
            enrollments={enrollments}
            allUsers={allUsers}
            onEditCourse={handleEditCourse}
            onSelectCourse={handleSelectCourse}
            onDeleteCourse={handleDeleteCourse}
            onToggleCourseVisibility={handleToggleCourseVisibility}
            conversations={conversations}
            messages={messages}
            onSendMessage={handleSendMessage}
            onUpdateMessages={(msgs) => setMessages(msgs)}
            calendarEvents={calendarEvents}
            liveSessions={liveSessions}
            onScheduleSession={handleScheduleSession}
            onDeleteSession={handleDeleteSession}
            onRefetchData={refetchData}
            courseToEdit={courseToEdit}
            onSave={handleSaveCourse}
            onExit={() => { setView('my-courses'); setCourseToEdit(null); }}
            onSaveUserProfile={handleSaveUserProfile}
            onUpdatePassword={handleUpdatePassword}
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onAddCategory={handleAddCategory}
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategory}
            onNavigate={handleNavigate}
        />;
    }
    
    const showLayout = view !== 'player';

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
            {showLayout && (
                 <Sidebar
                    userRole={user.role}
                    viewAsRole={viewAsRole}
                    onNavigate={handleNavigate}
                    currentView={view}
                    isMobileMenuOpen={isMobileMenuOpen}
                    closeMenu={() => setIsMobileMenuOpen(false)}
                    onLogout={handleLogout}
                    categories={categories}
                    onSelectCategory={handleSelectCategory}
                    selectedCategoryId={selectedCategoryId}
                />
            )}
           
            <div className="flex-1 flex flex-col overflow-hidden">
                {showLayout && (
                     <div className="flex-shrink-0">
                        <Header
                            user={user}
                            viewAsRole={viewAsRole}
                            onSetViewAsRole={setViewAsRole}
                            onLogout={handleLogout}
                            onNavigate={handleNavigate}
                        />
                    </div>
                )}
                <main className="flex-1 overflow-y-auto">
                    {showRlsError && <DatabaseSecurityError />}
                    {mainContent}
                </main>
                
                {showLayout && (
                     <button
                        className="md:hidden fixed top-8 right-6 z-40 p-2 bg-white dark:bg-gray-800 rounded-md shadow-lg"
                        onClick={() => setIsMobileMenuOpen(true)}
                    >
                        <MenuIcon className="w-6 h-6" />
                    </button>
                )}
            </div>
        </div>
    );
};

const SECURITY_POLICY_SCRIPT = `-- Nexus LMS Security Policies v4
-- This script is idempotent and can be run multiple times safely.

-- 1. Enable RLS for all relevant tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- 2. Create helper functions
DROP FUNCTION IF EXISTS get_user_role(p_user_id uuid);
CREATE OR REPLACE FUNCTION get_user_role(p_user_id uuid)
RETURNS text AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = p_user_id;
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. PROFILES POLICIES
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles" ON public.profiles FOR ALL USING (get_user_role(auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Instructors can see their students profiles" ON public.profiles;
CREATE POLICY "Instructors can see their students profiles" ON public.profiles FOR SELECT USING (
  (get_user_role(auth.uid()) = 'instructor') AND (
    EXISTS (
      SELECT 1
      FROM public.enrollments e
      JOIN public.courses c ON e.course_id = c.id
      WHERE c.instructor_id = auth.uid() AND e.user_id = profiles.id
    )
  )
);

-- 4. COURSES POLICIES
DROP POLICY IF EXISTS "Anyone can view published courses" ON public.courses;
CREATE POLICY "Anyone can view published courses" ON public.courses FOR SELECT USING (is_published = true);

DROP POLICY IF EXISTS "Enrolled students can view their unpublished courses" ON public.courses;
CREATE POLICY "Enrolled students can view their unpublished courses" ON public.courses FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.enrollments WHERE course_id = courses.id AND user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Instructors/Admins can see all their courses" ON public.courses;
CREATE POLICY "Instructors/Admins can see all their courses" ON public.courses FOR SELECT USING (
    (get_user_role(auth.uid()) = 'instructor' AND instructor_id = auth.uid())
    OR (get_user_role(auth.uid()) = 'admin')
);

DROP POLICY IF EXISTS "Instructors can manage their own courses" ON public.courses;
CREATE POLICY "Instructors can manage their own courses" ON public.courses FOR ALL USING (
  (get_user_role(auth.uid()) = 'instructor' AND instructor_id = auth.uid())
);

DROP POLICY IF EXISTS "Admins can manage all courses" ON public.courses;
CREATE POLICY "Admins can manage all courses" ON public.courses FOR ALL USING (
  get_user_role(auth.uid()) = 'admin'
);

-- 5. MODULES & LESSONS POLICIES (Content can be viewed if the course can be viewed)
DROP POLICY IF EXISTS "Users can view modules for accessible courses" ON public.modules;
CREATE POLICY "Users can view modules for accessible courses" ON public.modules FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.courses WHERE id = modules.course_id
  )
);

DROP POLICY IF EXISTS "Instructors/Admins can manage modules for their courses" ON public.modules;
CREATE POLICY "Instructors/Admins can manage modules for their courses" ON public.modules FOR ALL USING (
  (
    get_user_role(auth.uid()) = 'instructor' AND
    EXISTS (SELECT 1 FROM courses WHERE id = modules.course_id AND instructor_id = auth.uid())
  ) OR (get_user_role(auth.uid()) = 'admin')
);

DROP POLICY IF EXISTS "Users can view lessons for accessible courses" ON public.lessons;
CREATE POLICY "Users can view lessons for accessible courses" ON public.lessons FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.modules m JOIN public.courses c ON m.course_id = c.id WHERE m.id = lessons.modules
  )
);

DROP POLICY IF EXISTS "Instructors/Admins can manage lessons for their courses" ON public.lessons;
CREATE POLICY "Instructors/Admins can manage lessons for their courses" ON public.lessons FOR ALL USING (
  (
    get_user_role(auth.uid()) = 'instructor' AND
    EXISTS (SELECT 1 FROM modules m JOIN courses c ON m.course_id = c.id WHERE m.id = lessons.modules AND c.instructor_id = auth.uid())
  ) OR (get_user_role(auth.uid()) = 'admin')
);

-- 6. ENROLLMENTS POLICIES
DROP POLICY IF EXISTS "Users can manage their own enrollments" ON public.enrollments;
CREATE POLICY "Users can manage their own enrollments" ON public.enrollments FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Instructors can view enrollments for their courses" ON public.enrollments;
CREATE POLICY "Instructors can view enrollments for their courses" ON public.enrollments FOR SELECT USING (
  (get_user_role(auth.uid()) = 'instructor') AND
  EXISTS (SELECT 1 FROM courses c WHERE c.id = enrollments.course_id AND c.instructor_id = auth.uid())
);

DROP POLICY IF EXISTS "Admins can see all enrollments" ON public.enrollments;
CREATE POLICY "Admins can see all enrollments" ON public.enrollments FOR SELECT USING (get_user_role(auth.uid()) = 'admin');

-- 7. QUIZ_ATTEMPTS POLICIES
DROP POLICY IF EXISTS "Users can manage their own quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Users can manage their own quiz attempts" ON public.quiz_attempts FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Instructors can view attempts for their courses" ON public.quiz_attempts;
CREATE POLICY "Instructors can view attempts for their courses" ON public.quiz_attempts FOR SELECT USING (
  (get_user_role(auth.uid()) = 'instructor') AND
  EXISTS (SELECT 1 FROM courses c WHERE c.id = quiz_attempts.course_id AND c.instructor_id = auth.uid())
);

DROP POLICY IF EXISTS "Admins can see all quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Admins can see all quiz attempts" ON public.quiz_attempts FOR SELECT USING (get_user_role(auth.uid()) = 'admin');

-- 8. DISCUSSION & MESSAGING POLICIES
DROP POLICY IF EXISTS "Users can view discussions for accessible courses" ON public.discussion_posts;
CREATE POLICY "Users can view discussions for accessible courses" ON public.discussion_posts FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM lessons l
    JOIN modules m ON l.modules = m.id
    JOIN courses c ON m.course_id = c.id
    WHERE l.id = discussion_posts.lesson_id
  )
);

DROP POLICY IF EXISTS "Users can insert their own discussion posts" ON public.discussion_posts;
CREATE POLICY "Users can insert their own discussion posts" ON public.discussion_posts FOR INSERT WITH CHECK (auth.uid() = author_id);

-- FIX: Split invalid UPDATE, DELETE policy into two separate policies.
DROP POLICY IF EXISTS "Users can edit/delete their own posts" ON public.discussion_posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.discussion_posts;
CREATE POLICY "Users can update their own posts" ON public.discussion_posts FOR UPDATE USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can delete their own posts" ON public.discussion_posts;
CREATE POLICY "Users can delete their own posts" ON public.discussion_posts FOR DELETE USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Conversation participants can manage conversations and messages" ON public.conversations;
CREATE POLICY "Conversation participants can manage conversations and messages" ON public.conversations FOR ALL USING (auth.uid() = ANY(participant_ids));
DROP POLICY IF EXISTS "Message participants can manage messages" ON public.messages;
CREATE POLICY "Message participants can manage messages" ON public.messages FOR ALL USING (
  EXISTS (
    SELECT 1 FROM conversations WHERE id = messages.conversation_id AND auth.uid() = ANY(participant_ids)
  )
);

-- 9. CALENDAR & LIVE SESSIONS POLICIES
DROP POLICY IF EXISTS "Users can manage their own calendar events" ON public.calendar_events;
CREATE POLICY "Users can manage their own calendar events" ON public.calendar_events FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view relevant live sessions" ON public.live_sessions;
CREATE POLICY "Users can view relevant live sessions" ON public.live_sessions FOR SELECT USING (
  audience = 'all' OR
  (audience IN (SELECT course_id FROM enrollments WHERE user_id = auth.uid())) OR
  (instructor_id = auth.uid())
);

DROP POLICY IF EXISTS "Instructors/Admins can manage live sessions" ON public.live_sessions;
CREATE POLICY "Instructors/Admins can manage live sessions" ON public.live_sessions FOR ALL USING (
  (get_user_role(auth.uid()) = 'instructor' AND instructor_id = auth.uid()) OR (get_user_role(auth.uid()) = 'admin')
);

-- 10. CATEGORIES POLICIES
DROP POLICY IF EXISTS "Authenticated users can read categories" ON public.categories;
CREATE POLICY "Authenticated users can read categories" ON public.categories FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Instructors/Admins can manage categories" ON public.categories;
CREATE POLICY "Instructors/Admins can manage categories" ON public.categories FOR ALL USING (
  get_user_role(auth.uid()) IN ('instructor', 'admin')
);

-- --- END OF SCRIPT ---
`;

export default App;