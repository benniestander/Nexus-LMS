import React, { useState, useCallback, useMemo } from 'react';
import { Course, Enrollment, Role, User, Conversation, Message, CalendarEvent, HistoryLog, LiveSession } from './types';
import { mockUser, mockCourses, mockEnrollments, mockAdmin, mockInstructor, allMockUsers, mockConversations, mockMessages, mockCalendarEvents, mockHistoryLogs, mockLiveSessions } from './constants/mockData';
import { Header } from './components/Header';
import { Sidebar, View as SidebarView } from './components/Sidebar';
import { StudentDashboard } from './pages/StudentDashboard';
import CoursePlayer from './pages/CoursePlayer';
import { ManagementPages } from './pages/CertificationPage';


type View = SidebarView;

const App: React.FC = () => {
  const [allUsers, setAllUsers] = useState<User[]>(allMockUsers);
  const [courses, setCourses] = useState<Course[]>(mockCourses);
  const [enrollments, setEnrollments] = useState<Enrollment[]>(mockEnrollments);
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(mockCalendarEvents);
  const [historyLogs, setHistoryLogs] = useState<HistoryLog[]>(mockHistoryLogs);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>(mockLiveSessions);


  const [currentUser, setCurrentUser] = useState<User>(mockUser);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleToggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const handleRoleChange = (role: Role) => {
    if (role === Role.STUDENT) setCurrentUser(mockUser);
    if (role === Role.INSTRUCTOR) setCurrentUser(mockInstructor);
    if (role === Role.ADMIN) setCurrentUser(mockAdmin);
    setCurrentView('dashboard');
    setSelectedCourse(null);
    setEditingCourse(null);
    closeMobileMenu();
  };

  const handleLogout = () => {
    handleRoleChange(Role.STUDENT);
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

  const handleSaveCourse = (updatedCourse: Course) => {
    setCourses(prev => {
        const courseExists = prev.some(c => c.id === updatedCourse.id);
        if (courseExists) {
            return prev.map(c => c.id === updatedCourse.id ? updatedCourse : c);
        } else {
            return [...prev, updatedCourse];
        }
    });
    handleExitCourseEditor();
  };

  const handleExitPlayer = () => {
    setSelectedCourse(null);
    setCurrentView('dashboard');
  };

  const handleEnrollmentUpdate = (updatedEnrollment: Enrollment) => {
    setEnrollments(prev => prev.map(e => e.courseId === updatedEnrollment.courseId && e.userId === updatedEnrollment.userId ? updatedEnrollment : e));
  }

  const handleSendMessage = (recipientIds: string[], subject: string, content: string) => {
      const timestamp = new Date().toISOString();
      let newMessages: Message[] = [];
      let updatedConversations = [...conversations];

      recipientIds.forEach(recipientId => {
          let convo = updatedConversations.find(c => 
              c.participantIds.includes(currentUser.id) && c.participantIds.includes(recipientId)
          );

          if (convo) {
              convo.lastMessageTimestamp = timestamp;
          } else {
              convo = {
                  id: `convo-${Date.now()}-${Math.random()}`,
                  participantIds: [currentUser.id, recipientId],
                  lastMessageTimestamp: timestamp,
              };
              updatedConversations.push(convo);
          }

          const newMessage: Message = {
              id: `msg-${Date.now()}-${Math.random()}`,
              conversationId: convo.id,
              senderId: currentUser.id,
              subject: subject || undefined,
              content,
              timestamp,
              isRead: false,
          };
          newMessages.push(newMessage);
      });
      
      setMessages(prev => [...prev, ...newMessages]);
      setConversations(updatedConversations);
  };
  
  const handleUpdateMessages = (updatedMessages: Message[]) => {
      setMessages(updatedMessages);
  };

  const handleScheduleSession = (session: LiveSession) => {
    // Add to live sessions list
    setLiveSessions(prev => [...prev, session]);

    // Also add to calendar for visibility
    const newCalendarEvent: CalendarEvent = {
        id: `evt-${session.id}`,
        date: session.dateTime.split('T')[0], // YYYY-MM-DD
        title: session.title,
        courseId: session.audience !== 'all' ? session.audience : undefined,
        type: 'live_session',
    };
    setCalendarEvents(prev => [...prev, newCalendarEvent]);
  };


  const getEnrollmentForCourse = (courseId: string): Enrollment => {
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
      return newEnrollment;
  };

  const renderContent = () => {
    if (editingCourse) {
        return (
            <ManagementPages
                view="course-editor"
                user={currentUser}
                courseToEdit={editingCourse}
                onSave={handleSaveCourse}
                onExit={handleExitCourseEditor}
                courses={courses} enrollments={enrollments} allUsers={allUsers}
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
              enrollments={enrollments}
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
        />
    )
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
        <Header user={currentUser} onRoleChange={handleRoleChange} onLogout={handleLogout} onToggleMobileMenu={handleToggleMobileMenu} />
        <main className="flex-1 overflow-y-auto h-[calc(100vh-80px)]">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;