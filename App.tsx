

import React, { useState, useCallback, useEffect } from 'react';
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

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      setIsLoading(true);
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
        }
      } catch (error) {
          console.error("Failed to load app data:", error);
      } finally {
          setIsLoading(false);
      }
  }, []);
  
  useEffect(() => {
    // Rely solely on onAuthStateChange for session management.
    // It fires once initially and then on every auth change.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        try {
            setSession(session);
            if (session) {
                const userProfile = await api.getProfile(session.user.id);
                setCurrentUser(userProfile);
                if(userProfile) {
                    await loadAppData(userProfile);
                } else {
                    console.error("User is authenticated but has no profile.");
                    setIsLoading(false);
                }
            } else {
                setCurrentUser(null);
                setIsLoading(false); // No user, stop loading.
            }
        } catch (error) {
            console.error("Error in auth state change:", error);
            setCurrentUser(null);
            setIsLoading(false);
        }
    });

    return () => subscription.unsubscribe();
  }, [loadAppData]);

  const refetchData = useCallback(() => {
    if (currentUser) {
      loadAppData(currentUser);
    }
  }, [currentUser, loadAppData]);
  
  const handleToggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };
  
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
  
  const handleEditCourse = (course: Course) => {
      setEditingCourse(course);
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

  const handleExitPlayer = () => {
    setSelectedCourse(null);
    setCurrentView('dashboard');
  };

  const handleEnrollmentUpdate = async (updatedEnrollment: Enrollment) => {
    setEnrollments(prev => prev.map(e => e.courseId === updatedEnrollment.courseId && e.userId === updatedEnrollment.userId ? updatedEnrollment : e));
    await api.updateEnrollment(updatedEnrollment);
  }

  const handleSendMessage = async (recipientIds: string[], subject: string, content: string) => {
    if(!currentUser) return;
    // Simplified: assumes 1-on-1, finds or creates convo
    for(const recipientId of recipientIds) {
      let convo = conversations.find(c => c.participantIds.includes(currentUser.id) && c.participantIds.includes(recipientId));
      if (!convo) {
        // Create conversation if it doesn't exist
        const { data: newConvoData } = await supabase.from('conversations').insert({ participant_ids: [currentUser.id, recipientId] }).select().single();
        if (newConvoData) {
            // FIX: Use the exported snakeToCamel function to convert the new conversation data.
            convo = api.snakeToCamel(newConvoData);
            setConversations(prev => [...prev, convo!]);
        }
      }
      if (convo) {
        const newMessage = {
            conversationId: convo.id,
            senderId: currentUser.id,
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
      if (!currentUser) throw new Error("User not logged in");
      const existingEnrollment = enrollments.find(e => e.courseId === courseId && e.userId === currentUser.id);
      if (existingEnrollment) return existingEnrollment;
      
      const newEnrollment: Enrollment = {
          userId: currentUser.id,
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
    if (!currentUser) return null;

    if (editingCourse) {
        return (
            // FIX: Added missing props to ManagementPages component.
            <ManagementPages
                view="course-editor"
                user={currentUser}
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
            />
        );
    }

    if (currentView === 'player' && selectedCourse) {
        return (
            <CoursePlayer 
              user={currentUser}
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
              user={currentUser}
              courses={courses}
              enrollments={enrollments.filter(e => e.userId === currentUser.id)}
              onSelectCourse={handleSelectCourse}
              onNavigate={handleNavigate}
              onEditCourse={handleEditCourse}
            />
        );
    }

    return (
        <ManagementPages
            view={currentView}
            user={currentUser}
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
        />
    )
  }

  if (isLoading) {
      return <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200">Loading Nexus...</div>;
  }
  
  if (!session) {
      return <Auth />;
  }

  if (!currentUser) {
      return <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200">Could not load your profile. Please contact support.</div>;
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar 
        userRole={currentUser.role} 
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
        <Header user={currentUser} onLogout={handleLogout} onToggleMobileMenu={handleToggleMobileMenu} />
        <main className="flex-1 overflow-y-auto h-[calc(100vh-80px)]">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;