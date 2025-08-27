import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Course, Enrollment, User, Role, Lesson, Module, LessonType, Question, QuizData, Conversation, Message, CalendarEvent, HistoryLog, HistoryAction, LiveSession, VideoProvider, VideoData } from '../types';
import { AwardIcon, BarChart2Icon, BookOpenIcon, CheckCircle2Icon, ChevronDownIcon, ChevronUpIcon, EditIcon, FileTextIcon, GripVerticalIcon, PlusCircleIcon, SettingsIcon, Trash2Icon, UsersIcon, PlayCircleIcon, ClipboardListIcon, XIcon, SearchIcon, DownloadIcon, MailIcon, SendIcon, CalendarIcon, ChevronLeftIcon, ChevronRightIcon, HistoryIcon, MessageSquareIcon, VideoIcon, UserCircleIcon, BoldIcon, ItalicIcon, UnderlineIcon, ListIcon, ListOrderedIcon, ClockIcon } from '../components/Icons';
import { RichTextEditor } from '../components/RichTextEditor';
import { CourseCard } from '../components/CourseCard';
import { ProgressBar } from '../components/ProgressBar';
import { HelpPage } from './HelpPage';
import * as api from '../supabaseApi';
// FIX: Import supabase client directly
import { supabase } from '../supabaseClient';
// FIX: Added missing import for the 'View' type, used by ManagementPagesProps.
import type { View } from '../components/Sidebar';


declare global {
  interface Window {
    jspdf: any;
    html2canvas: any;
  }
}

// ====================================================================================
// ===== SHARED COMPONENTS (Copied from Dashboard for consistency)
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

interface EngagementData { name: string; value: number; }
const SimpleBarChart: React.FC<{data: EngagementData[], color: string}> = ({ data, color }) => (
    <div className="w-full h-64 bg-gray-100 dark:bg-gray-700/50 p-4 rounded-lg flex items-end justify-around gap-2">
        {data.map((item, index) => (
            <div key={index} className="flex-1 flex flex-col items-center justify-end h-full">
                <div 
                    className="w-3/4 rounded-t-md"
                    style={{ height: `${(item.value / Math.max(...data.map(d => d.value), 1)) * 100}%`, backgroundColor: color }}
                    title={`${item.name}: ${item.value}`}
                ></div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{item.name}</p>
            </div>
        ))}
    </div>
);


// ====================================================================================
// ===== 1. CERTIFICATION PAGE (for Students)
// ====================================================================================

const CertificateTemplate: React.FC<{ course: Course, user: User, completionDate: string }> = ({ course, user, completionDate }) => {
    const backgroundUrl = 'https://i.postimg.cc/P5hDjCLK/Nexus-Certificates-1-LE-upscale-balanced-x4.jpg';

    return (
        <div 
            id={`certificate-${course.id}-${user.id}`} 
            className="w-[1123px] h-[794px] bg-cover bg-center relative text-black"
            style={{ 
                backgroundImage: `url(${backgroundUrl})`,
                fontFeatureSettings: '"liga" 0', // Disables ligatures that might mess up text rendering on images
            }}
        >
            {/* Recipient's Name */}
            <div
                style={{
                    position: 'absolute',
                    top: '360px',
                    left: '0',
                    width: '100%',
                    textAlign: 'center',
                    fontFamily: '"Cinzel Decorative", serif',
                    fontSize: '48px',
                    fontWeight: 'bold',
                    color: '#1a237e', // Indigo dye color
                }}
            >
                {`${user.firstName} ${user.lastName}`}
            </div>

            {/* Course Title */}
            <div
                style={{
                    position: 'absolute',
                    top: '470px',
                    left: '0',
                    width: '100%',
                    textAlign: 'center',
                    fontFamily: '"Montserrat", sans-serif',
                    fontSize: '24px',
                    fontWeight: 600,
                    color: '#37474f', // Dark gray
                    padding: '0 100px', // Prevent text from touching edges
                }}
            >
                {course.title}
            </div>

            {/* Completion Date */}
             <div
                style={{
                    position: 'absolute',
                    bottom: '155px',
                    left: '180px',
                    fontFamily: '"Montserrat", sans-serif',
                    fontSize: '16px',
                    fontWeight: 500,
                    color: '#37474f',
                }}
            >
                {completionDate}
            </div>

            {/* Instructor Name */}
            <div
                style={{
                    position: 'absolute',
                    bottom: '155px',
                    right: '190px',
                    fontFamily: '"Montserrat", sans-serif',
                    fontSize: '16px',
                    fontWeight: 500,
                    color: '#37474f',
                }}
            >
                {course.instructorName}
            </div>
        </div>
    );
};


const CertificationsPage: React.FC<{ user: User, courses: Course[], enrollments: Enrollment[] }> = ({ user, courses, enrollments }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const certificateContainerRef = useRef<HTMLDivElement>(null);
  
  const completedCourses = useMemo(() => {
    const completedEnrollments = enrollments.filter(e => e.progress === 100 && e.userId === user.id);
    return courses.filter(c => completedEnrollments.some(e => e.courseId === c.id));
  }, [courses, enrollments, user.id]);

  const handleDownload = async (course: Course) => {
    setIsDownloading(true);

    // Dynamically load scripts if they are not already loaded
    const loadScript = (src: string) => {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve(true);
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => resolve(true);
            script.onerror = () => reject(new Error(`Script load error for ${src}`));
            document.body.appendChild(script);
        });
    };
    
    try {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
        
        const certificateElement = document.getElementById(`certificate-${course.id}-${user.id}`);
        if (certificateElement && window.html2canvas && window.jspdf) {
            const { jsPDF } = window.jspdf;
            const canvas = await window.html2canvas(certificateElement, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');

            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'px',
                format: [1123, 794]
            });

            pdf.addImage(imgData, 'PNG', 0, 0, 1123, 794);
            pdf.save(`Nexus_Certificate_${course.title.replace(/\s+/g, '_')}.pdf`);
        } else {
            console.error("Certificate element or required libraries not found.");
        }
    } catch (error) {
        console.error("Failed to download certificate:", error);
    } finally {
        setIsDownloading(false);
    }
  };
  
  const completionDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
            <div className="text-center">
                <AwardIcon className="w-16 h-16 mx-auto text-pink-500" />
                <h1 className="mt-4 text-4xl md:text-5xl font-extrabold">My Certifications</h1>
                <p className="mt-4 text-lg md:text-xl text-gray-600 dark:text-gray-400">
                    Congratulations on your achievements! Download your certificates here.
                </p>
            </div>

            {completedCourses.length > 0 ? (
                <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {completedCourses.map(course => (
                        <div key={course.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 flex flex-col items-center text-center">
                            <AwardIcon className="w-12 h-12 text-amber-500 mb-4" />
                            <h3 className="text-xl font-bold">{course.title}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Completed on {completionDate}</p>
                            <button
                                onClick={() => handleDownload(course)}
                                disabled={isDownloading}
                                className="mt-6 bg-pink-500 text-white font-semibold py-2.5 px-6 rounded-lg hover:bg-pink-600 transition-all flex items-center gap-2 disabled:bg-gray-400"
                            >
                                <DownloadIcon className="w-5 h-5" />
                                {isDownloading ? 'Downloading...' : 'Download PDF'}
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="mt-12 text-center py-16 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <p className="text-gray-500 dark:text-gray-400 text-lg">You haven't earned any certificates yet. Complete a course to see it here!</p>
                </div>
            )}
        </div>
        
        {/* Hidden container for rendering certificates for PDF generation */}
        <div ref={certificateContainerRef} className="fixed -left-[9999px] top-0">
             {completedCourses.map(course => (
                 <CertificateTemplate key={course.id} course={course} user={user} completionDate={completionDate} />
             ))}
        </div>
    </div>
  );
};


// ====================================================================================
// ===== 2. MY COURSES PAGE (for Instructors/Admins)
// ====================================================================================

const MyCoursesPage: React.FC<{ user: User; courses: Course[]; onEditCourse: (course: Course | null) => void; onSelectCourse: (course: Course) => void; }> = ({ user, courses, onEditCourse, onSelectCourse }) => {
    const instructorCourses = useMemo(() => {
        if (user.role === Role.ADMIN) return courses;
        return courses.filter(c => c.instructorId === user.id);
    }, [courses, user]);

    return (
        <div className="p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold">My Courses</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage, edit, and create new courses.</p>
                    </div>
                    <button
                        onClick={() => onEditCourse(null)}
                        className="flex items-center gap-2 bg-pink-500 text-white font-semibold px-4 py-2.5 rounded-lg hover:bg-pink-600 transition-all"
                    >
                        <PlusCircleIcon className="w-5 h-5" />
                        Create New Course
                    </button>
                </div>
                 {instructorCourses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {instructorCourses.map(course => (
                            <CourseCard
                                key={course.id}
                                course={course}
                                user={user}
                                onSelect={onSelectCourse}
                                onEdit={onEditCourse}
                            />
                        ))}
                    </div>
                 ) : (
                    <div className="text-center py-20 bg-gray-100 dark:bg-gray-800 rounded-lg">
                        <BookOpenIcon className="w-12 h-12 mx-auto text-gray-400" />
                        <h3 className="mt-4 text-xl font-semibold">No Courses Yet</h3>
                        <p className="mt-1 text-gray-500 dark:text-gray-400">Click "Create New Course" to get started.</p>
                    </div>
                 )}
            </div>
        </div>
    );
};


// ====================================================================================
// ===== 3. COURSE EDITOR (for Instructors/Admins) - RESTORED FULL FUNCTIONALITY
// ====================================================================================
const QuizEditor: React.FC<{ quizData: QuizData; onUpdate: (data: QuizData) => void; }> = ({ quizData, onUpdate }) => {
    const updateField = (field: keyof QuizData, value: any) => onUpdate({ ...quizData, [field]: value });

    const handleQuestionChange = (qIndex: number, text: string) => {
        const newQuestions = [...quizData.questions];
        newQuestions[qIndex].questionText = text;
        updateField('questions', newQuestions);
    };

    const handleOptionChange = (qIndex: number, oIndex: number, text: string) => {
        const newQuestions = [...quizData.questions];
        newQuestions[qIndex].options[oIndex] = text;
        updateField('questions', newQuestions);
    };

    const setCorrectAnswer = (qIndex: number, oIndex: number) => {
        const newQuestions = [...quizData.questions];
        newQuestions[qIndex].correctAnswerIndex = oIndex;
        updateField('questions', newQuestions);
    };

    const addQuestion = () => {
        const newQuestion: Question = {
            id: crypto.randomUUID(),
            questionText: '',
            options: ['', ''],
            correctAnswerIndex: 0
        };
        updateField('questions', [...quizData.questions, newQuestion]);
    };
    
    const removeQuestion = (qIndex: number) => updateField('questions', quizData.questions.filter((_, i) => i !== qIndex));
    const addOption = (qIndex: number) => {
        const newQuestions = [...quizData.questions];
        newQuestions[qIndex].options.push('');
        updateField('questions', newQuestions);
    };
    const removeOption = (qIndex: number, oIndex: number) => {
        const newQuestions = [...quizData.questions];
        newQuestions[qIndex].options = newQuestions[qIndex].options.filter((_, i) => i !== oIndex);
        if (newQuestions[qIndex].correctAnswerIndex === oIndex) {
            newQuestions[qIndex].correctAnswerIndex = 0;
        }
        updateField('questions', newQuestions);
    }

    return (
        <div className="space-y-6">
            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                <label htmlFor="passingScore" className="block text-sm font-bold text-gray-700 dark:text-gray-300">Passing Score (%)</label>
                <input id="passingScore" type="number" value={quizData.passingScore} onChange={e => updateField('passingScore', parseInt(e.target.value) || 80)} className="mt-1 w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-600" />
            </div>
            {quizData.questions.map((q, qIndex) => (
                <div key={q.id} className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="font-bold">Question {qIndex + 1}</h4>
                        <button onClick={() => removeQuestion(qIndex)} className="p-1.5 text-red-500 hover:bg-red-100 rounded-full"><Trash2Icon className="w-5 h-5"/></button>
                    </div>
                    <textarea value={q.questionText} onChange={e => handleQuestionChange(qIndex, e.target.value)} placeholder="Question text..." rows={2} className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-600 mb-3" />
                    <div className="space-y-2">
                        {q.options.map((opt, oIndex) => (
                            <div key={oIndex} className="flex items-center gap-2">
                                <input type="radio" name={`correct-answer-${q.id}`} checked={q.correctAnswerIndex === oIndex} onChange={() => setCorrectAnswer(qIndex, oIndex)} className="h-5 w-5 text-pink-600 focus:ring-pink-500" />
                                <input type="text" value={opt} onChange={e => handleOptionChange(qIndex, oIndex, e.target.value)} placeholder={`Option ${oIndex + 1}`} className="flex-grow p-2 border rounded-md dark:bg-gray-800 dark:border-gray-600" />
                                <button onClick={() => removeOption(qIndex, oIndex)} className="p-1.5 text-gray-500 hover:text-red-500" disabled={q.options.length <= 1}><XIcon className="w-4 h-4"/></button>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => addOption(qIndex)} className="mt-3 text-sm font-semibold text-pink-500 hover:text-pink-600">+ Add Option</button>
                </div>
            ))}
            <button onClick={addQuestion} className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                <PlusCircleIcon className="w-5 h-5" /> Add Question
            </button>
        </div>
    );
};

const LessonEditModal: React.FC<{
  lesson: Lesson;
  isOpen: boolean;
  onClose: () => void;
  onSave: (lesson: Lesson) => void;
}> = ({ lesson: initialLesson, isOpen, onClose, onSave }) => {
    const [lesson, setLesson] = useState(initialLesson);
    useEffect(() => setLesson(initialLesson), [initialLesson]);
    
    const updateField = (field: keyof Lesson | `content.${keyof Lesson['content']}`, value: any) => {
        if (typeof field === 'string' && field.startsWith('content.')) {
            const contentField = field.split('.')[1] as keyof Lesson['content'];
            setLesson(prev => ({ ...prev, content: { ...prev.content, [contentField]: value }}));
        } else {
            setLesson(prev => ({ ...prev, [field]: value as any }));
        }
    };

    const handleTypeChange = (newType: LessonType) => {
        let newContent: Lesson['content'] = {};
        if (newType === LessonType.VIDEO) {
            newContent.videoData = { provider: VideoProvider.YOUTUBE, url: '' };
        } else if (newType === LessonType.QUIZ) {
            newContent.quizData = { questions: [], passingScore: 80 };
        }
        setLesson(prev => ({ ...prev, type: newType, content: newContent }));
    };
    
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl p-6" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-6">Edit Lesson</h2>
                <div className="space-y-4">
                    <input type="text" value={lesson.title} onChange={e => updateField('title', e.target.value)} placeholder="Lesson Title" className="w-full p-2.5 border rounded-md dark:bg-gray-700 dark:border-gray-600"/>
                    <div className="flex items-center gap-4">
                        <select value={lesson.type} onChange={e => handleTypeChange(e.target.value as LessonType)} className="p-2.5 border rounded-md dark:bg-gray-700 dark:border-gray-600 capitalize">
                            {Object.values(LessonType).map(type => <option key={type} value={type} className="capitalize">{type}</option>)}
                        </select>
                        <div className="flex items-center gap-2">
                            <ClockIcon className="w-4 h-4 text-gray-500" />
                            <input type="number" value={lesson.duration} onChange={e => updateField('duration', parseInt(e.target.value) || 0)} placeholder="Duration" className="w-24 p-2.5 border rounded-md dark:bg-gray-700 dark:border-gray-600"/>
                            <span className="text-sm text-gray-500">min</span>
                        </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto p-1">
                        {lesson.type === LessonType.VIDEO && (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Video Provider</label>
                                    <select 
                                        value={lesson.content.videoData?.provider || 'youtube'} 
                                        onChange={e => updateField('content.videoData', { 
                                            ...(lesson.content.videoData || { url: '' }), 
                                            provider: e.target.value as VideoProvider 
                                        })}
                                        className="mt-1 w-full p-2.5 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                                    >
                                        <option value="youtube">YouTube</option>
                                        <option value="vimeo">Vimeo</option>
                                        <option value="self_hosted">Self-Hosted (URL)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Video URL or ID</label>
                                    <input 
                                        type="text" 
                                        value={lesson.content.videoData?.url || ''} 
                                        onChange={e => updateField('content.videoData', { 
                                            ...(lesson.content.videoData || { provider: VideoProvider.YOUTUBE }), 
                                            url: e.target.value 
                                        })} 
                                        placeholder={
                                            lesson.content.videoData?.provider === 'youtube' ? "YouTube Video ID (e.g., dQw4w9WgXcQ)" :
                                            lesson.content.videoData?.provider === 'vimeo' ? "Vimeo Video ID (e.g., 123456789)" :
                                            "Full video URL (e.g., https://.../video.mp4)"
                                        } 
                                        className="mt-1 w-full p-2.5 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                                    />
                                </div>
                            </div>
                        )}
                        {lesson.type === LessonType.TEXT && <RichTextEditor label="Lesson Content" value={lesson.content.text || ''} onChange={val => updateField('content.text', val)} placeholder="Write your lesson content here..." />}
                        {lesson.type === LessonType.PDF && <input type="text" value={lesson.content.pdfUrl || ''} onChange={e => updateField('content.pdfUrl', e.target.value)} placeholder="URL to PDF file" className="w-full p-2.5 border rounded-md dark:bg-gray-700 dark:border-gray-600"/>}
                        {lesson.type === LessonType.QUIZ && <QuizEditor quizData={lesson.content.quizData || { questions: [], passingScore: 80 }} onUpdate={data => updateField('content.quizData', data)} />}
                    </div>
                </div>
                <div className="flex justify-end gap-4 mt-8">
                    <button onClick={onClose} className="px-5 py-2.5 rounded-lg bg-gray-200 dark:bg-gray-600 font-semibold">Cancel</button>
                    <button onClick={() => onSave(lesson)} className="px-5 py-2.5 rounded-lg bg-pink-500 text-white font-semibold">Save Lesson</button>
                </div>
            </div>
        </div>
    );
};

const CourseEditorPage: React.FC<{
  course: Course | null;
  user: User;
  onSave: (course: Course) => void;
  onExit: () => void;
}> = ({ course: initialCourse, user, onSave, onExit }) => {
    const [course, setCourse] = useState<Course>(() => {
        if (initialCourse) return initialCourse;
        
        const newCourseId = crypto.randomUUID();
        const defaultModule: Module = {
            id: crypto.randomUUID(),
            courseId: newCourseId,
            title: 'Module 1: Introduction',
            lessons: [],
            order: 0,
        };

        return {
            id: newCourseId,
            title: '',
            description: '',
            thumbnail: 'https://i.postimg.cc/k4xT4K4B/placeholder-course-thumbnail.png',
            category: 'Technology',
            instructorId: user.id,
            instructorName: `${user.firstName} ${user.lastName}`,
            modules: [defaultModule], // Start with one default module
            totalLessons: 0,
            estimatedDuration: 0,
        };
    });

    const [editingLesson, setEditingLesson] = useState<{ lesson: Lesson, mIndex: number, lIndex: number } | null>(null);
    const dragItem = useRef<any>(null);
    const dragOverItem = useRef<any>(null);

    const updateCourseField = (field: keyof Course, value: any) => setCourse(prev => ({ ...prev, [field]: value }));

    const handleModuleUpdate = (updatedModule: Module, index: number) => {
        const newModules = [...course.modules];
        newModules[index] = updatedModule;
        setCourse(prev => ({ ...prev, modules: newModules }));
    };
    
    const handleModuleDelete = (index: number) => setCourse(prev => ({ ...prev, modules: course.modules.filter((_, i) => i !== index) }));
    const handleAddModule = () => {
        const newModule: Module = { id: crypto.randomUUID(), courseId: course.id, title: `New Module ${course.modules.length + 1}`, lessons: [], order: course.modules.length };
        setCourse(prev => ({ ...prev, modules: [...prev.modules, newModule] }));
    };

    const handleAddLesson = (mIndex: number) => {
        const newLesson: Lesson = { 
            id: crypto.randomUUID(), 
            moduleId: course.modules[mIndex].id, 
            title: `New Lesson`, 
            type: LessonType.VIDEO, 
            content: {
                videoData: { provider: VideoProvider.YOUTUBE, url: '' }
            }, 
            duration: 10, 
            order: course.modules[mIndex].lessons.length 
        };
        setEditingLesson({ lesson: newLesson, mIndex, lIndex: -1 });
    };

    const handleSaveLesson = (updatedLesson: Lesson) => {
        if (!editingLesson) return;
        const { mIndex, lIndex } = editingLesson;
        const newModules = [...course.modules];
        const newLessons = [...newModules[mIndex].lessons];
        if (lIndex > -1) {
            newLessons[lIndex] = updatedLesson;
        } else {
            newLessons.push(updatedLesson);
        }
        newModules[mIndex].lessons = newLessons;
        setCourse(prev => ({ ...prev, modules: newModules }));
        setEditingLesson(null);
    };

    const handleLessonDelete = (mIndex: number, lIndex: number) => {
        const newModules = [...course.modules];
        newModules[mIndex].lessons = newModules[mIndex].lessons.filter((_, i) => i !== lIndex);
        setCourse(prev => ({ ...prev, modules: newModules }));
    }
    
    const handleSave = () => {
        const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
        const totalMinutes = course.modules.reduce((sum, m) => sum + m.lessons.reduce((lSum, l) => lSum + l.duration, 0), 0);

        const finalCourse: Course = {
            ...course,
            totalLessons,
            estimatedDuration: Math.round(totalMinutes / 60),
            modules: course.modules.map((m, mIndex) => ({
                ...m,
                order: mIndex,
                lessons: m.lessons.map((l, lIndex) => ({ ...l, order: lIndex }))
            }))
        };
        onSave(finalCourse);
    };

    const handleDragStart = (e: React.DragEvent, params: any) => { dragItem.current = params; e.dataTransfer.effectAllowed = 'move'; }
    const handleDragEnter = (e: React.DragEvent, params: any) => { dragOverItem.current = params; }
    
    const handleDrop = (e: React.DragEvent) => {
        if (!dragItem.current || !dragOverItem.current) return;
        const { mIndex: dragMIndex, lIndex: dragLIndex } = dragItem.current;
        const { mIndex: overMIndex, lIndex: overLIndex } = dragOverItem.current;
        
        const newModules = [...course.modules];
        // Module Drag
        if (dragLIndex === undefined) {
            const draggedModule = newModules.splice(dragMIndex, 1)[0];
            newModules.splice(overMIndex, 0, draggedModule);
            setCourse(prev => ({...prev, modules: newModules}));
        } 
        // Lesson Drag
        else {
            const draggedLesson = newModules[dragMIndex].lessons.splice(dragLIndex, 1)[0];
            newModules[overMIndex].lessons.splice(overLIndex, 0, draggedLesson);
            setCourse(prev => ({...prev, modules: newModules}));
        }
        dragItem.current = null;
        dragOverItem.current = null;
    };
    
    const lessonIcons: Record<LessonType, React.ReactElement> = {
        [LessonType.VIDEO]: <PlayCircleIcon className="w-5 h-5 text-red-500" />,
        [LessonType.TEXT]: <FileTextIcon className="w-5 h-5 text-blue-500" />,
        [LessonType.PDF]: <FileTextIcon className="w-5 h-5 text-purple-500" />,
        [LessonType.QUIZ]: <ClipboardListIcon className="w-5 h-5 text-green-500" />,
    };

    return (
        <div className="min-h-full bg-gray-50 dark:bg-gray-900">
            <div className="sticky top-0 bg-white dark:bg-gray-800 z-10 shadow-sm border-b dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <div>
                        <button onClick={onExit} className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-pink-500">
                            <ChevronLeftIcon className="w-5 h-5" /> Back to My Courses
                        </button>
                         <h1 className="text-2xl font-bold mt-1">{initialCourse?.id ? 'Edit Course' : 'Create New Course'}</h1>
                    </div>
                    <button onClick={handleSave} className="bg-pink-500 text-white font-bold py-2.5 px-6 rounded-lg hover:bg-pink-600 transition-all">Save Course</button>
                </div>
            </div>
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6"><h2 className="text-xl font-bold mb-4">Course Details</h2><div className="space-y-4"><input type="text" value={course.title} onChange={e => updateCourseField('title', e.target.value)} placeholder="Course Title" className="w-full p-2.5 border rounded-md dark:bg-gray-700 dark:border-gray-600" /><textarea value={course.description} onChange={e => updateCourseField('description', e.target.value)} placeholder="Course Description" rows={4} className="w-full p-2.5 border rounded-md dark:bg-gray-700 dark:border-gray-600" /><input type="text" value={course.category} onChange={e => updateCourseField('category', e.target.value)} placeholder="Category (e.g., Technology)" className="w-full p-2.5 border rounded-md dark:bg-gray-700 dark:border-gray-600" /></div></div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6"><h2 className="text-xl font-bold mb-4">Course Thumbnail</h2><img src={course.thumbnail} alt="Course Thumbnail" className="w-full h-48 object-cover rounded-md mb-4" /><input type="text" value={course.thumbnail} onChange={e => updateCourseField('thumbnail', e.target.value)} placeholder="Image URL" className="w-full p-2.5 border rounded-md dark:bg-gray-700 dark:border-gray-600" /></div>
                </div>

                <div className="lg:col-span-2" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
                     <h2 className="text-xl font-bold mb-4">Course Content</h2>
                     {course.modules.map((module, mIndex) => (
                        <div key={module.id} draggable onDragStart={e => handleDragStart(e, {mIndex})} onDragEnter={e => handleDragEnter(e, {mIndex})} className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 mb-6">
                            <div className="flex items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-t-xl cursor-grab"><GripVerticalIcon className="w-5 h-5 text-gray-400" /><input type="text" value={module.title} onChange={e => handleModuleUpdate({...module, title: e.target.value}, mIndex)} placeholder="Module Title" className="flex-grow font-bold text-lg p-2 bg-transparent focus:outline-none focus:bg-white dark:focus:bg-gray-600 rounded-md"/><button onClick={() => handleModuleDelete(mIndex)} className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400"><Trash2Icon className="w-6 h-6" /></button></div>
                            <div className="p-4 space-y-3">
                                {module.lessons.map((lesson, lIndex) => (
                                    <div key={lesson.id} draggable onDragStart={e => { e.stopPropagation(); handleDragStart(e, {mIndex, lIndex}); }} onDragEnter={e => { e.stopPropagation(); handleDragEnter(e, {mIndex, lIndex}); }} className="bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center p-3 cursor-grab">
                                        <GripVerticalIcon className="w-5 h-5 text-gray-400 flex-shrink-0" /><div className="ml-2 flex-shrink-0">{lessonIcons[lesson.type]}</div><p className="ml-2 font-semibold flex-grow truncate">{lesson.title}</p>
                                        <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                                            <button onClick={() => setEditingLesson({ lesson, mIndex, lIndex })} className="p-1.5 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"><EditIcon className="w-5 h-5" /></button>
                                            <button onClick={() => handleLessonDelete(mIndex, lIndex)} className="p-1.5 text-gray-500 hover:text-red-600 dark:hover:text-red-400"><Trash2Icon className="w-5 h-5" /></button>
                                        </div>
                                    </div>
                                ))}
                                <button onClick={() => handleAddLesson(mIndex)} className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"><PlusCircleIcon className="w-5 h-5" /> Add Lesson</button>
                            </div>
                        </div>
                     ))}
                     <button onClick={handleAddModule} className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 transition-colors"><PlusCircleIcon className="w-6 h-6" /> Add Module</button>
                </div>
            </div>
            {editingLesson && <LessonEditModal isOpen={!!editingLesson} lesson={editingLesson.lesson} onClose={() => setEditingLesson(null)} onSave={handleSaveLesson} />}
        </div>
    );
};


// ====================================================================================
// ===== 4. USER MANAGEMENT PAGE (for Admins)
// ====================================================================================

const UserManagementPage: React.FC<{ allUsers: User[], onRefetchData: () => void, onSaveUserProfile: (updates: Partial<User> & { newPassword?: string }) => Promise<void> }> = ({ allUsers, onRefetchData, onSaveUserProfile }) => {
    const [filterRole, setFilterRole] = useState<Role | 'all'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const filteredUsers = useMemo(() => {
        return allUsers
            .filter(user => filterRole === 'all' || user.role === filterRole)
            .filter(user =>
                `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email.toLowerCase().includes(searchTerm.toLowerCase())
            );
    }, [allUsers, filterRole, searchTerm]);
    
    const handleSaveUser = async (updates: Partial<User>) => {
        if (!editingUser) return;
        await api.updateUserProfile(editingUser.id, updates);
        setEditingUser(null);
        onRefetchData();
    };
    
    const UserEditModal: React.FC<{ user: User, onClose: () => void, onSave: (updates: Partial<User>) => void }> = ({ user, onClose, onSave }) => {
        const [userData, setUserData] = useState(user);
        
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
                    <h2 className="text-xl font-bold mb-4">Edit User: {user.firstName} {user.lastName}</h2>
                    <div className="space-y-4">
                        <input type="text" value={userData.firstName} onChange={e => setUserData({...userData, firstName: e.target.value})} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" />
                        <input type="text" value={userData.lastName} onChange={e => setUserData({...userData, lastName: e.target.value})} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" />
                        <select value={userData.role} onChange={e => setUserData({...userData, role: e.target.value as Role})} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 capitalize">
                           {Object.values(Role).map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
                        </select>
                    </div>
                    <div className="flex justify-end gap-4 mt-6">
                        <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 font-semibold">Cancel</button>
                        <button onClick={() => onSave(userData)} className="px-4 py-2 rounded-lg bg-pink-500 text-white font-semibold">Save</button>
                    </div>
                </div>
            </div>
        )
    };

    return (
         <div className="p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold">User Management</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">View, edit, and manage all users on the platform.</p>

                <div className="my-6 flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-grow">
                        <input type="text" placeholder="Search by name or email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-2.5 pl-10 border rounded-lg dark:bg-gray-700 dark:border-gray-600"/>
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    </div>
                    <select value={filterRole} onChange={e => setFilterRole(e.target.value as Role | 'all')} className="p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 capitalize">
                        <option value="all">All Roles</option>
                        {Object.values(Role).map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
                    </select>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="p-4 font-semibold">Name</th>
                                <th className="p-4 font-semibold">Email</th>
                                <th className="p-4 font-semibold">Role</th>
                                <th className="p-4 font-semibold">Joined</th>
                                <th className="p-4 font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(user => (
                                <tr key={user.id} className="border-t border-gray-200 dark:border-gray-700">
                                    <td className="p-4">{user.firstName} {user.lastName}</td>
                                    <td className="p-4">{user.email}</td>
                                    <td className="p-4"><span className="px-2 py-1 text-xs font-semibold rounded-full bg-pink-100 dark:bg-pink-900/50 text-pink-700 dark:text-pink-300 capitalize">{user.role}</span></td>
                                    <td className="p-4">{new Date(user.createdAt).toLocaleDateString()}</td>
                                    <td className="p-4">
                                        <button onClick={() => setEditingUser(user)} className="p-1.5 text-gray-500 hover:text-blue-600"><EditIcon className="w-5 h-5" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 {editingUser && <UserEditModal user={editingUser} onClose={() => setEditingUser(null)} onSave={handleSaveUser} />}
            </div>
        </div>
    );
};


// ====================================================================================
// ===== 5. STUDENT MANAGEMENT PAGE (for Instructors)
// ====================================================================================
const StudentManagementPage: React.FC<{ user: User, courses: Course[], enrollments: Enrollment[], allUsers: User[] }> = ({ user, courses, enrollments, allUsers }) => {
    const instructorCourses = useMemo(() => courses.filter(c => c.instructorId === user.id), [courses, user.id]);
    const instructorCourseIds = useMemo(() => instructorCourses.map(c => c.id), [instructorCourses]);
    
    const [selectedCourseId, setSelectedCourseId] = useState<string | 'all'>(instructorCourseIds[0] || 'all');

    const students = useMemo(() => {
        const studentEnrollments = enrollments.filter(e => {
            const isInstructorCourse = instructorCourseIds.includes(e.courseId);
            const matchesCourseFilter = selectedCourseId === 'all' || e.courseId === selectedCourseId;
            return isInstructorCourse && matchesCourseFilter;
        });

        const studentData = new Map<string, { user: User, courses: { id: string, title: string, progress: number }[] }>();

        studentEnrollments.forEach(enrollment => {
            const studentUser = allUsers.find(u => u.id === enrollment.userId);
            const course = courses.find(c => c.id === enrollment.courseId);
            if (studentUser && course) {
                if (!studentData.has(studentUser.id)) {
                    studentData.set(studentUser.id, { user: studentUser, courses: [] });
                }
                studentData.get(studentUser.id)!.courses.push({
                    id: course.id,
                    title: course.title,
                    progress: enrollment.progress,
                });
            }
        });
        return Array.from(studentData.values());

    }, [enrollments, instructorCourseIds, selectedCourseId, allUsers, courses]);

    return (
        <div className="p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold">Student Management</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Track the progress of students enrolled in your courses.</p>

                <div className="my-6">
                    <label className="font-semibold mr-2">Filter by Course:</label>
                    <select value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)} className="p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
                        <option value="all">All My Courses</option>
                        {instructorCourses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
                    <div className="grid grid-cols-4 p-4 font-semibold bg-gray-50 dark:bg-gray-700/50">
                        <span>Student</span>
                        <span className="col-span-2">Course Progress</span>
                        <span>Actions</span>
                    </div>
                    {students.map(({ user: student, courses: studentCourses }) => (
                        <div key={student.id} className="grid grid-cols-4 p-4 border-t border-gray-200 dark:border-gray-700 items-center">
                            <div>
                                <p className="font-semibold">{student.firstName} {student.lastName}</p>
                                <p className="text-sm text-gray-500">{student.email}</p>
                            </div>
                            <div className="col-span-2 space-y-2">
                                {studentCourses.map(c => (
                                    <div key={c.id}>
                                        <p className="text-sm font-medium">{c.title}</p>
                                        <ProgressBar progress={c.progress} size="sm" />
                                    </div>
                                ))}
                            </div>
                            <div>
                                <button className="p-2 text-gray-500 hover:text-pink-600"><MessageSquareIcon className="w-5 h-5"/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};


// ====================================================================================
// ===== 6. PLATFORM SETTINGS (for Admins)
// ====================================================================================

const PlatformSettingsPage: React.FC<{}> = () => {
    // This is a placeholder page. In a real app, this would have forms to manage platform settings.
    return (
        <div className="p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold">Platform Settings</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Global configuration for the Nexus LMS.</p>
                <div className="mt-8 p-12 bg-white dark:bg-gray-800 rounded-xl shadow-md text-center">
                    <SettingsIcon className="w-12 h-12 mx-auto text-gray-400" />
                    <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">Settings management interface is under construction.</p>
                </div>
            </div>
        </div>
    );
};

// ====================================================================================
// ===== 7. INBOX PAGE
// ====================================================================================
const InboxPage: React.FC<{ 
    user: User; 
    conversations: Conversation[];
    messages: Message[];
    allUsers: User[];
    onSendMessage: (recipientIds: string[], subject: string, content: string) => Promise<void>;
    onUpdateMessages: (updatedMessages: Message[]) => void;
}> = ({ user, conversations, messages, allUsers, onSendMessage, onUpdateMessages }) => {
    
    const [selectedConvoId, setSelectedConvoId] = useState<string | null>(null);
    const [isComposing, setIsComposing] = useState(false);

    const enrichedConversations = useMemo(() => {
        return conversations.map(convo => {
            const otherParticipantId = convo.participantIds.find(id => id !== user.id);
            const otherParticipant = allUsers.find(u => u.id === otherParticipantId);
            const convoMessages = messages.filter(m => m.conversationId === convo.id).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            const lastMessage = convoMessages[0];
            const unreadCount = convoMessages.filter(m => !m.isRead && m.senderId !== user.id).length;
            return {
                ...convo,
                otherParticipant: otherParticipant || { firstName: 'Unknown', lastName: 'User', id: 'unknown' },
                lastMessage: lastMessage?.content || 'No messages yet.',
                lastMessageTimestamp: lastMessage?.timestamp,
                unreadCount
            };
        }).sort((a,b) => new Date(b.lastMessageTimestamp || 0).getTime() - new Date(a.lastMessageTimestamp || 0).getTime());
    }, [conversations, messages, allUsers, user.id]);

    const selectedConversationMessages = useMemo(() => {
        if (!selectedConvoId) return [];
        return messages.filter(m => m.conversationId === selectedConvoId).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }, [messages, selectedConvoId]);

    const handleSelectConversation = (convoId: string) => {
        setSelectedConvoId(convoId);
        setIsComposing(false);
        // Mark messages as read
        const updatedMessages = messages.map(m => 
            (m.conversationId === convoId && m.senderId !== user.id) ? { ...m, isRead: true } : m
        );
        onUpdateMessages(updatedMessages);
        
        // Update in DB as well
        supabase.from('messages')
            .update({ is_read: true })
            .eq('conversation_id', convoId)
            .neq('sender_id', user.id)
            .then(({ error }) => { if (error) console.error("Error marking messages as read:", error); });
    };

    const ComposeMessage: React.FC = () => {
        const [recipient, setRecipient] = useState('');
        const [subject, setSubject] = useState('');
        const [content, setContent] = useState('');

        const handleSend = async () => {
            const recipientUser = allUsers.find(u => u.email === recipient);
            if (!recipientUser) {
                alert("Recipient not found");
                return;
            }
            await onSendMessage([recipientUser.id], subject, content);
            setIsComposing(false);
        };
        
        return (
            <div className="p-4">
                 <h3 className="text-xl font-bold">New Message</h3>
                 <input type="email" placeholder="Recipient Email" value={recipient} onChange={e => setRecipient(e.target.value)} className="w-full mt-4 p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                 <input type="text" placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} className="w-full mt-2 p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                 <textarea placeholder="Your message..." value={content} onChange={e => setContent(e.target.value)} rows={10} className="w-full mt-2 p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                 <button onClick={handleSend} className="mt-4 bg-pink-500 text-white font-semibold px-4 py-2 rounded-lg">Send</button>
            </div>
        )
    };
    
    const ConversationView: React.FC<{ convo: typeof enrichedConversations[0] }> = ({ convo }) => {
        const [reply, setReply] = useState('');
        const messagesEndRef = useRef<HTMLDivElement>(null);
        useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [selectedConversationMessages]);

        const handleReply = async () => {
            if (!reply.trim()) return;
            await onSendMessage([convo.otherParticipant.id], '', reply);
            setReply('');
        };
        
        return (
            <div className="h-full flex flex-col">
                <div className="p-4 border-b dark:border-gray-700 flex-shrink-0">
                    <h3 className="font-bold">{convo.otherParticipant.firstName} {convo.otherParticipant.lastName}</h3>
                </div>
                <div className="flex-grow p-4 overflow-y-auto space-y-4">
                    {selectedConversationMessages.map(msg => {
                        const isSender = msg.senderId === user.id;
                        const sender = isSender ? user : convo.otherParticipant;
                        return (
                            <div key={msg.id} className={`flex gap-3 ${isSender ? 'flex-row-reverse' : ''}`}>
                                <UserCircleIcon className="w-8 h-8 text-gray-400 flex-shrink-0" />
                                <div className={`p-3 rounded-lg max-w-md ${isSender ? 'bg-pink-500 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>
                                    <p>{msg.content}</p>
                                    <p className={`text-xs mt-2 ${isSender ? 'text-white/70' : 'text-gray-500'}`}>{new Date(msg.timestamp).toLocaleTimeString()}</p>
                                </div>
                            </div>
                        )
                    })}
                    <div ref={messagesEndRef} />
                </div>
                <div className="p-4 border-t dark:border-gray-700 flex gap-2 flex-shrink-0">
                    <input type="text" placeholder="Type your reply..." value={reply} onChange={e => setReply(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleReply()} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                    <button onClick={handleReply} className="bg-pink-500 text-white p-2 rounded-lg"><SendIcon className="w-5 h-5"/></button>
                </div>
            </div>
        );
    };

    const selectedConvo = enrichedConversations.find(c => c.id === selectedConvoId);

    return (
        <div className="h-full flex">
            <div className="w-1/3 border-r dark:border-gray-700 flex flex-col">
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold">Inbox</h2>
                    <button onClick={() => setIsComposing(true)} className="p-2 text-pink-500 hover:bg-pink-100 rounded-full"><EditIcon className="w-6 h-6"/></button>
                </div>
                <div className="overflow-y-auto">
                    {enrichedConversations.map(convo => (
                        <div key={convo.id} onClick={() => handleSelectConversation(convo.id)} className={`p-4 border-b dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 ${selectedConvoId === convo.id ? 'bg-pink-50 dark:bg-pink-900/30' : ''}`}>
                            <div className="flex justify-between items-center">
                                <p className="font-semibold">{convo.otherParticipant.firstName} {convo.otherParticipant.lastName}</p>
                                {convo.unreadCount > 0 && <span className="text-xs font-bold bg-pink-500 text-white rounded-full px-2 py-0.5">{convo.unreadCount}</span>}
                            </div>
                            <p className="text-sm text-gray-500 truncate">{convo.lastMessage}</p>
                        </div>
                    ))}
                </div>
            </div>
            <div className="w-2/3">
                {isComposing ? <ComposeMessage /> : selectedConvo ? <ConversationView convo={selectedConvo} /> : 
                <div className="h-full flex items-center justify-center text-gray-500">Select a conversation or compose a new message.</div>
                }
            </div>
        </div>
    );
};

// ====================================================================================
// ===== 8. PROFILE PAGE
// ====================================================================================

const ProfilePage: React.FC<{ user: User, onSaveUserProfile: (updates: Partial<User> & { newPassword?: string }) => Promise<void> }> = ({ user, onSaveUserProfile }) => {
    const [profile, setProfile] = useState(user);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    const handleSave = () => {
        const updates: Partial<User> & { newPassword?: string } = {};
        if (profile.firstName !== user.firstName) updates.firstName = profile.firstName;
        if (profile.lastName !== user.lastName) updates.lastName = profile.lastName;
        if (profile.bio !== user.bio) updates.bio = profile.bio;
        if (profile.company !== user.company) updates.company = profile.company;

        if (newPassword) {
            if (newPassword !== confirmPassword) {
                alert("Passwords do not match.");
                return;
            }
            updates.newPassword = newPassword;
        }

        onSaveUserProfile(updates);
        setIsEditing(false);
    };

    return (
        <div className="p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold">My Profile</h1>
                    {!isEditing ? (
                        <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 bg-blue-500 text-white font-semibold px-4 py-2 rounded-lg"><EditIcon className="w-5 h-5"/> Edit Profile</button>
                    ) : (
                        <div className="flex gap-2">
                             <button onClick={() => { setIsEditing(false); setProfile(user); }} className="bg-gray-200 dark:bg-gray-600 font-semibold px-4 py-2 rounded-lg">Cancel</button>
                             <button onClick={handleSave} className="bg-pink-500 text-white font-semibold px-4 py-2 rounded-lg">Save Changes</button>
                        </div>
                    )}
                </div>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-1 text-center bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                        <UserCircleIcon className="w-32 h-32 mx-auto text-pink-500" />
                        <h2 className="text-2xl font-bold mt-4">{profile.firstName} {profile.lastName}</h2>
                        <p className="text-pink-500 font-semibold capitalize">{profile.role}</p>
                    </div>
                    <div className="md:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                        <h3 className="text-xl font-bold mb-4">Personal Information</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="font-semibold">First Name</label><input type="text" value={profile.firstName} onChange={e => setProfile({...profile, firstName: e.target.value})} disabled={!isEditing} className="w-full mt-1 p-2 border rounded dark:bg-gray-700 disabled:bg-gray-100 dark:disabled:bg-gray-700/50" /></div>
                                <div><label className="font-semibold">Last Name</label><input type="text" value={profile.lastName} onChange={e => setProfile({...profile, lastName: e.target.value})} disabled={!isEditing} className="w-full mt-1 p-2 border rounded dark:bg-gray-700 disabled:bg-gray-100 dark:disabled:bg-gray-700/50" /></div>
                            </div>
                             <div><label className="font-semibold">Email</label><input type="email" value={profile.email} disabled className="w-full mt-1 p-2 border rounded bg-gray-100 dark:bg-gray-700/50" /></div>
                             <div><label className="font-semibold">Company</label><input type="text" value={profile.company || ''} onChange={e => setProfile({...profile, company: e.target.value})} disabled={!isEditing} className="w-full mt-1 p-2 border rounded dark:bg-gray-700 disabled:bg-gray-100 dark:disabled:bg-gray-700/50" /></div>
                             <div><label className="font-semibold">Bio</label><textarea value={profile.bio || ''} onChange={e => setProfile({...profile, bio: e.target.value})} disabled={!isEditing} rows={3} className="w-full mt-1 p-2 border rounded dark:bg-gray-700 disabled:bg-gray-100 dark:disabled:bg-gray-700/50" /></div>
                        </div>
                        {isEditing && (
                            <div className="mt-6 pt-6 border-t dark:border-gray-700">
                                <h3 className="text-xl font-bold mb-4">Change Password</h3>
                                <div className="space-y-4">
                                    <input type="password" placeholder="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700" />
                                    <input type="password" placeholder="Confirm New Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};


// ====================================================================================
// ===== CALENDAR, HISTORY, SESSIONS, ANALYTICS (Placeholders or Simple Versions)
// ====================================================================================
const CalendarPage: React.FC<{ user: User, calendarEvents: CalendarEvent[] }> = ({ user, calendarEvents }) => {
    // Basic list view of calendar events
    return (
        <div className="p-4 md:p-8">
            <h1 className="text-3xl font-bold">My Calendar</h1>
            <p className="text-gray-500 mt-1">Deadlines, assignments, and live sessions.</p>
            <div className="mt-8 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <ul className="space-y-4">
                    {calendarEvents.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(event => (
                        <li key={event.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex items-center gap-4">
                            <div className="text-center w-16">
                                <p className="font-bold text-pink-500 text-lg">{new Date(event.date).toLocaleDateString('en-US', { day: 'numeric' })}</p>
                                <p className="text-sm">{new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}</p>
                            </div>
                            <div>
                                <p className="font-semibold">{event.title}</p>
                                <p className="text-sm text-gray-500 capitalize">{event.type.replace('_', ' ')}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

const HistoryPage: React.FC<{ user: User, historyLogs: HistoryLog[] }> = ({ user, historyLogs }) => {
    const actionIcons: Record<HistoryAction, React.ReactNode> = {
        course_enrolled: <PlusCircleIcon className="w-5 h-5 text-blue-500" />,
        lesson_completed: <CheckCircle2Icon className="w-5 h-5 text-green-500" />,
        quiz_passed: <AwardIcon className="w-5 h-5 text-amber-500" />,
        certificate_earned: <AwardIcon className="w-5 h-5 text-pink-500" />,
        discussion_posted: <MessageSquareIcon className="w-5 h-5 text-purple-500" />,
    };
    return (
        <div className="p-4 md:p-8">
            <h1 className="text-3xl font-bold">My History</h1>
            <p className="text-gray-500 mt-1">A log of your recent activity on the platform.</p>
            <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-md">
                <ul className="divide-y dark:divide-gray-700">
                    {historyLogs.map(log => (
                        <li key={log.id} className="p-4 flex items-center gap-4">
                            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full">{actionIcons[log.action]}</div>
                            <div className="flex-grow">
                                <p><span className="font-semibold capitalize">{log.action.replace('_', ' ')}</span>: {log.targetName}</p>
                            </div>
                            <p className="text-sm text-gray-500">{new Date(log.timestamp).toLocaleString()}</p>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

const LiveSessionsPage: React.FC<{ user: User, liveSessions: LiveSession[], onScheduleSession: (session: Omit<LiveSession, 'id'>) => Promise<void>, onDeleteSession: (id: string) => Promise<void> }> = ({ user, liveSessions, onScheduleSession, onDeleteSession }) => {
    const [isScheduling, setIsScheduling] = useState(false);
    
    const SessionModal: React.FC = () => {
        const [title, setTitle] = useState('');
        const [dateTime, setDateTime] = useState('');
        const [duration, setDuration] = useState(60);

        const handleSchedule = () => {
            const sessionData = {
                title, 
                description: '',
                dateTime: new Date(dateTime).toISOString(),
                duration,
                instructorId: user.id,
                audience: 'all' // Simplified for now
            };
            onScheduleSession(sessionData);
            setIsScheduling(false);
        };
        return (
             <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                 <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-lg">
                     <h2 className="text-xl font-bold mb-4">Schedule New Session</h2>
                     <div className="space-y-4">
                        <input type="text" placeholder="Session Title" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                        <input type="datetime-local" value={dateTime} onChange={e => setDateTime(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                        <input type="number" placeholder="Duration (minutes)" value={duration} onChange={e => setDuration(parseInt(e.target.value) || 60)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                     </div>
                     <div className="flex justify-end gap-2 mt-6">
                        <button onClick={() => setIsScheduling(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg font-semibold">Cancel</button>
                        <button onClick={handleSchedule} className="px-4 py-2 bg-pink-500 text-white rounded-lg font-semibold">Schedule</button>
                     </div>
                 </div>
            </div>
        );
    };

    return (
        <div className="p-4 md:p-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Live Sessions</h1>
                    <p className="text-gray-500 mt-1">Join upcoming live events or schedule new ones.</p>
                </div>
                {user.role !== Role.STUDENT && (
                    <button onClick={() => setIsScheduling(true)} className="flex items-center gap-2 bg-pink-500 text-white font-semibold px-4 py-2 rounded-lg"><PlusCircleIcon className="w-5 h-5"/> Schedule Session</button>
                )}
            </div>
             <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {liveSessions.map(session => (
                    <div key={session.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                        <h3 className="text-lg font-bold">{session.title}</h3>
                        <p className="text-sm text-gray-500">{new Date(session.dateTime).toLocaleString()}</p>
                        <p className="mt-2 text-sm">Duration: {session.duration} minutes</p>
                        <div className="flex justify-end mt-4 gap-2">
                            {user.id === session.instructorId && <button onClick={() => onDeleteSession(session.id)} className="p-2 text-red-500"><Trash2Icon className="w-5 h-5"/></button>}
                             <button className="px-4 py-2 bg-green-500 text-white text-sm font-semibold rounded-lg">Join Now</button>
                        </div>
                    </div>
                ))}
            </div>
            {isScheduling && <SessionModal />}
        </div>
    )
};

const AnalyticsPage: React.FC<{ user: User, courses: Course[], enrollments: Enrollment[], allUsers: User[] }> = ({ user, courses, enrollments, allUsers }) => {
    // Analytics are simplified for this component, re-using dashboard logic
    const isInstructor = user.role === Role.INSTRUCTOR;
    const instructorCourses = courses.filter(c => c.instructorId === user.id);
    const instructorCourseIds = instructorCourses.map(c => c.id);
    const instructorEnrollments = enrollments.filter(e => instructorCourseIds.includes(e.courseId));
    
    return (
        <div className="p-4 md:p-8">
            <h1 className="text-3xl font-bold">Analytics</h1>
            <p className="text-gray-500 mt-1">Performance and engagement metrics.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                {isInstructor ? (
                    <>
                        <StatCard icon={<UsersIcon className="w-8 h-8" />} value={new Set(instructorEnrollments.map(e => e.userId)).size} label="Total Students" color="from-cyan-500 to-blue-500" />
                        <StatCard icon={<BookOpenIcon className="w-8 h-8" />} value={instructorCourses.length} label="Your Courses" color="from-pink-500 to-rose-500" />
                        <StatCard icon={<BarChart2Icon className="w-8 h-8" />} value={`${Math.round(instructorEnrollments.reduce((a,b)=> a + b.progress, 0) / (instructorEnrollments.length || 1))}%`} label="Avg. Completion" color="from-amber-500 to-orange-500" />
                    </>
                ) : ( // Admin view
                    <>
                        <StatCard icon={<UsersIcon className="w-8 h-8" />} value={allUsers.length} label="Total Users" color="from-blue-600 to-violet-600" />
                        <StatCard icon={<BookOpenIcon className="w-8 h-8" />} value={courses.length} label="Total Courses" color="from-pink-500 to-rose-500" />
                        <StatCard icon={<BarChart2Icon className="w-8 h-8" />} value={enrollments.length.toLocaleString()} label="Total Enrollments" color="from-teal-400 to-cyan-600" />
                    </>
                )}
            </div>
             <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md">
                    <h3 className="text-xl font-bold">Engagement Over Time</h3>
                    <SimpleBarChart data={[{name: 'Jan', value: 120}, {name: 'Feb', value: 240}, {name: 'Mar', value: 180}, {name: 'Apr', value: 350}]} color="var(--brand-purple)" />
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md">
                     <h3 className="text-xl font-bold">Popular Courses</h3>
                     <SimpleBarChart data={courses.slice(0, 4).map(c => ({ name: c.title, value: enrollments.filter(e => e.courseId === c.id).length }))} color="var(--brand-pink)" />
                </div>
            </div>
        </div>
    );
};


// ====================================================================================
// ===== 9. MAIN EXPORTED COMPONENT (The Router)
// ====================================================================================

// FIX: Renamed from ManagementPagesProps as it's the main props for the component.
interface ManagementPagesProps {
  // FIX: This type is now correctly imported.
  // FIX: Allow 'course-editor' view. The component's props are set up to handle it, and App.tsx calls it with this view.
  view: Exclude<View, 'player' | 'dashboard'>;
  user: User;
  courses: Course[];
  enrollments: Enrollment[];
  allUsers: User[];
  conversations: Conversation[];
  messages: Message[];
  calendarEvents: CalendarEvent[];
  historyLogs: HistoryLog[];
  liveSessions: LiveSession[];
  onSelectCourse: (course: Course) => void;
  onEditCourse: (course: Course | null) => void;
  courseToEdit?: Course | null; // For course editor
  onSave?: (course: Course) => void; // For course editor
  onExit?: () => void; // For course editor
  onRefetchData: () => void;
  onSendMessage: (recipientIds: string[], subject: string, content: string) => Promise<void>;
  onUpdateMessages: (updatedMessages: Message[]) => void;
  onScheduleSession: (session: Omit<LiveSession, 'id'>) => Promise<void>;
  onDeleteSession: (sessionId: string) => Promise<void>;
  onSaveUserProfile: (updates: Partial<User> & { newPassword?: string }) => Promise<void>;
}


// FIX: This component was missing its export statement.
export const ManagementPages: React.FC<ManagementPagesProps> = ({ view, ...props }) => {
    switch (view) {
        case 'certifications':
            return <CertificationsPage user={props.user} courses={props.courses} enrollments={props.enrollments} />;
        case 'my-courses':
            return <MyCoursesPage user={props.user} courses={props.courses} onEditCourse={props.onEditCourse} onSelectCourse={props.onSelectCourse} />;
        // FIX: The case for 'course-editor' was incorrectly removed. It is re-added here to match the logic in App.tsx.
        case 'course-editor':
           return <CourseEditorPage course={props.courseToEdit || null} user={props.user} onSave={props.onSave!} onExit={props.onExit!} />;
        case 'user-management':
            return <UserManagementPage allUsers={props.allUsers} onRefetchData={props.onRefetchData} onSaveUserProfile={props.onSaveUserProfile} />;
        case 'student-management':
            return <StudentManagementPage user={props.user} courses={props.courses} enrollments={props.enrollments} allUsers={props.allUsers} />;
        case 'platform-settings':
            return <PlatformSettingsPage />;
        case 'inbox':
            return <InboxPage user={props.user} conversations={props.conversations} messages={props.messages} allUsers={props.allUsers} onSendMessage={props.onSendMessage} onUpdateMessages={props.onUpdateMessages} />;
        case 'profile':
            return <ProfilePage user={props.user} onSaveUserProfile={props.onSaveUserProfile} />;
        case 'calendar':
            return <CalendarPage user={props.user} calendarEvents={props.calendarEvents} />;
        case 'history':
            return <HistoryPage user={props.user} historyLogs={props.historyLogs} />;
        case 'live-sessions':
            return <LiveSessionsPage user={props.user} liveSessions={props.liveSessions} onScheduleSession={props.onScheduleSession} onDeleteSession={props.onDeleteSession} />;
        case 'analytics':
             return <AnalyticsPage user={props.user} courses={props.courses} enrollments={props.enrollments} allUsers={props.allUsers} />;
        case 'help':
             return <HelpPage user={props.user} />;
        default:
            return <div className="p-8"><h2>Unknown view: {view}</h2><p>Please select a page from the sidebar.</p></div>;
    }
};