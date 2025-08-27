

import React, { useState, useCallback, useEffect, useReducer } from 'react';
import { Session } from '@supabase/supabase-js';
import { Course, Enrollment, Role, User, Conversation, Message, CalendarEvent, HistoryLog, LiveSession } from './types';
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

  const loadAppData = useCallback(async (user: User) => {
      try {
        const data = await api.getInitialData(user);
        if (data) {
            setCourses(data.courses);
            setEnrollments(data.enrollments);
            setAllUsers(data.allUsers);
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
  
  // Effect for the initial, one-time load sequence.
  useEffect(() => {
    const checkUserAndLoadData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const userProfile = await api.getProfile(session.user.id);
          if (userProfile) {
            await loadAppData(userProfile);
            authDispatch({ type: 'SET_AUTHENTICATED', payload: { user: userProfile } });
          } else {
            console.error("User is authenticated but has no profile. Signing out.");
            await supabase.auth.signOut();
            authDispatch({ type: 'SET_ERROR', payload: { error: 'Your user profile could not be loaded. Please sign in again or contact support.' } });
          }
        } else {
          authDispatch({ type: 'SET_UNAUTHENTICATED' });
        }
      } catch (error) {
        console.error("Error during initial application load:", error);
        authDispatch({ type: 'SET_ERROR', payload: { error: 'An error occurred while starting the application.' } });
      }
    };

    checkUserAndLoadData();
  }, [loadAppData]); // This runs only once because loadAppData is memoized.

  // Effect for handling live auth changes (e.g., logout in another tab).
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // If the user logs out and there was previously a user session.
      if (event === 'SIGNED_OUT' && authState.status === 'AUTHENTICATED') {
        authDispatch({ type: 'LOGOUT' });
      }
      // If a user signs in after the initial load (e.g., in another tab).
      // A full reload is the most reliable way to ensure a clean state.
      if (event === 'SIGNED_IN' && authState.status === 'UNAUTHENTICATED') {
        window.location.reload();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [authState.status]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
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

  const handleSaveUserProfile = async (updates: Partial<User> & { newPassword?: string }) => {
    if (!authState.user) return;
    const { newPassword, ...profileUpdates } = updates;
    
    // Update profile table (name, role, etc.)
    if (Object.keys(profileUpdates).length > 0) {
        await api.updateUserProfile(authState.user.id, profileUpdates);
    }
    
    // Update auth user (password)
    if (newPassword) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) {
            console.error("Error updating password:", error);
            alert("Error updating password. See console for details.");
            return;
        }
        alert("Password updated successfully!");
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
            // FIX: Use the exported snakeToCamel function to convert the new conversation data.
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
    if (!authState.user) return null;

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
                onEditCourse={handleEditCourse}
                onSelectCourse={handleSelectCourse}
                onSaveUserProfile={handleSaveUserProfile}
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
              courses={courses}
              enrollments={enrollments.filter(e => e.userId === authState.user!.id)}
              onSelectCourse={handleSelectCourse}
              onNavigate={handleNavigate}
              onEditCourse={handleEditCourse}
            />
        );
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
            onRefetchData={refetchData}
            onSave={handleSaveCourse}
            onExit={handleExitCourseEditor}
            onSaveUserProfile={handleSaveUserProfile}
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
      if (!authState.user) {
         // This case should ideally not be reached if the state is managed correctly, but it's a good safeguard.
         return <div>Error: User authenticated but no user data found.</div>
      }
      return (
        <div className="min-h-screen flex">
          <Sidebar 
            userRole={authState.user.role} 
            onNavigate={handleNavigate} 
            currentView={currentView} 
            isMobileMenuOpen={isMobileMenuOpen}
            closeMenu={closeMobileMenu}
            onLogout={handleLogout}
          />
           {isMobileMenuOpen && (
            <div 
              onClick={closeMobileMenu} 
              className="fixed inset-0 bg-black/60 z-40 md:hidden"
              aria-hidden="true"
            ></div>
          )}
          <div className="flex-1 flex flex-col">
            <Header user={authState.user} onLogout={handleLogout} onToggleMobileMenu={handleToggleMobileMenu} />
            <main className="flex-1 overflow-y-auto h-[calc(100vh-80px)]">
              {renderContent()}
            </main>
          </div>
        </div>
      );
  }
};

export default App;