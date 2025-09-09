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
  error: string | null;
}

type AuthAction =
  | { type: 'SET_AUTHENTICATED'; payload: { user: User } }
  | { type: 'SET_UNAUTHENTICATED' }
  | { type: 'SET_ERROR'; payload: { error: string } }
  | { type: 'LOGOUT' };

const initialState: AuthState = {
  status: 'LOADING',
  user: null,
  error: null,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_AUTHENTICATED':
      return { ...state, status: 'AUTHENTICATED', user: action.payload.user, error: null };
    case 'SET_UNAUTHENTICATED':
      return { ...state, status: 'UNAUTHENTICATED', user: null, error: null };
    case 'SET_ERROR':
      return { ...state, status: 'ERROR', user: null, error: action.payload.error };
    case 'LOGOUT':
       return { ...initialState, status: 'UNAUTHENTICATED' };
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
  const [viewAsRole, setViewAsRole] = useState<Role | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const loadAppData = useCallback(async (user: User) => {
      try {
        const data = await api.getInitialData(user);
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
        } else {
           throw new Error("Failed to load application data.");
        }
      } catch (error) {
          console.error("Failed to load app data:", error);
          // Re-throw the error to be caught by the calling function
          throw error;
      }
  }, []);
  
  // Effect to handle the entire authentication lifecycle.
  // It runs once and subscribes to auth state changes from Supabase.
  useEffect(() => {
    // onAuthStateChange fires an event upon initial load with the current session,
    // and for every subsequent sign-in or sign-out.
    // FIX: Correctly destructure the subscription object from the listener.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // A session exists, so the user is signed in.
        try {
          const userProfile = await api.getProfile(session.user.id);
          if (userProfile) {
            // Profile found, load all necessary app data.
            await loadAppData(userProfile);
            authDispatch({ type: 'SET_AUTHENTICATED', payload: { user: userProfile } });
            setViewAsRole(userProfile.role);
          } else {
            // This is an edge case where a user exists in Supabase auth but not in our profiles table.
            console.error("User authenticated but no profile found. Signing out.");
            await supabase.auth.signOut();
            authDispatch({ type: 'SET_ERROR', payload: { error: 'Your user profile could not be found. Please contact support.' } });
          }
        } catch (error) {
          // This catches errors from getProfile or loadAppData.
          console.error("Error loading application data:", error);
          authDispatch({ type: 'SET_ERROR', payload: { error: 'There was a problem loading your data.' } });
        }
      } else {
        // No session found, the user is signed out.
        authDispatch({ type: 'SET_UNAUTHENTICATED' });
        setViewAsRole(null);
      }
    });

    // Clean up the subscription when the component unmounts.
    return () => {
      subscription?.unsubscribe();
    };
  }, [loadAppData]); // Dependency ensures the callback always has the latest loadAppData function.


  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
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
      setViewAsRole(role);
      setCurrentView('dashboard'); // Reset to dashboard on role change
  };

  const refetchData = useCallback(async () => {
    if (authState.user) {
      await loadAppData(authState.user);
      // Also refetch the user profile itself in case the name/role was changed
      const userProfile = await api.getProfile(authState.user.id);
      if (userProfile) {
          authDispatch({ type: 'SET_AUTHENTICATED', payload: { user: userProfile } });
      }
    }
  }, [authState.user, loadAppData]);
  
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
      setEditingCourse(course);
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

  const handleSaveUserProfile = async (updates: Partial<User> & { newPassword?: string; id?: string }) => {
    if (!authState.user) return;
    const { newPassword, id, ...profileUpdates } = updates;

    const targetUserId = id || authState.user.id;
    
    // Update profile table (name, role, etc.)
    if (Object.keys(profileUpdates).length > 0) {
        const { success, error } = await api.updateUserProfile(targetUserId, profileUpdates);
        if (!success) {
            console.error("Error updating profile:", error);
            const friendlyMessage = error?.message.includes('user_role') 
                ? "Failed to update profile due to a database configuration issue with user roles. Please contact an administrator."
                : `Failed to update profile. Error: ${error?.message}`;
            alert(friendlyMessage);
            return;
        }
    }
    
    // Update auth user (password) - ONLY for the currently logged-in user
    if (newPassword && targetUserId === authState.user.id) {
        // FIX: The method to update a user's attributes is `updateUser`.
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) {
            console.error("Error updating password:", error);
            alert("Error updating password. See console for details.");
            return;
        }
        alert("Password updated successfully!");
    } else if (newPassword && targetUserId !== authState.user.id) {
        console.warn("Attempted to change another user's password from the client. This is not allowed for security reasons.");
        alert("Changing other users' passwords is not supported from this interface.");
    }

    await refetchData(); // Re-fetch all data to ensure UI is consistent
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
    if (!authState.user || !viewAsRole) return null;

    if (currentView === 'course-editor') {
        return (
             <ManagementPages
                view="course-editor"
                user={authState.user}
                courseToEdit={editingCourse}
                onSave={handleSaveCourse}
                onExit={handleExitCourseEditor}
                courses={courses}
                enrollments={enrollments}
                allUsers={allUsers}
                conversations={conversations}
                messages={messages}
                calendarEvents={calendarEvents}
                historyLogs={historyLogs}
                liveSessions={liveSessions}
                onRefetchData={refetchData}
                onSendMessage={handleSendMessage}
                onUpdateMessages={handleUpdateMessages}
                onScheduleSession={handleScheduleSession}
                onDeleteSession={handleDeleteSession}
                onEditCourse={handleEditCourse}
                onSelectCourse={handleSelectCourse}
                onSaveUserProfile={handleSaveUserProfile}
                categories={categories}
                selectedCategoryId={selectedCategoryId}
            />
        );
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
              viewAsRole={viewAsRole}
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

    if (currentView === 'player') {
        return null;
    }

    return (
        <ManagementPages
            view={currentView}
            user={authState.user}
            courses={courses}
            enrollments={enrollments}
            allUsers={allUsers}
            onEditCourse={handleEditCourse}
            onSelectCourse={handleSelectCourse}
            conversations={conversations}
            messages={messages}
            onSendMessage={handleSendMessage}
            onUpdateMessages={handleUpdateMessages}
            calendarEvents={calendarEvents}
            historyLogs={historyLogs}
            liveSessions={liveSessions}
            onScheduleSession={handleScheduleSession}
            onDeleteSession={handleDeleteSession}
            onRefetchData={refetchData}
            onSave={handleSaveCourse}
            onExit={handleExitCourseEditor}
            onSaveUserProfile={handleSaveUserProfile}
            categories={categories}
            selectedCategoryId={selectedCategoryId}
        />
    )
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
              Sign Out
            </button>
          </div>
        </div>
      );

    case 'AUTHENTICATED':
      if (!authState.user || !viewAsRole) {
         return <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200"><div className="bg-purple-600 text-white font-semibold px-6 py-3 rounded-lg">Loading Nexus...</div></div>;
      }
      return (
        <div className="min-h-screen flex">
          <Sidebar 
            userRole={authState.user.role} 
            viewAsRole={viewAsRole}
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
                viewAsRole={viewAsRole} 
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