

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Course, Enrollment, User, Role, Lesson, Module, LessonType, Question, QuizData, Conversation, Message, CalendarEvent, HistoryLog, HistoryAction, LiveSession, VideoProvider, VideoData, Category } from '../types';
import { AwardIcon, BarChart2Icon, BookOpenIcon, CheckCircle2Icon, ChevronDownIcon, ChevronUpIcon, EditIcon, FileTextIcon, GripVerticalIcon, PlusCircleIcon, SettingsIcon, Trash2Icon, UsersIcon, PlayCircleIcon, ClipboardListIcon, XIcon, SearchIcon, DownloadIcon, MailIcon, SendIcon, CalendarIcon, ChevronLeftIcon, ChevronRightIcon, HistoryIcon, MessageSquareIcon, VideoIcon, UserCircleIcon, BoldIcon, ItalicIcon, UnderlineIcon, ListIcon, ListOrderedIcon, ClockIcon } from '../components/Icons';
import { RichTextEditor } from '../components/RichTextEditor';
import { CourseCard } from '../components/CourseCard';
import { ProgressBar } from '../components/ProgressBar';
import { HelpPage } from './HelpPage';
import * as api from '../supabaseApi';
import { supabase } from '../supabaseClient';
import type { View } from '../components/Sidebar';


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

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode }> = ({ isOpen, onClose, title, children, footer }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
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
            .filter(e => e.userId === user.id && e.progress === 100)
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
                    <p className="text-gray-500 dark:text-gray-400 mt-2">Complete a course to 100% to earn your certificate!</p>
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
  onSendMessage: (recipientIds: string[], subject: string, content: string) => void;
  onUpdateMessages: (messages: Message[]) => void;
}> = ({ user, conversations, messages, allUsers, courses, onSendMessage, onUpdateMessages }) => {
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [isComposing, setIsComposing] = useState(false);

    const usersById = useMemo(() => new Map(allUsers.map(u => [u.id, u])), [allUsers]);
    
    const relevantConversations = useMemo(() => {
        return conversations
            .map(convo => {
                const otherParticipantId = convo.participantIds.find(id => id !== user.id);
                const otherParticipant = usersById.get(otherParticipantId || '');
                const lastMessage = messages.filter(m => m.conversationId === convo.id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
                return { ...convo, otherParticipant, lastMessage };
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
        // Mark messages as read
        const updatedMessages = messages.map(m => m.conversationId === convoId && m.senderId !== user.id ? { ...m, isRead: true } : m);
        onUpdateMessages(updatedMessages);
    };

    const handleSendMessage = (recipientIds: string[], subject: string, content: string) => {
        onSendMessage(recipientIds, subject, content);
        setIsComposing(false);
    };
    
    const ComposeView: React.FC<{ onCancel: () => void; onSend: (recipientIds: string[], subject: string, content: string) => void }> = ({ onCancel, onSend }) => {
        const [recipients, setRecipients] = useState<string[]>([]);
        const [subject, setSubject] = useState('');
        const [content, setContent] = useState('');

        const instructorCourses = useMemo(() => courses.filter(c => c.instructorId === user.id), [courses, user.id]);
        const studentInstructors = useMemo(() => {
            const enrolledCourseIds = courses.filter(c => c.modules.some(m => m.lessons.some(l => l.id))).map(c => c.id);
            const instructorIds = new Set(courses.filter(c => enrolledCourseIds.includes(c.id)).map(c => c.instructorId));
            return allUsers.filter(u => instructorIds.has(u.id));
        }, [courses, allUsers]);

        const canSendMessage = recipients.length > 0 && content.trim() !== '';

        return (
            <div className="p-6">
                 <h2 className="text-xl font-bold mb-4">New Message</h2>
                 {user.role !== Role.STUDENT ? (
                     <div>
                         <label className="font-semibold block mb-2">To:</label>
                         <select multiple value={recipients} onChange={e => setRecipients(Array.from(e.target.selectedOptions, option => option.value))} className="w-full p-2 border rounded-lg h-40 dark:bg-gray-700 dark:border-gray-600">
                            {instructorCourses.map(course => (
                                <optgroup key={course.id} label={course.title}>
                                    {allUsers.filter(u => u.role === Role.STUDENT).map(student => (
                                        <option key={student.id} value={student.id}>{student.firstName} {student.lastName}</option>
                                    ))}
                                </optgroup>
                            ))}
                         </select>
                     </div>
                 ) : (
                    <div>
                        <label className="font-semibold block mb-2">To:</label>
                        <select value={recipients[0] || ''} onChange={e => setRecipients([e.target.value])} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
                            <option value="" disabled>Select an instructor</option>
                            {studentInstructors.map(inst => <option key={inst.id} value={inst.id}>{inst.firstName} {inst.lastName} (Instructor)</option>)}
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
        <div className="flex h-full">
            <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <button onClick={() => setIsComposing(true)} className="w-full bg-pink-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-pink-600"><EditIcon className="w-5 h-5" /> New Message</button>
                </div>
                <ul className="overflow-y-auto">
                    {relevantConversations.map(convo => (
                        <li key={convo.id} onClick={() => handleConversationSelect(convo.id)} className={`p-4 cursor-pointer border-b border-gray-200 dark:border-gray-700 flex items-start gap-4 ${selectedConversationId === convo.id ? 'bg-gray-100 dark:bg-gray-700/50' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}>
                            <UserCircleIcon className="w-10 h-10 text-gray-400 flex-shrink-0" />
                            <div className="flex-grow min-w-0">
                                <div className="flex justify-between">
                                    <p className="font-bold truncate">{convo.otherParticipant?.firstName} {convo.otherParticipant?.lastName}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">{new Date(convo.lastMessage.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                </div>
                                <p className={`truncate text-sm ${!convo.lastMessage.isRead && convo.lastMessage.senderId !== user.id ? 'font-bold text-gray-800 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}`}>{convo.lastMessage.content}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="w-2/3 flex flex-col">
                {isComposing ? <ComposeView onCancel={() => setIsComposing(false)} onSend={handleSendMessage} /> : selectedConversationId ? (
                    <>
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                            <h2 className="text-xl font-bold">{usersById.get(relevantConversations.find(c=>c.id === selectedConversationId)?.otherParticipant?.id || '')?.firstName} {usersById.get(relevantConversations.find(c=>c.id === selectedConversationId)?.otherParticipant?.id || '')?.lastName}</h2>
                        </div>
                        <div className="flex-grow p-6 overflow-y-auto space-y-4">
                            {selectedConversationMessages.map(msg => (
                                <div key={msg.id} className={`flex ${msg.senderId === user.id ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-xl px-4 py-3 rounded-2xl ${msg.senderId === user.id ? 'bg-pink-500 text-white rounded-br-none' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'}`}>
                                        <p>{msg.content}</p>
                                        <p className={`text-xs mt-1 ${msg.senderId === user.id ? 'text-pink-100' : 'text-gray-500 dark:text-gray-400'} text-right`}>{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                             <form onSubmit={e => { e.preventDefault(); onSendMessage([relevantConversations.find(c=>c.id===selectedConversationId)!.otherParticipant!.id], '', (e.target as any).message.value); (e.target as any).message.value = ''; }} className="flex gap-4">
                                <input name="message" type="text" placeholder="Type a message..." className="w-full p-3 rounded-lg border dark:bg-gray-700 dark:border-gray-600" />
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

const CalendarPage: React.FC<{ events: CalendarEvent[], user: User, courses: Course[] }> = ({ events }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDay = startOfMonth.getDay();
    const daysInMonth = endOfMonth.getDate();

    const calendarGrid = useMemo(() => {
        const grid = [];
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
        events.forEach(event => {
            const dateStr = event.date; // YYYY-MM-DD
            if (!map.has(dateStr)) map.set(dateStr, []);
            map.get(dateStr)!.push(event);
        });
        return map;
    }, [events]);
    
    const changeMonth = (offset: number) => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    };
    
    const eventTypeColor = { deadline: 'bg-red-500', live_session: 'bg-blue-500', assignment: 'bg-yellow-500' };

    return (
        <div className="p-4 md:p-8">
             <div className="flex justify-between items-center mb-8">
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
            <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center font-semibold p-3 bg-white dark:bg-gray-800 text-sm">{day}</div>
                ))}
                {calendarGrid.map((date, index) => (
                    <div key={index} className="bg-white dark:bg-gray-800 p-2 h-36 flex flex-col overflow-hidden">
                        {date && (
                            <>
                                <span className={`font-semibold text-sm ${isToday(date) ? 'bg-pink-500 text-white rounded-full w-7 h-7 flex items-center justify-center' : ''}`}>{date.getDate()}</span>
                                <div className="mt-1 space-y-1 overflow-y-auto">
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

const HistoryPage: React.FC<{ logs: HistoryLog[] }> = ({ logs }) => {
    const getIconForAction = (action: HistoryAction) => {
        switch (action) {
            case 'course_enrolled': return <BookOpenIcon className="w-5 h-5 text-blue-500" />;
            case 'lesson_completed': return <CheckCircle2Icon className="w-5 h-5 text-green-500" />;
            case 'quiz_passed': return <ClipboardListIcon className="w-5 h-5 text-purple-500" />;
            case 'certificate_earned': return <AwardIcon className="w-5 h-5 text-yellow-500" />;
            case 'discussion_posted': return <MessageSquareIcon className="w-5 h-5 text-gray-500" />;
            default: return null;
        }
    };

    const formatActionText = (action: HistoryAction) => {
        return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };
    
    return (
        <div className="p-4 md:p-8">
            <div className="flex items-center gap-4 mb-8">
                <HistoryIcon className="w-10 h-10 text-pink-500" />
                <h1 className="text-4xl font-bold">Activity History</h1>
            </div>
            <ul className="space-y-4">
                {logs.map(log => (
                    <li key={log.id} className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full">{getIconForAction(log.action)}</div>
                        <div className="flex-grow">
                            <p className="font-semibold">{formatActionText(log.action)}: <span className="font-normal">{log.targetName}</span></p>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(log.timestamp).toLocaleString()}</p>
                    </li>
                ))}
            </ul>
        </div>
    );
};

const ProfilePage: React.FC<{ user: User; onSave: (updates: Partial<User> & { newPassword?: string }) => Promise<void> }> = ({ user, onSave }) => {
    const [firstName, setFirstName] = useState(user.firstName);
    const [lastName, setLastName] = useState(user.lastName);
    const [company, setCompany] = useState(user.company || '');
    const [bio, setBio] = useState(user.bio || '');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword && newPassword !== confirmPassword) {
            alert("Passwords do not match.");
            return;
        }
        setIsSaving(true);
        const updates: Partial<User> & { newPassword?: string } = {
            firstName,
            lastName,
            company,
            bio,
        };
        if (newPassword) {
            updates.newPassword = newPassword;
        }
        await onSave(updates);
        setIsSaving(false);
    };
    
    return (
         <div className="p-4 md:p-8">
            <div className="flex items-center gap-4 mb-8">
                <UserCircleIcon className="w-10 h-10 text-pink-500" />
                <h1 className="text-4xl font-bold">My Profile</h1>
            </div>
             <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto">
                 <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md">
                     <h2 className="text-2xl font-bold mb-6">Personal Information</h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div><label className="font-semibold">First Name</label><input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full mt-1 p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"/></div>
                        <div><label className="font-semibold">Last Name</label><input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full mt-1 p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"/></div>
                        <div><label className="font-semibold">Email</label><input type="email" value={user.email} disabled className="w-full mt-1 p-2 border rounded-lg bg-gray-100 dark:bg-gray-900 dark:border-gray-600 cursor-not-allowed"/></div>
                        <div><label className="font-semibold">Company</label><input type="text" value={company} onChange={e => setCompany(e.target.value)} className="w-full mt-1 p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"/></div>
                        <div className="md:col-span-2"><label className="font-semibold">Bio</label><textarea value={bio} onChange={e => setBio(e.target.value)} rows={4} className="w-full mt-1 p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"></textarea></div>
                     </div>
                 </div>
                 <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md">
                    <h2 className="text-2xl font-bold mb-6">Change Password</h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div><label className="font-semibold">New Password</label><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full mt-1 p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"/></div>
                        <div><label className="font-semibold">Confirm New Password</label><input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full mt-1 p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"/></div>
                     </div>
                </div>
                 <div className="text-right">
                     <button type="submit" disabled={isSaving} className="bg-pink-500 text-white font-bold py-3 px-8 rounded-lg hover:bg-pink-600 disabled:bg-pink-400 disabled:cursor-not-allowed transition-colors">
                        {isSaving ? 'Saving...' : 'Save Changes'}
                     </button>
                 </div>
             </form>
         </div>
    );
};


// ... Other pages like MyCourses, CourseEditor, etc. will be large components.
// For brevity, let's sketch them out. A real implementation would be more detailed.
const MyCoursesPage: React.FC<{ user: User, courses: Course[], onEditCourse: (course: Course | null) => void, onSelectCourse: (course: Course) => void, categories: Category[] }> = ({ user, courses, onEditCourse, onSelectCourse, categories }) => {
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
                    <CourseCard key={course.id} course={course} user={user} onEdit={onEditCourse} onSelect={onSelectCourse} categoryName={categoryMap.get(course.categoryId) || 'Uncategorized'} />
                ))}
            </div>
        </div>
    );
};

// FIX: Changed onSaveUserProfile prop to return Promise<void> to match its awaited usage.
const UserManagementPage: React.FC<{ users: User[], onRefetchData: () => void, onSaveUserProfile: (updates: Partial<User>) => Promise<void> }> = ({ users, onRefetchData, onSaveUserProfile }) => {
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const handleSave = async (updates: Partial<User>) => {
        if (!editingUser) return;
        await onSaveUserProfile({ id: editingUser.id, ...updates });
        setEditingUser(null);
        onRefetchData();
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
            {editingUser && (
                <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} title={`Edit ${editingUser.firstName}`}>
                    {/* Simplified Edit Form */}
                    <div className="space-y-4">
                        <div><label>First Name</label><input type="text" defaultValue={editingUser.firstName} id="edit-fname" className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600"/></div>
                        <div><label>Last Name</label><input type="text" defaultValue={editingUser.lastName} id="edit-lname" className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600"/></div>
                        <div>
                            <label>Role</label>
                            <select defaultValue={editingUser.role} id="edit-role" className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 capitalize">
                                {Object.values(Role).map(role => <option key={role} value={role} className="capitalize">{role}</option>)}
                            </select>
                        </div>
                        <button onClick={() => handleSave({ firstName: (document.getElementById('edit-fname') as HTMLInputElement).value, lastName: (document.getElementById('edit-lname') as HTMLInputElement).value, role: (document.getElementById('edit-role') as HTMLSelectElement).value as Role })} className="bg-pink-500 text-white px-6 py-2 rounded-lg">Save</button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

// More placeholder pages
const AnalyticsPage: React.FC = () => <div className="p-8"><h1 className="text-4xl font-bold">Analytics</h1><p className="mt-4">Analytics dashboard with charts and key metrics will be displayed here.</p></div>;
const StudentManagementPage: React.FC = () => <div className="p-8"><h1 className="text-4xl font-bold">Student Management</h1><p className="mt-4">A view for instructors to see their students' progress and engagement.</p></div>;
const LiveSessionsPage: React.FC = () => <div className="p-8"><h1 className="text-4xl font-bold">Live Sessions</h1><p className="mt-4">Instructors can schedule and manage live video sessions here.</p></div>;
const PlatformSettingsPage: React.FC = () => <div className="p-8"><h1 className="text-4xl font-bold">Platform Settings</h1><p className="mt-4">Admins can manage global platform settings like branding, integrations, etc.</p></div>;

// ====================================================================================
// ===== COURSE EDITOR - A very large and complex component
// ====================================================================================

const LessonEditModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    lesson: Lesson | null;
    onSave: (lesson: Lesson) => void;
}> = ({ isOpen, onClose, lesson: initialLesson, onSave }) => {
    const [lesson, setLesson] = useState<Lesson | null>(null);

    useEffect(() => {
        if (initialLesson) {
            setLesson(JSON.parse(JSON.stringify(initialLesson)));
        } else {
            setLesson(null);
        }
    }, [initialLesson, isOpen]);

    const updateField = (field: keyof Lesson, value: any) => {
        if (!lesson) return;
        setLesson({ ...lesson, [field]: value });
    };

    const updateContentField = (field: keyof Lesson['content'], value: any) => {
        if (!lesson) return;
        setLesson({ ...lesson, content: { ...lesson.content, [field]: value } });
    };

    const handleSave = () => {
        if (lesson) onSave(lesson);
    };

    if (!isOpen || !lesson) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={lesson.id.startsWith('new') ? 'New Lesson' : 'Edit Lesson'}
            footer={
                <div className="flex justify-end gap-4">
                    <button onClick={onClose} className="bg-gray-200 dark:bg-gray-600 px-6 py-2 rounded-lg font-semibold">Cancel</button>
                    <button onClick={handleSave} className="bg-pink-500 text-white px-6 py-2 rounded-lg font-semibold">Save Lesson</button>
                </div>
            }
        >
            <div className="space-y-6">
                <div><label className="font-semibold">Title</label><input type="text" value={lesson.title} onChange={e => updateField('title', e.target.value)} className="w-full mt-1 p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"/></div>
                <div><label className="font-semibold">Duration (minutes)</label><input type="number" value={lesson.duration} onChange={e => updateField('duration', parseInt(e.target.value, 10) || 0)} className="w-full mt-1 p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"/></div>
                <div>
                    <label className="font-semibold">Lesson Type</label>
                    <select value={lesson.type} onChange={e => updateField('type', e.target.value as LessonType)} className="w-full mt-1 p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 capitalize">
                        {Object.values(LessonType).map(type => <option key={type} value={type} className="capitalize">{type}</option>)}
                    </select>
                </div>

                {lesson.type === LessonType.TEXT && (
                    <RichTextEditor label="Content" value={lesson.content.text || ''} onChange={val => updateContentField('text', val)} />
                )}

                {lesson.type === LessonType.VIDEO && (
                    <div className="space-y-4">
                        <div>
                            <label className="font-semibold">Video Provider</label>
                            <select value={lesson.content.videoData?.provider} onChange={e => updateContentField('videoData', { ...(lesson.content.videoData || { provider: VideoProvider.YOUTUBE, url: '' }), provider: e.target.value as VideoProvider })} className="w-full mt-1 p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 capitalize">
                                {Object.values(VideoProvider).map(p => <option key={p} value={p}>{p.replace('_', ' ')}</option>)}
                            </select>
                        </div>
                         <div><label className="font-semibold">Video URL or ID</label><input type="text" value={lesson.content.videoData?.url} onChange={e => updateContentField('videoData', { ...(lesson.content.videoData || { provider: VideoProvider.YOUTUBE, url: '' }), url: e.target.value })} className="w-full mt-1 p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"/></div>
                    </div>
                )}
                {/* Add UI for PDF and QUIZ types */}
            </div>
        </Modal>
    );
};


const CourseEditor: React.FC<{ course: Course | null; user: User; onSave: (course: Course) => void; onExit: () => void; categories: Category[] }> = ({ course: initialCourse, user, onSave, onExit, categories }) => {
    const [course, setCourse] = useState<Course>(initialCourse || {
        id: `new-course-${Date.now()}`, title: '', description: '', thumbnail: 'https://placehold.co/600x400/e2e8f0/e2e8f0', categoryId: categories[0]?.id || '', instructorId: user.id, instructorName: `${user.firstName} ${user.lastName}`, modules: [], totalLessons: 0, estimatedDuration: 0,
    });
    const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

    const updateCourseField = (field: keyof Course, value: any) => setCourse(prev => ({...prev, [field]: value}));

    const addModule = () => {
        const newModule: Module = { id: `new-module-${Date.now()}`, courseId: course.id, title: 'New Module', lessons: [], order: course.modules.length };
        updateCourseField('modules', [...course.modules, newModule]);
    };
    
    const updateModule = (moduleId: string, newTitle: string) => {
        updateCourseField('modules', course.modules.map(m => m.id === moduleId ? {...m, title: newTitle} : m));
    };

    const deleteModule = (moduleId: string) => {
        if (window.confirm("Are you sure you want to delete this module and all its lessons?")) {
            updateCourseField('modules', course.modules.filter(m => m.id !== moduleId));
        }
    };
    
    const deleteLesson = (moduleId: string, lessonId: string) => {
        if (window.confirm("Are you sure you want to delete this lesson?")) {
            const newModules = course.modules.map(module => {
                if (module.id === moduleId) {
                    return { ...module, lessons: module.lessons.filter(lesson => lesson.id !== lessonId) };
                }
                return module;
            });
            updateCourseField('modules', newModules);
        }
    };

    const addLesson = (moduleId: string) => {
        const newLesson: Lesson = { id: `new-lesson-${Date.now()}`, moduleId, title: 'New Lesson', type: LessonType.TEXT, content: { text: '' }, duration: 5, order: 0 };
        setEditingLesson(newLesson);
    };

    const saveLesson = (lessonToSave: Lesson) => {
        let moduleFound = false;
        const newModules = course.modules.map(m => {
            if (m.id === lessonToSave.moduleId) {
                moduleFound = true;
                const lessonExists = m.lessons.some(l => l.id === lessonToSave.id);
                const newLessons = lessonExists ? m.lessons.map(l => l.id === lessonToSave.id ? lessonToSave : l) : [...m.lessons, {...lessonToSave, order: m.lessons.length}];
                return {...m, lessons: newLessons};
            }
            return m;
        });
        if(moduleFound) {
            updateCourseField('modules', newModules);
        }
        setEditingLesson(null);
    };

    return (
        <div className="p-4 md:p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-bold">{initialCourse ? 'Edit Course' : 'Create New Course'}</h1>
                <div className="flex gap-4">
                    <button onClick={onExit} className="bg-gray-200 dark:bg-gray-600 px-6 py-2 rounded-lg font-semibold">Cancel</button>
                    <button onClick={() => onSave(course)} className="bg-pink-500 text-white font-bold py-3 px-8 rounded-lg">Save Course</button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Course Details */}
                <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md space-y-4">
                    <h2 className="text-xl font-bold">Course Details</h2>
                    <div><label>Title</label><input type="text" value={course.title} onChange={e => updateCourseField('title', e.target.value)} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 mt-1"/></div>
                    <div><label>Description</label><textarea value={course.description} onChange={e => updateCourseField('description', e.target.value)} rows={4} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 mt-1"/></div>
                    <div>
                        <label>Category</label>
                        <select value={course.categoryId} onChange={e => updateCourseField('categoryId', e.target.value)} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 mt-1">
                            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                        </select>
                    </div>
                    <div><label>Thumbnail URL</label><input type="text" value={course.thumbnail} onChange={e => updateCourseField('thumbnail', e.target.value)} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 mt-1"/></div>
                    <img src={course.thumbnail} alt="Thumbnail preview" className="w-full rounded-lg object-cover aspect-video mt-2" />
                </div>

                {/* Curriculum Builder */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md space-y-6">
                     <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold">Curriculum</h2>
                        <button onClick={addModule} className="flex items-center gap-2 text-sm font-semibold text-pink-500"><PlusCircleIcon className="w-5 h-5" /> Add Module</button>
                    </div>
                    {course.modules.map(module => (
                        <div key={module.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <div className="flex items-center justify-between">
                                <input type="text" value={module.title} onChange={e => updateModule(module.id, e.target.value)} className="font-bold text-lg bg-transparent border-none focus:ring-0 w-full" />
                                <button onClick={() => deleteModule(module.id)} className="text-gray-400 hover:text-red-500"><Trash2Icon className="w-5 h-5"/></button>
                            </div>
                             <ul className="mt-4 space-y-2">
                                {module.lessons.map(lesson => (
                                    <li key={lesson.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md gap-2">
                                        <p className="flex-grow">{lesson.title}</p>
                                        <div className="flex gap-1 flex-shrink-0">
                                            <button onClick={() => setEditingLesson(lesson)} className="p-1 text-gray-400 hover:text-pink-500" title="Edit lesson details">
                                                <EditIcon className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => deleteLesson(module.id, lesson.id)} className="p-1 text-gray-400 hover:text-red-500" title="Delete lesson">
                                                <Trash2Icon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                            <button onClick={() => addLesson(module.id)} className="mt-4 text-sm text-pink-500 font-semibold flex items-center gap-2"><PlusCircleIcon className="w-4 h-4"/> Add Lesson</button>
                        </div>
                    ))}
                </div>
            </div>
             <LessonEditModal isOpen={!!editingLesson} onClose={() => setEditingLesson(null)} lesson={editingLesson} onSave={saveLesson} />
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
  conversations: Conversation[];
  messages: Message[];
  onSendMessage: (recipientIds: string[], subject: string, content: string) => void;
  onUpdateMessages: (messages: Message[]) => void;
  calendarEvents: CalendarEvent[];
  historyLogs: HistoryLog[];
  liveSessions: LiveSession[];
  onScheduleSession: (session: Omit<LiveSession, 'id'>) => void;
  onDeleteSession: (sessionId: string) => void;
  onRefetchData: () => void;
  // Course editor specific
  courseToEdit?: Course | null;
  onSave: (course: Course) => void;
  onExit: () => void;
  // FIX: Changed onSaveUserProfile prop to return Promise<void> to match the async function passed to it.
  onSaveUserProfile: (updates: Partial<User> & { newPassword?: string }) => Promise<void>;
  categories: Category[];
  selectedCategoryId: string | null;
}

export const ManagementPages: React.FC<ManagementPagesProps> = (props) => {
  switch (props.view) {
    case 'certifications':
      return <CertificationsPage user={props.user} courses={props.courses} enrollments={props.enrollments} />;
    case 'my-courses':
        return <MyCoursesPage user={props.user} courses={props.courses} onEditCourse={props.onEditCourse} onSelectCourse={props.onSelectCourse} categories={props.categories} />;
    case 'course-editor':
        return <CourseEditor course={props.courseToEdit || null} user={props.user} onSave={props.onSave} onExit={props.onExit} categories={props.categories} />;
    case 'user-management':
        return <UserManagementPage users={props.allUsers} onRefetchData={props.onRefetchData} onSaveUserProfile={props.onSaveUserProfile} />;
    case 'inbox':
        return <InboxPage user={props.user} conversations={props.conversations} messages={props.messages} allUsers={props.allUsers} courses={props.courses} onSendMessage={props.onSendMessage} onUpdateMessages={props.onUpdateMessages} />;
    case 'calendar':
        return <CalendarPage events={props.calendarEvents} user={props.user} courses={props.courses} />;
    case 'history':
        return <HistoryPage logs={props.historyLogs} />;
    case 'profile':
        return <ProfilePage user={props.user} onSave={props.onSaveUserProfile} />;
    case 'analytics':
        return <AnalyticsPage />;
    case 'student-management':
        return <StudentManagementPage />;
    case 'live-sessions':
        return <LiveSessionsPage />;
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