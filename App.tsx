import React, { useState, useCallback, useEffect, useReducer, useRef } from 'react';
import { Course, Enrollment, Role, User, Conversation, Message, CalendarEvent, HistoryLog, LiveSession, Category } from './types';
import { Header } from './components/Header';
import { Sidebar, View as SidebarView } from './components/Sidebar';
import { StudentDashboard } from './pages/StudentDashboard';
import CoursePlayer from './pages/CoursePlayer';
import { ManagementPages } from './pages/CertificationPage';
import { supabase } from './supabaseClient';
import { Auth } from './components/Auth';
import * as api from './supabaseApi';

type View = SidebarView;

// --- FSM for Authentication State ---
interface AuthState {
  status: 'LOADING' | 'AUTHENTICATED' | 'UNAUTHENTICATED' | 'ERROR';
  user: User | null;
  viewAsRole: Role | null;
  error: string | null;
}

type AuthAction =
  | { type: 'SET_AUTHENTICATED'; payload: { user: User } }
  | { type: 'SET_UNAUTHENTICATED' }
  | { type: 'SET_ERROR'; payload: { error: string } }
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
  const [historyLogs, setHistoryLogs] = useState<HistoryLog[]>([]);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);

  // --- UI State ---
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  
  useEffect(() => {
    let isMounted = true;

    const fetchAppData = async (sessionUser: { id: string }) => {
        try {
            const userProfile = await api.getProfile(sessionUser.id);
            if (!userProfile) throw new Error('Your user profile could not be found. Please contact support.');

            const appData = await api.getInitialData(userProfile);
            if (!appData) throw new Error('Failed to load critical application data.');

            if (isMounted) {
                setCourses(appData.courses);
                setEnrollments(appData.enrollments);
                setAllUsers(appData.allUsers);
                setCategories(appData.categories);
                setConversations(appData.conversations);
                setMessages(appData.messages);
                setCalendarEvents(appData.calendarEvents);
                setHistoryLogs(appData.historyLogs);
                setLiveSessions(appData.liveSessions);
                authDispatch({ type: 'SET_AUTHENTICATED', payload: { user: userProfile } });
            }
        } catch (error: any) {
            console.error("Error during app initialization:", error);
            await supabase.auth.signOut().catch(() => {});
            if (isMounted) {
                authDispatch({ type: 'SET_ERROR', payload: { error: error.message || 'An unknown error occurred during startup.' } });
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
            setHistoryLogs(data.historyLogs);
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
  
  const handleEditCourse = (course: Course | null) => {
      if (course) {
        setEditingCourse(course);
      } else {
        // Create a new, blank course object for the editor
        if (authState.user) {
            setEditingCourse({
                id: `new-course-${Date.now()}`,
                title: '',
                description: '',
                thumbnail: 'https://placehold.co/600x400/e2e8f0/e2e8f0', // default placeholder
                categoryId: categories[0]?.id || '',
                instructorId: authState.user.id,
                instructorName: `${authState.user.firstName} ${authState.user.lastName}`,
                modules: [],
                totalLessons: 0,
                estimatedDuration: 0,
            });
        }
      }
      setCurrentView('course-editor');
      closeMobileMenu();
  };

  const handleExitCourseEditor = () => {
    setEditingCourse(null);
    setCurrentView('my-courses');
  }

  const handleSaveCourse = async (updatedCourse: Course) => {
    const result = await api.saveCourse(updatedCourse);
    if(result.success) {
      refetchData();
    } else {
      alert("Error saving course. Please check the console for details.");
    }
    handleExitCourseEditor();
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
        historyLogs,
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
       return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 p-4 text-center">
          <div>
            <h2 className="text-2xl font-bold text-red-500 mb-4">An Error Occurred</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{authState.error}</p>
            <button
              onClick={handleLogout}
              className="bg-pink-500 text-white font-semibold py-2 px-6 rounded-lg hover:bg-pink-600"
            >
              Sign Out & Try Again
            </button>
          </div>
        </div>
      );

    case 'AUTHENTICATED':
      if (!authState.user || !authState.viewAsRole) {
         return <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200"><div className="bg-purple-600 text-white font-semibold px-6 py-3 rounded-lg">Loading Nexus...</div></div>;
      }
      return (
        <div className="min-h-screen flex">
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