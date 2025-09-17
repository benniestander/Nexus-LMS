import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Course, Enrollment, User, Role, Lesson, Module, LessonType, Question, QuizData, Conversation, Message, CalendarEvent, LiveSession, VideoProvider, VideoData, Category } from '../types';
import { AwardIcon, BarChart2Icon, BookOpenIcon, CheckCircle2Icon, ChevronDownIcon, ChevronUpIcon, EditIcon, FileTextIcon, GripVerticalIcon, PlusCircleIcon, SettingsIcon, Trash2Icon, UsersIcon, PlayCircleIcon, ClipboardListIcon, XIcon, SearchIcon, DownloadIcon, MailIcon, SendIcon, CalendarIcon, ChevronLeftIcon, ChevronRightIcon, HistoryIcon, MessageSquareIcon, VideoIcon, UserCircleIcon, BoldIcon, ItalicIcon, UnderlineIcon, ListIcon, ListOrderedIcon, ClockIcon } from '../components/Icons';
import { RichTextEditor } from '../components/RichTextEditor';
import { CourseCard } from '../components/CourseCard';
import { ProgressBar } from '../components/ProgressBar';
import { HelpPage } from './HelpPage';
import * as api from '../supabaseApi';
import { supabase } from '../supabaseClient';
import type { View } from '../components/Sidebar';
import CourseEditor, { Modal } from './CourseEditor';


declare global {
  interface Window {
    jspdf: any;
    html2canvas: any;
  }
}

// ====================================================================================
// ===== SHARED COMPONENTS 
// ====================================================================================

const StatCard: React.FC<{ icon: React.ReactNode; value: string | number; label: string; color: string; }> = ({ icon, value, label, color }) => (
    <div className={`flex items-center p-6 rounded-2xl bg-gradient-to-br ${color} text-white shadow-lg`}>
        <div className="p-4 rounded-full bg-white/20">
            {icon}
        </div>
        <div className="ml-4">
            <p className="text-2xl md:text-3xl font-bold">{value}</p>
            <p className="text-sm font-medium opacity-80">{label}</p>
        </div>
    </div>
);


// ====================================================================================
// ===== MANAGEMENT PAGES (Rendered based on `view` prop)
// ====================================================================================

interface CertificatePreviewProps {
  name: string;
  course: string;
  date: string;
  certificateRef: React.RefObject<HTMLDivElement>;
}

const CertificatePreview: React.FC<CertificatePreviewProps> = ({ name, course, date, certificateRef }) => {
  return (
    <div className="w-full p-4">
      <div
        ref={certificateRef}
        className="w-full aspect-[842/595] bg-white relative shadow-2xl overflow-hidden"
      >
        <img
          src="https://i.postimg.cc/P5hDjCLK/Nexus-Certificates-1-LE-upscale-balanced-x4.jpg"
          alt="Certificate Background"
          className="absolute inset-0 w-full h-full object-cover"
          crossOrigin="anonymous"
        />
        <div
          className="absolute w-full text-center text-[#0b2b4f] font-medium"
          style={{ top: 'calc(47.5% - 15px)', left: '50%', transform: 'translate(-50%, -50%)', fontFamily: "'Montserrat', sans-serif", fontSize: 'max(12px, 2.0vw)' }}
        >
          {name}
        </div>
        <div
          className="absolute w-full text-center text-[#1e3a8a] font-medium"
          style={{ top: '56%', left: '50%', transform: 'translate(-50%, -50%)', fontFamily: "'Poppins', sans-serif", fontSize: 'max(12px, 2.0vw)' }}
        >
          {course}
        </div>
        <div
          className="absolute text-[#0b2b4f] font-medium"
          style={{ top: 'calc(84.5% - 50px)', left: 'calc(76.5% - 105px)', transform: 'translate(-50%, -50%)', fontFamily: "'Montserrat', sans-serif", fontSize: 'max(8px, 1.0vw)' }}
        >
          {date}
        </div>
      </div>
    </div>
  );
};


const CertificationsPage: React.FC<{ user: User; courses: Course[]; enrollments: Enrollment[] }> = ({ user, courses, enrollments }) => {
    const certificateRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const completedCourses = useMemo(() => {
        return enrollments
            .filter(e => {
                if (e.userId !== user.id) return false;
                
                const course = courses.find(c => c.id === e.courseId);
                if (!course || !course.isCertificationCourse) return false;

                // Find all modules in this course that *have* a quiz.
                const modulesWithQuizzes = course.modules.filter(m => m.quiz && m.quiz.questions.length > 0);

                // If there are no quizzes, the student cannot get a certificate based on this logic.
                // Could be changed to 100% progress if needed.
                if (modulesWithQuizzes.length === 0) return false;

                // Check if the student has passed EVERY module quiz.
                return modulesWithQuizzes.every(module => {
                    const moduleQuizScore = e.quizScores[`module-${module.id}`];
                    return moduleQuizScore?.passed === true;
                });
            })
            .map(e => courses.find(c => c.id === e.courseId))
            .filter((c): c is Course => c !== undefined);
    }, [user.id, courses, enrollments]);

    const [selectedCourse, setSelectedCourse] = useState<Course | null>(completedCourses[0] || null);

    const handleDownloadPdf = async () => {
        const certificateElement = certificateRef.current;
        if (!certificateElement || !selectedCourse) {
            alert("Please select a certificate to download.");
            return;
        }

        setIsGenerating(true);

        try {
            const { jsPDF } = window.jspdf;
            const canvas = await window.html2canvas(certificateElement, {
                scale: 3, // Higher scale for better quality
                useCORS: true,
                backgroundColor: null,
            });
            const imgData = canvas.toDataURL('image/png');
            
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'px',
                format: [842, 595] // Use a fixed A4-like aspect ratio
            });

            pdf.addImage(imgData, 'PNG', 0, 0, 842, 595);
            const studentName = `${user.firstName} ${user.lastName}`;
            pdf.save(`${studentName.replace(/ /g, '_')}_${selectedCourse.title.replace(/ /g, '_')}_certificate.pdf`);

        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("An error occurred while generating the PDF. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };
    
    useEffect(() => {
        if (!selectedCourse && completedCourses.length > 0) {
            setSelectedCourse(completedCourses[0]);
        }
    }, [completedCourses, selectedCourse]);

    if (completedCourses.length === 0) {
         return (
            <div className="p-4 md:p-8 h-full flex items-center justify-center">
                <div className="text-center py-16 bg-gray-100 dark:bg-gray-800 rounded-lg w-full max-w-2xl">
                    <AwardIcon className="w-16 h-16 mx-auto text-gray-400" />
                    <h2 className="mt-4 text-2xl font-semibold">No Certificates Yet</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">Complete a course and pass all required quizzes to earn your certificate.</p>
                </div>
            </div>
        );
    }
    
    return (
        <div className="flex flex-col md:flex-row h-full">
            {/* Left Sidebar: Course List */}
            <div className="w-full md:w-1/3 lg:w-1/4 h-full border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h1 className="text-2xl font-bold flex items-center gap-3"><AwardIcon className="w-7 h-7 text-pink-500" /> My Certificates</h1>
                </div>
                <ul className="overflow-y-auto flex-grow p-2">
                    {completedCourses.map(course => (
                        <li key={course.id}>
                            <button 
                                onClick={() => setSelectedCourse(course)}
                                className={`w-full text-left p-4 rounded-lg transition-colors ${selectedCourse?.id === course.id ? 'bg-pink-100 dark:bg-pink-900/50' : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}
                            >
                                <p className={`font-semibold ${selectedCourse?.id === course.id ? 'text-pink-600 dark:text-pink-400' : 'text-gray-800 dark:text-gray-200'}`}>{course.title}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Completed on: {new Date().toLocaleDateString()}</p>
                            </button>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Right Content: Certificate Preview */}
            <div className="flex-grow flex flex-col items-center justify-center p-4 sm:p-8 bg-gray-50 dark:bg-gray-900">
                {selectedCourse ? (
                    <div className="w-full max-w-5xl">
                        <CertificatePreview 
                            certificateRef={certificateRef}
                            name={`${user.firstName} ${user.lastName}`}
                            course={selectedCourse.title}
                            date={new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        />
                         <div className="mt-6 text-center">
                             <button
                                onClick={handleDownloadPdf}
                                disabled={isGenerating}
                                className="bg-pink-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-pink-700 disabled:bg-pink-400 disabled:cursor-not-allowed transition-all duration-300 ease-in-out flex items-center justify-center space-x-2 w-full max-w-xs mx-auto"
                            >
                                {isGenerating ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Generating PDF...</span>
                                    </>
                                ) : (
                                    <>
                                        <DownloadIcon className="w-5 h-5" />
                                        <span>Download Certificate</span>
                                    </>
                                )}
                            </button>
                         </div>
                    </div>
                ) : (
                     <div className="text-center text-gray-500 dark:text-gray-400">
                        <p>Select a completed course to view your certificate.</p>
                     </div>
                )}
            </div>
        </div>
    );
};


const InboxPage: React.FC<{
  user: User;
  conversations: Conversation[];
  messages: Message[];
  allUsers: User[];
  courses: Course[];
  enrollments: Enrollment[];
  onSendMessage: (recipientIds: string[], subject: string, content: string) => void;
  onUpdateMessages: (messages: Message[]) => void;
  onNavigate: (view: View) => void;
}> = ({ user, conversations, messages, allUsers, courses, enrollments, onSendMessage, onUpdateMessages, onNavigate }) => {
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [isComposing, setIsComposing] = useState(false);
    const [replyContent, setReplyContent] = useState('');

    const usersById = useMemo(() => new Map(allUsers.map(u => [u.id, u])), [allUsers]);
    
    const relevantConversations = useMemo(() => {
        return conversations
            .map(convo => {
                const otherParticipantId = convo.participantIds.find(id => id !== user.id);
                const otherParticipant = usersById.get(otherParticipantId || '');
                const lastMessage = messages.filter(m => m.conversationId === convo.id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
                const isUnread = lastMessage && !lastMessage.isRead && lastMessage.senderId !== user.id;
                return { ...convo, otherParticipant, lastMessage, isUnread };
            })
            .filter(c => c.lastMessage && c.otherParticipant)
            .sort((a, b) => new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime());
    }, [conversations, messages, user.id, usersById]);

    const selectedConversationMessages = useMemo(() => {
        if (!selectedConversationId) return [];
        return messages.filter(m => m.conversationId === selectedConversationId).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }, [selectedConversationId, messages]);
    
    const handleConversationSelect = (convoId: string) => {
        setSelectedConversationId(convoId);
        setIsComposing(false);
        const unreadMessageIds = messages
            .filter(m => m.conversationId === convoId && m.senderId !== user.id && !m.isRead)
            .map(m => m.id);
            
        if (unreadMessageIds.length > 0) {
            // Optimistically update UI
            const updatedMessages = messages.map(m => unreadMessageIds.includes(m.id) ? { ...m, isRead: true } : m);
            onUpdateMessages(updatedMessages);

            // Update in backend
            supabase.from('messages').update({ is_read: true }).in('id', unreadMessageIds).then(({ error }) => {
                if(error) console.error("Failed to mark messages as read:", error);
            });
        }
    };

    const handleSendMessage = (recipientIds: string[], subject: string, content: string) => {
        onSendMessage(recipientIds, subject, content);
        setIsComposing(false);
    };

    const handleReply = (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyContent.trim() || !selectedConversationId) return;
        const currentConvo = relevantConversations.find(c => c.id === selectedConversationId);
        if (!currentConvo || !currentConvo.otherParticipant) return;

        onSendMessage([currentConvo.otherParticipant.id], '', replyContent);
        setReplyContent('');
    };
    
    const ComposeView: React.FC<{ onCancel: () => void; onSend: (recipientIds: string[], subject: string, content: string) => void }> = ({ onCancel, onSend }) => {
        const [recipients, setRecipients] = useState<string[]>([]);
        const [subject, setSubject] = useState('');
        const [content, setContent] = useState('');

        const instructorCourses = useMemo(() => courses.filter(c => c.instructorId === user.id), [courses, user.id]);
        
        const myStudents = useMemo(() => {
            if (user.role === Role.STUDENT) return [];
            const instructorCourseIds = instructorCourses.map(c => c.id);
            const studentIds = new Set(enrollments.filter(e => instructorCourseIds.includes(e.courseId)).map(e => e.userId));
            return allUsers.filter(u => studentIds.has(u.id));
        }, [user, instructorCourses, enrollments, allUsers]);

        const myInstructors = useMemo(() => {
            if (user.role !== Role.STUDENT) return [];
            const enrolledCourseIds = enrollments.filter(e => e.userId === user.id).map(e => e.courseId);
            const instructorIds = new Set(courses.filter(c => enrolledCourseIds.includes(c.id)).map(c => c.instructorId));
            return allUsers.filter(u => instructorIds.has(u.id));
        }, [user, enrollments, courses, allUsers]);

        const canSendMessage = recipients.length > 0 && content.trim() !== '';

        return (
            <div className="p-6">
                 <h2 className="text-xl font-bold mb-4">New Message</h2>
                 {user.role !== Role.STUDENT ? (
                     <div>
                         <label className="font-semibold block mb-2">To:</label>
                         <select multiple value={recipients} onChange={e => setRecipients(Array.from(e.target.selectedOptions, option => option.value))} className="w-full p-2 border rounded-lg h-40 dark:bg-gray-700 dark:border-gray-600">
                             {myStudents.map(student => (
                                 <option key={student.id} value={student.id}>{student.firstName} {student.lastName}</option>
                             ))}
                         </select>
                     </div>
                 ) : (
                    <div>
                        <label className="font-semibold block mb-2">To:</label>
                        <select value={recipients[0] || ''} onChange={e => setRecipients([e.target.value])} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
                            <option value="" disabled>Select an instructor</option>
                            {myInstructors.map(inst => <option key={inst.id} value={inst.id}>{inst.firstName} {inst.lastName} (Instructor)</option>)}
                        </select>
                    </div>
                 )}
                 <input type="text" placeholder="Subject (optional)" value={subject} onChange={e => setSubject(e.target.value)} className="w-full p-2 border rounded-lg mt-4 dark:bg-gray-700 dark:border-gray-600" />
                 <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Type your message..." className="w-full p-2 border rounded-lg mt-4 h-48 dark:bg-gray-700 dark:border-gray-600" />
                 <div className="flex justify-end gap-4 mt-4">
                    <button onClick={onCancel} className="bg-gray-200 dark:bg-gray-600 px-6 py-2 rounded-lg font-semibold">Cancel</button>
                    <button onClick={() => onSend(recipients, subject, content)} disabled={!canSendMessage} className="bg-pink-500 text-white px-6 py-2 rounded-lg font-semibold disabled:bg-gray-400">Send</button>
                 </div>
            </div>
        );
    };

    return (
        <div className="flex h-full bg-white dark:bg-gray-800">
            <div className="w-full md:w-1/3 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h1 className="text-2xl font-bold flex items-center gap-3"><MailIcon className="w-7 h-7 text-pink-500" /> Inbox</h1>
                    <button onClick={() => setIsComposing(true)} className="bg-pink-500 text-white font-bold p-2 rounded-lg flex items-center justify-center gap-2 hover:bg-pink-600" title="New Message"><EditIcon className="w-5 h-5" /></button>
                </div>
                <ul className="overflow-y-auto">
                    {relevantConversations.map(convo => (
                        <li key={convo.id} onClick={() => handleConversationSelect(convo.id)} className={`p-4 cursor-pointer border-b border-gray-200 dark:border-gray-700 flex items-start gap-4 relative ${selectedConversationId === convo.id ? 'bg-gray-100 dark:bg-gray-900' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                            {convo.isUnread && <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-pink-500 rounded-full"></div>}
                            <UserCircleIcon className="w-10 h-10 text-gray-400 flex-shrink-0" />
                            <div className="flex-grow min-w-0">
                                <div className="flex justify-between">
                                    <p className="font-bold truncate">{convo.otherParticipant?.firstName} {convo.otherParticipant?.lastName}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">{new Date(convo.lastMessage.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                </div>
                                <p className={`truncate text-sm ${convo.isUnread ? 'font-bold text-gray-800 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}`}>{convo.lastMessage.content}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="hidden md:flex w-2/3 flex-col bg-gray-50 dark:bg-gray-800/50">
                {isComposing ? <ComposeView onCancel={() => setIsComposing(false)} onSend={handleSendMessage} /> : selectedConversationId ? (
                    <>
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                            <h2 className="text-xl font-bold">{usersById.get(relevantConversations.find(c=>c.id === selectedConversationId)?.otherParticipant?.id || '')?.firstName} {usersById.get(relevantConversations.find(c=>c.id === selectedConversationId)?.otherParticipant?.id || '')?.lastName}</h2>
                        </div>
                        <div className="flex-grow p-6 overflow-y-auto space-y-4">
                            {selectedConversationMessages.map(msg => (
                                <div key={msg.id} className={`flex items-end gap-3 ${msg.senderId === user.id ? 'justify-end' : 'justify-start'}`}>
                                    {msg.senderId !== user.id && <UserCircleIcon className="w-8 h-8 text-gray-400 flex-shrink-0" />}
                                    <div className={`max-w-xl px-4 py-3 rounded-2xl ${msg.senderId === user.id ? 'bg-pink-500 text-white rounded-br-none' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'}`}>
                                        <p>{msg.content}</p>
                                        <p className={`text-xs mt-1 ${msg.senderId === user.id ? 'text-pink-100' : 'text-gray-500 dark:text-gray-400'} text-right`}>{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                             <form onSubmit={handleReply} className="flex gap-4">
                                <input name="message" type="text" placeholder="Type a message..." value={replyContent} onChange={e => setReplyContent(e.target.value)} className="w-full p-3 rounded-lg border dark:bg-gray-700 dark:border-gray-600" />
                                <button type="submit" className="bg-pink-500 text-white p-3 rounded-lg"><SendIcon className="w-6 h-6" /></button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-grow flex items-center justify-center text-center text-gray-500 dark:text-gray-400">
                        <div>
                            <MailIcon className="w-24 h-24 mx-auto text-gray-300 dark:text-gray-600" />
                            <h2 className="text-2xl mt-4">Select a conversation</h2>
                            <p>Or start a new message.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const CalendarPage: React.FC<{ events: CalendarEvent[], user: User, courses: Course[] }> = ({ events, user }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDay = startOfMonth.getDay();
    const daysInMonth = endOfMonth.getDate();

    const calendarGrid = useMemo(() => {
        const grid: (Date | null)[] = [];
        // Add padding days from previous month
        for (let i = 0; i < startDay; i++) {
            grid.push(null);
        }
        // Add days of current month
        for (let i = 1; i <= daysInMonth; i++) {
            grid.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
        }
        return grid;
    }, [currentDate, startDay, daysInMonth]);

    const eventsByDate = useMemo(() => {
        const map = new Map<string, CalendarEvent[]>();
        const userEvents = events.filter(e => e.userId === user.id); // Filter events for current user
        userEvents.forEach(event => {
            const dateStr = event.date; // YYYY-MM-DD
            if (!map.has(dateStr)) map.set(dateStr, []);
            map.get(dateStr)!.push(event);
        });
        return map;
    }, [events, user.id]);
    
    const changeMonth = (offset: number) => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    };
    
    const eventTypeColor = { deadline: 'bg-red-500', live_session: 'bg-blue-500', assignment: 'bg-yellow-500' };

    return (
        <div className="p-4 md:p-8 h-full flex flex-col">
             <div className="flex justify-between items-center mb-8 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <CalendarIcon className="w-10 h-10 text-pink-500" />
                    <h1 className="text-4xl font-bold">Calendar</h1>
                </div>
                 <div className="flex items-center gap-4">
                    <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><ChevronLeftIcon className="w-6 h-6" /></button>
                    <h2 className="text-2xl font-semibold w-48 text-center">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
                    <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><ChevronRightIcon className="w-6 h-6" /></button>
                </div>
            </div>
            <div className="flex-grow grid grid-cols-7 grid-rows-6 gap-px bg-gray-200 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center font-semibold p-3 bg-white dark:bg-gray-800 text-sm">{day}</div>
                ))}
                {calendarGrid.map((date, index) => (
                    <div key={index} className="bg-white dark:bg-gray-800 p-2 flex flex-col overflow-hidden">
                        {date && (
                            <>
                                <span className={`font-semibold text-sm ${isToday(date) ? 'bg-pink-500 text-white rounded-full w-7 h-7 flex items-center justify-center' : ''}`}>{date.getDate()}</span>
                                <div className="mt-1 space-y-1 overflow-y-auto flex-grow">
                                    {eventsByDate.get(date.toISOString().split('T')[0])?.map(event => (
                                        <div key={event.id} className="text-xs p-1 rounded-md flex items-center gap-2 bg-gray-100 dark:bg-gray-700/50">
                                            <span className={`w-2 h-2 rounded-full ${eventTypeColor[event.type]}`}></span>
                                            <span className="truncate">{event.title}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

const ProfilePage: React.FC<{
    user: User;
    onSaveProfile: (updates: Partial<User>) => Promise<void>;
    onUpdatePassword: (newPassword: string) => Promise<void>;
}> = ({ user, onSaveProfile, onUpdatePassword }) => {
    const [firstName, setFirstName] = useState(user.firstName);
    const [lastName, setLastName] = useState(user.lastName);
    const [company, setCompany] = useState(user.company || '');
    const [bio, setBio] = useState(user.bio || '');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isSavingPassword, setIsSavingPassword] = useState(false);

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingProfile(true);
        try {
            await onSaveProfile({
                firstName,
                lastName,
                company,
                bio,
            });
             alert('Profile updated successfully!');
        } catch (error) {
            // Errors are alerted in App.tsx, this is just to stop the loading state
            console.error("Failed to save profile", error);
        } finally {
            setIsSavingProfile(false);
        }
    };
    
    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword && newPassword !== confirmPassword) {
            alert("Passwords do not match.");
            return;
        }
        if (!newPassword) {
            alert("Please provide a new password.");
            return;
        }
        setIsSavingPassword(true);
        try {
            await onUpdatePassword(newPassword);
            alert('Password updated successfully!');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            // Errors are alerted in App.tsx
            console.error("Failed to update password", error);
        } finally {
            setIsSavingPassword(false);
        }
    };
    
    return (
         <div className="p-4 md:p-8">
            <div className="flex items-center gap-4 mb-8">
                <UserCircleIcon className="w-10 h-10 text-pink-500" />
                <h1 className="text-4xl font-bold">My Profile</h1>
            </div>
             <div className="space-y-8 max-w-4xl mx-auto">
                 <form onSubmit={handleProfileSubmit} className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md">
                     <h2 className="text-2xl font-bold mb-6">Personal Information</h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div><label className="font-semibold">First Name</label><input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full mt-1 p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"/></div>
                        <div><label className="font-semibold">Last Name</label><input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full mt-1 p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"/></div>
                        <div><label className="font-semibold">Email</label><input type="email" value={user.email} disabled className="w-full mt-1 p-2 border rounded-lg bg-gray-100 dark:bg-gray-900 dark:border-gray-600 cursor-not-allowed"/></div>
                        <div><label className="font-semibold">Company</label><input type="text" value={company} onChange={e => setCompany(e.target.value)} className="w-full mt-1 p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"/></div>
                        <div className="md:col-span-2"><label className="font-semibold">Bio</label><textarea value={bio} onChange={e => setBio(e.target.value)} rows={4} className="w-full mt-1 p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"></textarea></div>
                     </div>
                      <div className="text-right mt-6">
                         <button type="submit" disabled={isSavingProfile} className="bg-pink-500 text-white font-bold py-3 px-8 rounded-lg hover:bg-pink-600 disabled:bg-pink-400 disabled:cursor-not-allowed transition-colors">
                            {isSavingProfile ? 'Saving...' : 'Save Profile'}
                         </button>
                     </div>
                 </form>
                 <form onSubmit={handlePasswordSubmit} className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md">
                    <h2 className="text-2xl font-bold mb-6">Change Password</h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div><label className="font-semibold">New Password</label><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full mt-1 p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"/></div>
                        <div><label className="font-semibold">Confirm New Password</label><input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full mt-1 p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"/></div>
                     </div>
                     <div className="text-right mt-6">
                         <button type="submit" disabled={isSavingPassword} className="bg-blue-500 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-600 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors">
                            {isSavingPassword ? 'Updating...' : 'Update Password'}
                         </button>
                     </div>
                </form>
             </div>
         </div>
    );
};


// ... Other pages like MyCourses, CourseEditor, etc. will be large components.
// For brevity, let's sketch them out. A real implementation would be more detailed.
const MyCoursesPage: React.FC<{ user: User, courses: Course[], onEditCourse: (course: Course | null) => void, onSelectCourse: (course: Course) => void, categories: Category[], onDeleteCourse: (course: Course) => void, onToggleCourseVisibility: (course: Course) => void }> = ({ user, courses, onEditCourse, onSelectCourse, categories, onDeleteCourse, onToggleCourseVisibility }) => {
    const instructorCourses = courses.filter(c => c.instructorId === user.id);
    const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c.name])), [categories]);
    return (
        <div className="p-4 md:p-8">
             <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <BookOpenIcon className="w-10 h-10 text-pink-500" />
                    <h1 className="text-4xl font-bold">My Courses</h1>
                </div>
                <button onClick={() => onEditCourse(null)} className="bg-pink-500 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 hover:bg-pink-600"><PlusCircleIcon className="w-6 h-6" /> Create Course</button>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {instructorCourses.map(course => (
                    <CourseCard key={course.id} course={course} user={user} onEdit={onEditCourse} onSelect={onSelectCourse} onDelete={onDeleteCourse} onToggleVisibility={onToggleCourseVisibility} categoryName={categoryMap.get(course.categoryId) || 'Uncategorized'} />
                ))}
            </div>
        </div>
    );
};

const UserManagementPage: React.FC<{ users: User[], onRefetchData: () => void, onSaveUserProfile: (updates: Partial<User> & { id?: string }) => Promise<void> }> = ({ users, onRefetchData, onSaveUserProfile }) => {
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [formState, setFormState] = useState<{ firstName: string; lastName: string; role: Role; } | null>(null);

    useEffect(() => {
        if (editingUser) {
            setFormState({
                firstName: editingUser.firstName,
                lastName: editingUser.lastName,
                role: editingUser.role,
            });
        } else {
            setFormState(null);
        }
    }, [editingUser]);

    const handleSave = async () => {
        if (!editingUser || !formState) return;
        await onSaveUserProfile({
            id: editingUser.id,
            ...formState
        });
        setEditingUser(null);
        onRefetchData();
    };
    
    const handleFormChange = (updates: Partial<{ firstName: string; lastName: string; role: Role; }>) => {
        if (formState) {
            setFormState(prev => ({ ...prev!, ...updates }));
        }
    };

    return (
        <div className="p-4 md:p-8">
            <div className="flex items-center gap-4 mb-8"><UsersIcon className="w-10 h-10 text-pink-500" /><h1 className="text-4xl font-bold">User Management</h1></div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700"><tr className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"><th className="p-4">Name</th><th className="p-4">Email</th><th className="p-4">Role</th><th className="p-4">Actions</th></tr></thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {users.map(user => (
                            <tr key={user.id}>
                                <td className="p-4">{user.firstName} {user.lastName}</td>
                                <td className="p-4">{user.email}</td>
                                <td className="p-4 capitalize">{user.role}</td>
                                <td className="p-4"><button onClick={() => setEditingUser(user)} className="p-2 text-gray-500 hover:text-pink-500"><EditIcon className="w-5 h-5" /></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {editingUser && formState && (
                <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} title={`Edit ${editingUser.firstName}`}>
                    <div className="space-y-4">
                        <div><label>First Name</label><input type="text" value={formState.firstName} onChange={e => handleFormChange({ firstName: e.target.value })} className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600"/></div>
                        <div><label>Last Name</label><input type="text" value={formState.lastName} onChange={e => handleFormChange({ lastName: e.target.value })} className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600"/></div>
                        <div>
                            <label>Role</label>
                            <select value={formState.role} onChange={e => handleFormChange({ role: e.target.value as Role })} className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 capitalize">
                                {Object.values(Role).map(role => <option key={role} value={role} className="capitalize">{role}</option>)}
                            </select>
                        </div>
                        <button onClick={handleSave} className="bg-pink-500 text-white px-6 py-2 rounded-lg">Save</button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

// More placeholder pages
const AnalyticsPage: React.FC = () => <div className="p-8"><h1 className="text-4xl font-bold">Analytics</h1><p className="mt-4">Analytics dashboard with charts and key metrics will be displayed here.</p></div>;

const StudentManagementPage: React.FC<{ user: User; courses: Course[]; allUsers: User[]; enrollments: Enrollment[]; onNavigate: (view: 'inbox') => void }> = ({ user, courses, allUsers, enrollments, onNavigate }) => {
    const [searchTerm, setSearchTerm] = useState('');
    
    const instructorCourseIds = useMemo(() => {
        if (user.role === Role.ADMIN) return courses.map(c => c.id);
        return courses.filter(c => c.instructorId === user.id).map(c => c.id);
    }, [user, courses]);

    const studentData = useMemo(() => {
        const studentEnrollments = enrollments.filter(e => instructorCourseIds.includes(e.courseId));
        const studentIds = new Set(studentEnrollments.map(e => e.userId));
        
        return allUsers
            .filter(u => u.role === Role.STUDENT && studentIds.has(u.id))
            .map(student => {
                const studentEnrolls = studentEnrollments.filter(e => e.userId === student.id);
                const avgProgress = studentEnrolls.length > 0 ? studentEnrolls.reduce((sum, e) => sum + e.progress, 0) / studentEnrolls.length : 0;
                return {
                    ...student,
                    enrolledCount: studentEnrolls.length,
                    avgProgress: Math.round(avgProgress),
                };
            });
    }, [allUsers, enrollments, instructorCourseIds]);

    const filteredStudents = useMemo(() => {
        if (!searchTerm) return studentData;
        const lowerSearch = searchTerm.toLowerCase();
        return studentData.filter(s =>
            s.firstName.toLowerCase().includes(lowerSearch) ||
            s.lastName.toLowerCase().includes(lowerSearch) ||
            s.email.toLowerCase().includes(lowerSearch)
        );
    }, [searchTerm, studentData]);

    return (
        <div className="p-4 md:p-8">
            <div className="flex items-center gap-4 mb-8"><UsersIcon className="w-10 h-10 text-pink-500" /><h1 className="text-4xl font-bold">Student Management</h1></div>
            <div className="mb-6">
                <div className="relative">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="text" placeholder="Search students by name or email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full max-w-lg p-3 pl-12 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700"><tr className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"><th className="p-4">Name</th><th className="p-4">Email</th><th className="p-4">Courses Enrolled</th><th className="p-4">Average Progress</th><th className="p-4">Actions</th></tr></thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredStudents.map(student => (
                            <tr key={student.id}>
                                <td className="p-4 font-semibold">{student.firstName} {student.lastName}</td>
                                <td className="p-4">{student.email}</td>
                                <td className="p-4">{student.enrolledCount}</td>
                                <td className="p-4"><ProgressBar progress={student.avgProgress} /></td>
                                <td className="p-4"><button onClick={() => onNavigate('inbox')} className="p-2 text-gray-500 hover:text-pink-500"><MessageSquareIcon className="w-5 h-5" /></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const LiveSessionsPage: React.FC<{ user: User, courses: Course[], liveSessions: LiveSession[], onScheduleSession: (session: Omit<LiveSession, 'id'>) => void, onDeleteSession: (sessionId: string) => void }> = ({ user, courses, liveSessions, onScheduleSession, onDeleteSession }) => {
    const [isScheduling, setIsScheduling] = useState(false);
    const [formState, setFormState] = useState({ title: '', description: '', date: '', time: '', duration: 60, audience: 'all' });

    const instructorCourses = courses.filter(c => c.instructorId === user.id);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const dateTime = `${formState.date}T${formState.time}:00`;
        onScheduleSession({ ...formState, dateTime, instructorId: user.id });
        setIsScheduling(false);
        setFormState({ title: '', description: '', date: '', time: '', duration: 60, audience: 'all' });
    };

    const upcomingSessions = liveSessions.filter(s => new Date(s.dateTime) >= new Date()).sort((a,b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
    const pastSessions = liveSessions.filter(s => new Date(s.dateTime) < new Date()).sort((a,b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

    return (
        <div className="p-4 md:p-8">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4"><VideoIcon className="w-10 h-10 text-pink-500" /><h1 className="text-4xl font-bold">Live Sessions</h1></div>
                <button onClick={() => setIsScheduling(true)} className="bg-pink-500 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 hover:bg-pink-600"><PlusCircleIcon className="w-6 h-6" /> Schedule Session</button>
            </div>

            <h2 className="text-2xl font-bold mb-4">Upcoming Sessions</h2>
            <div className="space-y-4">
                {upcomingSessions.length > 0 ? upcomingSessions.map(session => (
                    <div key={session.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm flex justify-between items-center">
                        <div>
                            <p className="font-bold">{session.title}</p>
                            <p className="text-sm text-gray-500">{new Date(session.dateTime).toLocaleString()}</p>
                        </div>
                        <button onClick={() => onDeleteSession(session.id)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><Trash2Icon className="w-5 h-5"/></button>
                    </div>
                )) : <p className="text-gray-500">No upcoming sessions scheduled.</p>}
            </div>

            <h2 className="text-2xl font-bold mt-8 mb-4">Past Sessions</h2>
            <div className="space-y-4">
                 {pastSessions.length > 0 ? pastSessions.map(session => (
                    <div key={session.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm opacity-70">
                        <p className="font-bold">{session.title}</p>
                        <p className="text-sm text-gray-500">{new Date(session.dateTime).toLocaleString()}</p>
                    </div>
                )) : <p className="text-gray-500">No past sessions.</p>}
            </div>

            <Modal isOpen={isScheduling} onClose={() => setIsScheduling(false)} title="Schedule New Live Session">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div><label className="font-semibold">Title</label><input type="text" value={formState.title} onChange={e => setFormState({...formState, title: e.target.value})} required className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600" /></div>
                    <div><label className="font-semibold">Description</label><textarea value={formState.description} onChange={e => setFormState({...formState, description: e.target.value})} className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600" /></div>
                    <div className="flex gap-4">
                        <div className="flex-1"><label className="font-semibold">Date</label><input type="date" value={formState.date} onChange={e => setFormState({...formState, date: e.target.value})} required className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600" /></div>
                        <div className="flex-1"><label className="font-semibold">Time</label><input type="time" value={formState.time} onChange={e => setFormState({...formState, time: e.target.value})} required className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600" /></div>
                    </div>
                     <div><label className="font-semibold">Duration (minutes)</label><input type="number" value={formState.duration} onChange={e => setFormState({...formState, duration: parseInt(e.target.value)})} required className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600" /></div>
                     <div>
                        <label className="font-semibold">Audience</label>
                        <select value={formState.audience} onChange={e => setFormState({...formState, audience: e.target.value})} className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600">
                            <option value="all">All Users</option>
                            {instructorCourses.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}
                        </select>
                    </div>
                    <div className="text-right pt-4"><button type="submit" className="bg-pink-500 text-white font-bold py-2 px-6 rounded-lg">Schedule</button></div>
                </form>
            </Modal>
        </div>
    );
};

const PlatformSettingsPage: React.FC = () => <div className="p-8"><h1 className="text-4xl font-bold">Platform Settings</h1><p className="mt-4">Admins can manage global platform settings like branding, integrations, etc.</p></div>;

// --- New helpers for category tree rendering ---
interface CategoryNode extends Category {
    children: CategoryNode[];
}

const buildCategoryTree = (items: Category[], parentId: string | null = null): CategoryNode[] => {
    return items
        .filter(item => item.parentId === parentId)
        .map(item => ({
            ...item,
            children: buildCategoryTree(items, item.id)
        }));
};

const renderCategoryOptions = (nodes: CategoryNode[], level: number = 0, excludeId: string | null = null): JSX.Element[] => {
    return nodes.flatMap(node => {
        if (node.id === excludeId) return [];
        return [
            <option key={node.id} value={node.id}>
                {'\u00A0'.repeat(level * 4)}{node.name}
            </option>,
            ...renderCategoryOptions(node.children, level + 1, excludeId)
        ];
    });
};

const CategoriesPage: React.FC<{
    categories: Category[];
    courses: Course[];
    onAddCategory: (category: { name: string; parentId: string | null; }) => Promise<any>;
    onUpdateCategory: (category: { id: string; name: string; parentId: string | null; }) => Promise<void>;
    onDeleteCategory: (categoryId: string) => Promise<void>;
}> = ({ categories, courses, onAddCategory, onUpdateCategory, onDeleteCategory }) => {
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryParentId, setNewCategoryParentId] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [editingParentId, setEditingParentId] = useState<string | null>(null);

    const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);
    const courseCountByCategoryId = useMemo(() => {
        const counts = new Map<string, number>();
        courses.forEach(course => {
            counts.set(course.categoryId, (counts.get(course.categoryId) || 0) + 1);
        });
        return counts;
    }, [courses]);

    const handleAddNewCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        setIsAdding(true);
        await onAddCategory({ name: newCategoryName.trim(), parentId: newCategoryParentId });
        setNewCategoryName('');
        setNewCategoryParentId(null);
        setIsAdding(false);
    };
    
    const handleStartEdit = (category: Category) => {
        setEditingCategoryId(category.id);
        setEditingName(category.name);
        setEditingParentId(category.parentId);
    };

    const handleCancelEdit = () => {
        setEditingCategoryId(null);
    };
    
    const handleSaveEdit = async (id: string) => {
        if (!editingName.trim()) return;
        await onUpdateCategory({ id, name: editingName.trim(), parentId: editingParentId });
        setEditingCategoryId(null);
    };

    const CategoryListItem: React.FC<{ node: CategoryNode; level: number }> = ({ node, level }) => {
        const isEditing = editingCategoryId === node.id;
        const count = courseCountByCategoryId.get(node.id) || 0;

        return (
            <li className={`border-t dark:border-gray-700 ${isEditing ? 'bg-gray-50 dark:bg-gray-700/50' : ''}`} style={{ paddingLeft: `${level * 1.5}rem`}}>
                {isEditing ? (
                    <div className="p-4 space-y-4">
                        <input type="text" value={editingName} onChange={e => setEditingName(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"/>
                        <select value={editingParentId || ''} onChange={e => setEditingParentId(e.target.value || null)} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
                            <option value="">— No Parent —</option>
                            {renderCategoryOptions(categoryTree, 0, node.id)}
                        </select>
                        <div className="flex justify-end gap-2">
                            <button onClick={handleCancelEdit} className="text-sm font-semibold px-3 py-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600">Cancel</button>
                            <button onClick={() => handleSaveEdit(node.id)} className="text-sm font-semibold bg-pink-500 text-white px-3 py-1 rounded-md">Save</button>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-between p-4 group">
                        <div>
                            <p className="font-semibold text-gray-800 dark:text-gray-200">{node.name}</p>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                                <button onClick={() => handleStartEdit(node)} className="text-sm text-pink-500 hover:underline">Edit</button>
                                <span className="text-gray-300 dark:text-gray-600">|</span>
                                <button onClick={() => onDeleteCategory(node.id)} className="text-sm text-red-500 hover:underline">Delete</button>
                            </div>
                        </div>
                        <span className="text-gray-500 dark:text-gray-400">{count}</span>
                    </div>
                )}
                {node.children.length > 0 && (
                    <ul>
                        {node.children.map(child => <CategoryListItem key={child.id} node={child} level={level + 1} />)}
                    </ul>
                )}
            </li>
        );
    };
    
    return (
        <div className="p-4 md:p-8">
            <div className="flex items-center gap-4 mb-8"><ClipboardListIcon className="w-10 h-10 text-pink-500" /><h1 className="text-4xl font-bold">Course Categories</h1></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <form onSubmit={handleAddNewCategory} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md space-y-4 sticky top-28">
                        <h2 className="text-xl font-bold">Add New Category</h2>
                        <div>
                            <label htmlFor="cat-name" className="font-semibold">Name</label>
                            <input id="cat-name" type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} className="w-full mt-1 p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"/>
                        </div>
                        <div>
                            <label htmlFor="cat-parent" className="font-semibold">Parent Category</label>
                            <select id="cat-parent" value={newCategoryParentId || ''} onChange={e => setNewCategoryParentId(e.target.value || null)} className="w-full mt-1 p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
                                <option value="">— No Parent —</option>
                                {renderCategoryOptions(categoryTree)}
                            </select>
                        </div>
                        <button type="submit" disabled={isAdding} className="w-full bg-pink-500 text-white font-bold py-3 rounded-lg hover:bg-pink-600 disabled:bg-pink-400">
                            {isAdding ? 'Adding...' : 'Add New Category'}
                        </button>
                    </form>
                </div>
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-md">
                    <div className="p-4 border-b dark:border-gray-700 flex justify-between font-semibold text-gray-600 dark:text-gray-400"><span>Name</span><span>Courses</span></div>
                    <ul>
                        {categoryTree.map(node => <CategoryListItem key={node.id} node={node} level={0} />)}
                    </ul>
                </div>
            </div>
        </div>
    );
};

// ====================================================================================
// ===== MAIN WRAPPER COMPONENT
// ====================================================================================

interface ManagementPagesProps {
  view: Exclude<View, 'dashboard' | 'player'>;
  user: User;
  courses: Course[];
  enrollments: Enrollment[];
  allUsers: User[];
  onEditCourse: (course: Course | null) => void;
  onSelectCourse: (course: Course) => void;
  onDeleteCourse: (course: Course) => void;
  onToggleCourseVisibility: (course: Course) => void;
  conversations: Conversation[];
  messages: Message[];
  onSendMessage: (recipientIds: string[], subject: string, content: string) => void;
  onUpdateMessages: (messages: Message[]) => void;
  calendarEvents: CalendarEvent[];
  liveSessions: LiveSession[];
  onScheduleSession: (session: Omit<LiveSession, 'id'>) => void;
  onDeleteSession: (sessionId: string) => void;
  onRefetchData: () => void;
  // Course editor specific
  courseToEdit?: Course | null;
  onSave: (course: Course) => void;
  onExit: () => void;
  onSaveUserProfile: (updates: Partial<User> & { id?: string }) => Promise<void>;
  onUpdatePassword: (newPassword: string) => Promise<void>;
  categories: Category[];
  selectedCategoryId: string | null;
  // Category management
  onAddCategory: (category: { name: string; parentId: string | null; }) => Promise<{ success: boolean; data?: Category; error?: any; }>;
  onUpdateCategory: (category: { id: string; name: string; parentId: string | null; }) => Promise<void>;
  onDeleteCategory: (categoryId: string) => Promise<void>;
  onNavigate: (view: View) => void; // Added for navigation from within pages
}

export const ManagementPages: React.FC<ManagementPagesProps> = (props) => {
  switch (props.view) {
    case 'certifications':
      return <CertificationsPage user={props.user} courses={props.courses} enrollments={props.enrollments} />;
    case 'my-courses':
        return <MyCoursesPage user={props.user} courses={props.courses} onEditCourse={props.onEditCourse} onSelectCourse={props.onSelectCourse} categories={props.categories} onDeleteCourse={props.onDeleteCourse} onToggleCourseVisibility={props.onToggleCourseVisibility} />;
    case 'course-categories':
        return <CategoriesPage categories={props.categories} courses={props.courses} onAddCategory={props.onAddCategory} onUpdateCategory={props.onUpdateCategory} onDeleteCategory={props.onDeleteCategory} />;
    case 'course-editor':
        return <CourseEditor course={props.courseToEdit || null} user={props.user} onSave={props.onSave} onExit={props.onExit} categories={props.categories} onAddCategory={props.onAddCategory} />;
    case 'user-management':
        return <UserManagementPage users={props.allUsers} onRefetchData={props.onRefetchData} onSaveUserProfile={props.onSaveUserProfile} />;
    case 'inbox':
        return <InboxPage user={props.user} conversations={props.conversations} messages={props.messages} allUsers={props.allUsers} courses={props.courses} enrollments={props.enrollments} onSendMessage={props.onSendMessage} onUpdateMessages={props.onUpdateMessages} onNavigate={props.onNavigate as any} />;
    case 'calendar':
        return <CalendarPage events={props.calendarEvents} user={props.user} courses={props.courses} />;
    case 'profile':
        return <ProfilePage user={props.user} onSaveProfile={props.onSaveUserProfile} onUpdatePassword={props.onUpdatePassword} />;
    case 'analytics':
        return <AnalyticsPage />;
    case 'student-management':
        return <StudentManagementPage user={props.user} courses={props.courses} allUsers={props.allUsers} enrollments={props.enrollments} onNavigate={props.onNavigate as any} />;
    case 'live-sessions':
        return <LiveSessionsPage user={props.user} courses={props.courses} liveSessions={props.liveSessions} onScheduleSession={props.onScheduleSession} onDeleteSession={props.onDeleteSession} />;
    case 'platform-settings':
        return <PlatformSettingsPage />;
    case 'help':
        return <HelpPage user={props.user} />
    default:
      return (
        <div className="p-8">
          <h1 className="text-2xl font-bold">Coming Soon</h1>
          <p>This page is under construction.</p>
        </div>
      );
  }
};