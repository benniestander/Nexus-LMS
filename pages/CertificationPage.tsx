import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Course, Enrollment, User, Role, Lesson, Module, LessonType, Question, QuizData, Conversation, Message, CalendarEvent, HistoryLog, HistoryAction, LiveSession } from '../types';
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
// ===== 3. COURSE EDITOR (for Instructors/Admins)
// ====================================================================================

const LessonEditor: React.FC<{ lesson: Lesson; onUpdate: (updatedLesson: Lesson) => void; onDelete: () => void; }> = ({ lesson, onUpdate, onDelete }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const updateField = (field: keyof Lesson | `content.${keyof Lesson['content']}`, value: any) => {
        if (typeof field === 'string' && field.startsWith('content.')) {
            const contentField = field.split('.')[1] as keyof Lesson['content'];
            onUpdate({ ...lesson, content: { ...lesson.content, [contentField]: value } });
        } else {
            onUpdate({ ...lesson, [field]: value });
        }
    };
    
    const lessonIcons: Record<LessonType, React.ReactElement> = {
        [LessonType.VIDEO]: <PlayCircleIcon className="w-5 h-5 text-red-500" />,
        [LessonType.TEXT]: <FileTextIcon className="w-5 h-5 text-blue-500" />,
        [LessonType.PDF]: <FileTextIcon className="w-5 h-5 text-purple-500" />,
        [LessonType.QUIZ]: <ClipboardListIcon className="w-5 h-5 text-green-500" />,
    };

    return (
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center p-3">
                 <GripVerticalIcon className="w-5 h-5 text-gray-400 cursor-grab flex-shrink-0" />
                 <div className="ml-2 flex-shrink-0">{lessonIcons[lesson.type]}</div>
                 <p className="ml-2 font-semibold flex-grow truncate">{lesson.title || "New Lesson"}</p>
                 <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                     <button onClick={() => setIsExpanded(!isExpanded)} className="p-1.5 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400">
                        {isExpanded ? <ChevronUpIcon className="w-5 h-5" /> : <EditIcon className="w-5 h-5" />}
                    </button>
                    <button onClick={onDelete} className="p-1.5 text-gray-500 hover:text-red-600 dark:hover:text-red-400">
                        <Trash2Icon className="w-5 h-5" />
                    </button>
                 </div>
            </div>
            {isExpanded && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
                    <input type="text" value={lesson.title} onChange={e => updateField('title', e.target.value)} placeholder="Lesson Title" className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"/>
                    <div className="flex items-center gap-4">
                        <select value={lesson.type} onChange={e => updateField('type', e.target.value as LessonType)} className="p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600">
                            {Object.values(LessonType).map(type => <option key={type} value={type} className="capitalize">{type}</option>)}
                        </select>
                        <div className="flex items-center gap-2">
                            <ClockIcon className="w-4 h-4 text-gray-500" />
                            <input type="number" value={lesson.duration} onChange={e => updateField('duration', parseInt(e.target.value) || 0)} placeholder="Duration (min)" className="w-24 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"/>
                             <span className="text-sm text-gray-500">min</span>
                        </div>
                    </div>
                    {lesson.type === LessonType.VIDEO && <input type="text" value={lesson.content.videoId || ''} onChange={e => updateField('content.videoId', e.target.value)} placeholder="YouTube Video ID" className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"/>}
                    {lesson.type === LessonType.TEXT && <textarea value={lesson.content.text || ''} onChange={e => updateField('content.text', e.target.value)} placeholder="Lesson text content..." rows={5} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"/>}
                    {lesson.type === LessonType.PDF && <input type="text" value={lesson.content.pdfUrl || ''} onChange={e => updateField('content.pdfUrl', e.target.value)} placeholder="PDF URL" className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"/>}
                    {lesson.type === LessonType.QUIZ && <p className="text-sm text-center text-gray-500 p-4 bg-gray-100 dark:bg-gray-800 rounded-md">Quiz questions are managed in the dedicated Quiz Builder (coming soon).</p>}
                </div>
            )}
        </div>
    );
};

const ModuleEditor: React.FC<{ module: Module; onUpdate: (updatedModule: Module) => void; onDelete: () => void; }> = ({ module, onUpdate, onDelete }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    
    const updateTitle = (title: string) => onUpdate({ ...module, title });

    const handleLessonUpdate = (updatedLesson: Lesson, index: number) => {
        const newLessons = [...module.lessons];
        newLessons[index] = updatedLesson;
        onUpdate({ ...module, lessons: newLessons });
    };

    const handleLessonDelete = (index: number) => {
        const newLessons = module.lessons.filter((_, i) => i !== index);
        onUpdate({ ...module, lessons: newLessons });
    };

    const handleAddLesson = () => {
        const newLesson: Lesson = {
            id: crypto.randomUUID(),
            moduleId: module.id,
            title: `New Lesson ${module.lessons.length + 1}`,
            type: LessonType.VIDEO,
            content: {},
            duration: 10,
            order: module.lessons.length
        };
        onUpdate({ ...module, lessons: [...module.lessons, newLesson] });
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 mb-6">
            <div className="flex items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-t-xl">
                <GripVerticalIcon className="w-5 h-5 text-gray-400 cursor-grab" />
                <input 
                    type="text"
                    value={module.title}
                    onChange={e => updateTitle(e.target.value)}
                    placeholder="Module Title"
                    className="flex-grow font-bold text-lg p-2 bg-transparent focus:outline-none focus:bg-white dark:focus:bg-gray-600 rounded-md"
                />
                 <button onClick={() => setIsExpanded(!isExpanded)} className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400">
                    {isExpanded ? <ChevronUpIcon className="w-6 h-6" /> : <ChevronDownIcon className="w-6 h-6" />}
                </button>
                <button onClick={onDelete} className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400">
                    <Trash2Icon className="w-6 h-6" />
                </button>
            </div>
            {isExpanded && (
                <div className="p-4 space-y-3">
                    {module.lessons.map((lesson, index) => (
                        <LessonEditor 
                            key={lesson.id}
                            lesson={lesson}
                            onUpdate={(updated) => handleLessonUpdate(updated, index)}
                            onDelete={() => handleLessonDelete(index)}
                        />
                    ))}
                    <button onClick={handleAddLesson} className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                        <PlusCircleIcon className="w-5 h-5" />
                        Add Lesson
                    </button>
                </div>
            )}
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
        // Default for a new course
        return {
            id: crypto.randomUUID(),
            title: '',
            description: '',
            thumbnail: 'https://i.postimg.cc/k4xT4K4B/placeholder-course-thumbnail.png',
            category: 'Technology',
            instructorId: user.id,
            instructorName: `${user.firstName} ${user.lastName}`,
            modules: [],
            totalLessons: 0,
            estimatedDuration: 0,
        };
    });

    const updateCourseField = (field: keyof Course, value: any) => {
        setCourse(prev => ({ ...prev, [field]: value }));
    };

    const handleModuleUpdate = (updatedModule: Module, index: number) => {
        const newModules = [...course.modules];
        newModules[index] = updatedModule;
        setCourse(prev => ({ ...prev, modules: newModules }));
    };
    
    const handleModuleDelete = (index: number) => {
        const newModules = course.modules.filter((_, i) => i !== index);
        setCourse(prev => ({ ...prev, modules: newModules }));
    };

    const handleAddModule = () => {
        const newModule: Module = {
            id: crypto.randomUUID(),
            courseId: course.id,
            title: `New Module ${course.modules.length + 1}`,
            lessons: [],
            order: course.modules.length,
        };
        setCourse(prev => ({ ...prev, modules: [...prev.modules, newModule] }));
    };
    
    const handleSave = () => {
        // Recalculate order before saving
        const finalCourse: Course = {
            ...course,
            modules: course.modules.map((m, mIndex) => ({
                ...m,
                order: mIndex,
                lessons: m.lessons.map((l, lIndex) => ({
                    ...l,
                    order: lIndex,
                }))
            }))
        };
        onSave(finalCourse);
    };

    return (
        <div className="min-h-full bg-gray-50 dark:bg-gray-900">
            <div className="sticky top-0 bg-white dark:bg-gray-800 z-10 shadow-sm border-b dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <div>
                        <button onClick={onExit} className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-pink-500">
                            <ChevronLeftIcon className="w-5 h-5" />
                            Back to My Courses
                        </button>
                         <h1 className="text-2xl font-bold mt-1">{initialCourse ? 'Edit Course' : 'Create New Course'}</h1>
                    </div>
                    <button onClick={handleSave} className="bg-pink-500 text-white font-bold py-2.5 px-6 rounded-lg hover:bg-pink-600 transition-all">
                        Save Course
                    </button>
                </div>
            </div>
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Course Details */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
                        <h2 className="text-xl font-bold mb-4">Course Details</h2>
                        <div className="space-y-4">
                            <input type="text" value={course.title} onChange={e => updateCourseField('title', e.target.value)} placeholder="Course Title" className="w-full p-2.5 border rounded-md dark:bg-gray-700 dark:border-gray-600" />
                            <textarea value={course.description} onChange={e => updateCourseField('description', e.target.value)} placeholder="Course Description" rows={4} className="w-full p-2.5 border rounded-md dark:bg-gray-700 dark:border-gray-600" />
                            <input type="text" value={course.category} onChange={e => updateCourseField('category', e.target.value)} placeholder="Category (e.g., Technology)" className="w-full p-2.5 border rounded-md dark:bg-gray-700 dark:border-gray-600" />
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
                        <h2 className="text-xl font-bold mb-4">Course Thumbnail</h2>
                        <img src={course.thumbnail} alt="Course Thumbnail" className="w-full h-48 object-cover rounded-md mb-4" />
                        <input type="text" value={course.thumbnail} onChange={e => updateCourseField('thumbnail', e.target.value)} placeholder="Image URL" className="w-full p-2.5 border rounded-md dark:bg-gray-700 dark:border-gray-600" />
                    </div>
                </div>

                {/* Right Column: Modules and Lessons */}
                <div className="lg:col-span-2">
                     <h2 className="text-xl font-bold mb-4">Course Content</h2>
                     {course.modules.map((module, index) => (
                        <ModuleEditor 
                            key={module.id}
                            module={module}
                            onUpdate={(updated) => handleModuleUpdate(updated, index)}
                            onDelete={() => handleModuleDelete(index)}
                        />
                     ))}
                     <button onClick={handleAddModule} className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 transition-colors">
                        <PlusCircleIcon className="w-6 h-6" />
                        Add Module
                    </button>
                </div>
            </div>
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

        const studentData = new Map<string, { user: User, courses: { title: string, progress: number }[] }>();

        studentEnrollments.forEach(enrollment => {
            const studentUser = allUsers.find(u => u.id === enrollment.userId);
            const course = courses.find(c => c.id === enrollment.courseId);
            if (studentUser && course) {
                if (!studentData.has(studentUser.id)) {
                    studentData.set(studentUser.id, { user: studentUser, courses: [] });
                }
                studentData.get(studentUser.id)!.courses.push({
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
                                    <div key={c.title}>
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
// ===== 7. INBOX/MESSAGING (for all roles)
// ====================================================================================

const InboxPage: React.FC<{
    user: User,
    conversations: Conversation[],
    messages: Message[],
    allUsers: User[],
    onSendMessage: (recipientIds: string[], subject: string, content: string) => void;
    onUpdateMessages: (messages: Message[]) => void;
}> = ({ user, conversations, messages, allUsers, onSendMessage, onUpdateMessages }) => {
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [isComposing, setIsComposing] = useState(false);
    
    const getParticipant = (convo: Conversation) => {
        const otherId = convo.participantIds.find(id => id !== user.id);
        return allUsers.find(u => u.id === otherId);
    };

    const sortedConversations = useMemo(() => {
        return [...conversations].sort((a, b) => new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime());
    }, [conversations]);
    
    const selectedConversationMessages = useMemo(() => {
        if (!selectedConversationId) return [];
        return messages.filter(m => m.conversationId === selectedConversationId).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }, [messages, selectedConversationId]);
    
    const handleSelectConversation = (convoId: string) => {
        setSelectedConversationId(convoId);
        setIsComposing(false);
        // Mark messages as read
        const updatedMessages = messages.map(m =>
            m.conversationId === convoId && m.senderId !== user.id && !m.isRead ? { ...m, isRead: true } : m
        );
        onUpdateMessages(updatedMessages);
        // FIX: Use the imported supabase client directly
        supabase.from('messages').update({ is_read: true }).eq('conversation_id', convoId).neq('sender_id', user.id);
    };
    
    const ComposeView: React.FC<{ onClose: () => void }> = ({ onClose }) => {
        const [recipientId, setRecipientId] = useState('');
        const [subject, setSubject] =useState('');
        const [content, setContent] = useState('');
        
        const handleSend = () => {
            if (recipientId && content) {
                onSendMessage([recipientId], subject, content);
                onClose();
            }
        };

        return (
             <div className="p-4 h-full flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">New Message</h3>
                    <button onClick={onClose}><XIcon className="w-6 h-6"/></button>
                </div>
                 <select value={recipientId} onChange={e => setRecipientId(e.target.value)} className="w-full p-2 border rounded-md mb-2 dark:bg-gray-700 dark:border-gray-600">
                    <option value="">Select a recipient</option>
                    {allUsers.filter(u => u.id !== user.id).map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.role})</option>)}
                </select>
                <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject" className="w-full p-2 border rounded-md mb-2 dark:bg-gray-700 dark:border-gray-600"/>
                <textarea value={content} onChange={e => setContent(e.target.value)} rows={10} placeholder="Your message..." className="w-full p-2 border rounded-md flex-grow dark:bg-gray-700 dark:border-gray-600"/>
                <button onClick={handleSend} className="mt-4 bg-pink-500 text-white font-semibold py-2 px-4 rounded-lg">Send</button>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col">
            <div className="p-4 md:p-6 border-b dark:border-gray-700">
                <h1 className="text-3xl font-bold">Inbox</h1>
            </div>
            <div className="flex-grow flex min-h-0">
                <aside className="w-1/3 border-r dark:border-gray-700 flex flex-col">
                    <div className="p-4 border-b dark:border-gray-700">
                        <button onClick={() => { setIsComposing(true); setSelectedConversationId(null); }} className="w-full bg-pink-500 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2">
                           <EditIcon className="w-5 h-5"/> New Message
                        </button>
                    </div>
                    <div className="overflow-y-auto">
                        {sortedConversations.map(convo => {
                            const participant = getParticipant(convo);
                            const lastMessage = messages.filter(m => m.conversationId === convo.id).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
                            const unreadCount = messages.filter(m => m.conversationId === convo.id && !m.isRead && m.senderId !== user.id).length;
                            return (
                                <div key={convo.id} onClick={() => handleSelectConversation(convo.id)} className={`p-4 cursor-pointer border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${selectedConversationId === convo.id ? 'bg-pink-50 dark:bg-pink-900/30' : ''}`}>
                                    <div className="flex justify-between items-center">
                                        <p className="font-bold">{participant ? `${participant.firstName} ${participant.lastName}` : 'Unknown User'}</p>
                                        {unreadCount > 0 && <span className="text-xs font-bold bg-pink-500 text-white rounded-full px-2 py-0.5">{unreadCount}</span>}
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{lastMessage?.subject}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{lastMessage?.content}</p>
                                </div>
                            );
                        })}
                    </div>
                </aside>
                <main className="w-2/3 flex flex-col">
                    {isComposing ? <ComposeView onClose={() => setIsComposing(false)} /> : selectedConversationId ? (
                        <div className="flex-grow flex flex-col h-full">
                            <div className="p-4 border-b dark:border-gray-700">
                                <h2 className="text-xl font-bold">{getParticipant(conversations.find(c=>c.id === selectedConversationId)!)?.firstName} {getParticipant(conversations.find(c=>c.id === selectedConversationId)!)?.lastName}</h2>
                            </div>
                            <div className="flex-grow p-4 overflow-y-auto space-y-4">
                                {selectedConversationMessages.map(msg => (
                                    <div key={msg.id} className={`flex ${msg.senderId === user.id ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-lg p-3 rounded-lg ${msg.senderId === user.id ? 'bg-pink-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                                            <p className="font-bold text-sm mb-1">{msg.subject}</p>
                                            <p>{msg.content}</p>
                                            <p className="text-xs opacity-70 mt-2 text-right">{new Date(msg.timestamp).toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                             <div className="p-4 border-t dark:border-gray-700">
                                <div className="relative">
                                    <input type="text" placeholder="Reply..." className="w-full p-3 pr-12 border rounded-lg dark:bg-gray-600 dark:border-gray-500"/>
                                    <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-pink-500 text-white p-2 rounded-lg"><SendIcon className="w-5 h-5"/></button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-grow flex items-center justify-center text-center text-gray-500">
                            <div>
                                <MailIcon className="w-16 h-16 mx-auto text-gray-400"/>
                                <p className="mt-4">Select a conversation or start a new message.</p>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};


// ====================================================================================
// ===== 8. CALENDAR (for all roles)
// ====================================================================================

const CalendarPage: React.FC<{ user: User, events: CalendarEvent[] }> = ({ user, events }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

    const eventsByDate = useMemo(() => {
        const map = new Map<string, CalendarEvent[]>();
        events.forEach(event => {
            const date = event.date; // YYYY-MM-DD
            if (!map.has(date)) map.set(date, []);
            map.get(date)!.push(event);
        });
        return map;
    }, [events]);

    const changeMonth = (offset: number) => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    };

    const EventBadge: React.FC<{event: CalendarEvent}> = ({ event }) => {
        const colors = {
            deadline: 'bg-red-500',
            live_session: 'bg-blue-500',
            assignment: 'bg-amber-500',
        };
        return <div className={`mt-1 text-xs text-white p-1 rounded-md ${colors[event.type]}`}>{event.title}</div>
    }

    return (
        <div className="p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold">Calendar</h1>
                    <div className="flex items-center gap-4">
                        <button onClick={() => changeMonth(-1)}><ChevronLeftIcon className="w-6 h-6"/></button>
                        <h2 className="text-xl font-semibold w-40 text-center">{currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
                        <button onClick={() => changeMonth(1)}><ChevronRightIcon className="w-6 h-6"/></button>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
                    <div className="grid grid-cols-7 text-center font-bold p-2 bg-gray-50 dark:bg-gray-700/50">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day}>{day}</div>)}
                    </div>
                    <div className="grid grid-cols-7">
                        {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} className="border-r border-b dark:border-gray-700 h-32"></div>)}
                        {Array.from({ length: daysInMonth }).map((_, day) => {
                            const date = day + 1;
                            const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
                            const dayEvents = eventsByDate.get(dateStr) || [];
                            return (
                                <div key={date} className="border-r border-b dark:border-gray-700 h-32 p-2">
                                    <div className="font-semibold">{date}</div>
                                    <div className="overflow-y-auto max-h-24">
                                        {dayEvents.map(event => <EventBadge key={event.id} event={event} />)}
                                    </div>
                                </div>
                            );
                        })}
                         {/* Fill remaining cells to complete the grid */}
                        {Array.from({ length: (7 - (firstDayOfMonth + daysInMonth) % 7) % 7 }).map((_, i) => <div key={`empty-end-${i}`} className="border-r border-b dark:border-gray-700 h-32"></div>)}
                    </div>
                </div>
            </div>
        </div>
    );
};


// ====================================================================================
// ===== 9. HISTORY (for all roles)
// ====================================================================================
const HistoryPage: React.FC<{ user: User, logs: HistoryLog[] }> = ({ user, logs }) => {
    
    const actionIcons: Record<HistoryAction, React.ReactElement> = {
        course_enrolled: <BookOpenIcon className="w-5 h-5 text-blue-500" />,
        lesson_completed: <CheckCircle2Icon className="w-5 h-5 text-green-500" />,
        quiz_passed: <ClipboardListIcon className="w-5 h-5 text-purple-500" />,
        certificate_earned: <AwardIcon className="w-5 h-5 text-amber-500" />,
        discussion_posted: <MessageSquareIcon className="w-5 h-5 text-pink-500" />,
    };

    const actionText: Record<HistoryAction, string> = {
        course_enrolled: "Enrolled in course",
        lesson_completed: "Completed lesson",
        quiz_passed: "Passed quiz",
        certificate_earned: "Earned certificate for",
        discussion_posted: "Posted in discussion for",
    };

    return (
         <div className="p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-10">
                    <HistoryIcon className="w-16 h-16 mx-auto text-pink-500" />
                    <h1 className="mt-4 text-4xl font-extrabold">My History</h1>
                    <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">A log of your recent activity on Nexus.</p>
                </div>
                <div className="space-y-4">
                    {logs.map(log => (
                        <div key={log.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm flex items-center gap-4">
                            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-full">
                                {actionIcons[log.action]}
                            </div>
                            <div>
                                <p className="font-semibold">{actionText[log.action]}: <span className="text-blue-600 dark:text-blue-400">{log.targetName}</span></p>
                                <p className="text-sm text-gray-500">{new Date(log.timestamp).toLocaleString()}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};


// ====================================================================================
// ===== 10. LIVE SESSIONS (for Instructors/Admins)
// ====================================================================================
const LiveSessionsPage: React.FC<{
    user: User,
    liveSessions: LiveSession[],
    courses: Course[],
    onScheduleSession: (session: Omit<LiveSession, 'id'>) => Promise<void>,
    onDeleteSession: (sessionId: string) => Promise<void>,
}> = ({ user, liveSessions, courses, onScheduleSession, onDeleteSession }) => {
    const [isScheduling, setIsScheduling] = useState(false);
    
    const instructorCourses = useMemo(() => courses.filter(c => user.role === Role.ADMIN || c.instructorId === user.id), [courses, user]);
    
    const ScheduleModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
        const [session, setSession] = useState<Omit<LiveSession, 'id' | 'instructorId'>>({
            title: '', description: '', dateTime: '', duration: 60, audience: 'all'
        });

        const handleSave = async () => {
            if (session.title && session.dateTime) {
                await onScheduleSession({ ...session, instructorId: user.id });
                onClose();
            }
        };

        return (
             <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg p-6">
                    <h2 className="text-xl font-bold mb-4">Schedule New Live Session</h2>
                    <div className="space-y-4">
                        <input type="text" value={session.title} onChange={e => setSession({...session, title: e.target.value})} placeholder="Session Title" className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"/>
                        <textarea value={session.description} onChange={e => setSession({...session, description: e.target.value})} placeholder="Description" rows={3} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"/>
                        <input type="datetime-local" value={session.dateTime} onChange={e => setSession({...session, dateTime: e.target.value})} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"/>
                        <input type="number" value={session.duration} onChange={e => setSession({...session, duration: parseInt(e.target.value)})} placeholder="Duration (min)" className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"/>
                        <select value={session.audience} onChange={e => setSession({...session, audience: e.target.value})} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600">
                            <option value="all">All Students</option>
                            {instructorCourses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </select>
                    </div>
                    <div className="flex justify-end gap-4 mt-6">
                        <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 font-semibold">Cancel</button>
                        <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-pink-500 text-white font-semibold">Schedule</button>
                    </div>
                </div>
            </div>
        );
    };

    return (
         <div className="p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold">Live Sessions</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage and schedule live training sessions.</p>
                    </div>
                    <button onClick={() => setIsScheduling(true)} className="flex items-center gap-2 bg-pink-500 text-white font-semibold px-4 py-2.5 rounded-lg hover:bg-pink-600">
                        <PlusCircleIcon className="w-5 h-5"/> Schedule Session
                    </button>
                </div>
                 <div className="space-y-4">
                    {liveSessions.map(session => (
                        <div key={session.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm flex justify-between items-center">
                            <div>
                                <p className="font-bold text-lg text-blue-600 dark:text-blue-400">{session.title}</p>
                                <p className="text-sm text-gray-500">{new Date(session.dateTime).toLocaleString()}</p>
                                <p className="text-sm text-gray-500">Audience: {session.audience === 'all' ? 'All Students' : courses.find(c=>c.id === session.audience)?.title}</p>
                            </div>
                             <div className="flex items-center gap-2">
                                <button onClick={() => onDeleteSession(session.id)} className="p-2 text-gray-500 hover:text-red-500"><Trash2Icon className="w-5 h-5"/></button>
                                <a href="#" className="bg-blue-500 text-white text-sm font-semibold py-2 px-4 rounded-lg hover:bg-blue-600">Join</a>
                             </div>
                        </div>
                    ))}
                </div>
                {isScheduling && <ScheduleModal onClose={() => setIsScheduling(false)} />}
            </div>
        </div>
    );
};


// ====================================================================================
// ===== 11. PROFILE (for all roles)
// ====================================================================================
const ProfilePage: React.FC<{ user: User, onSave: (updates: Partial<User> & { newPassword?: string }) => Promise<void> }> = ({ user, onSave }) => {
    const [profile, setProfile] = useState(user);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');

    const handleSave = () => {
        let updates: Partial<User> & { newPassword?: string } = {};

        if (profile.firstName !== user.firstName) updates.firstName = profile.firstName;
        if (profile.lastName !== user.lastName) updates.lastName = profile.lastName;
        if (profile.bio !== user.bio) updates.bio = profile.bio;

        if (newPassword) {
            if (newPassword !== confirmPassword) {
                setPasswordError("Passwords do not match.");
                return;
            }
            if (newPassword.length < 6) {
                setPasswordError("Password must be at least 6 characters.");
                return;
            }
            updates.newPassword = newPassword;
        }
        setPasswordError('');
        onSave(updates);
    };

    return (
        <div className="p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                 <h1 className="text-3xl font-bold mb-8">My Profile</h1>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-1 flex flex-col items-center">
                        <div className="w-32 h-32 rounded-full bg-pink-100 dark:bg-pink-900/50 flex items-center justify-center ring-4 ring-pink-500">
                             <UserCircleIcon className="w-24 h-24 text-pink-500"/>
                        </div>
                        <h2 className="mt-4 text-2xl font-bold">{user.firstName} {user.lastName}</h2>
                        <p className="text-gray-500 capitalize">{user.role}</p>
                    </div>
                    <div className="md:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md space-y-6">
                        <div>
                            <h3 className="text-lg font-bold mb-2">Personal Information</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <input type="text" value={profile.firstName} onChange={e => setProfile({...profile, firstName: e.target.value})} className="w-full p-2 border rounded-md dark:bg-gray-700" />
                                <input type="text" value={profile.lastName} onChange={e => setProfile({...profile, lastName: e.target.value})} className="w-full p-2 border rounded-md dark:bg-gray-700" />
                            </div>
                             <textarea value={profile.bio} onChange={e => setProfile({...profile, bio: e.target.value})} placeholder="Your Bio" rows={3} className="w-full p-2 border rounded-md dark:bg-gray-700 mt-4" />
                        </div>
                         <div>
                            <h3 className="text-lg font-bold mb-2">Change Password</h3>
                             <div className="grid grid-cols-2 gap-4">
                                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New Password" className="w-full p-2 border rounded-md dark:bg-gray-700" />
                                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm Password" className="w-full p-2 border rounded-md dark:bg-gray-700" />
                            </div>
                            {passwordError && <p className="text-red-500 text-sm mt-2">{passwordError}</p>}
                        </div>
                        <div className="text-right">
                            <button onClick={handleSave} className="bg-pink-500 text-white font-semibold py-2.5 px-6 rounded-lg hover:bg-pink-600">Save Changes</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


// ====================================================================================
// ===== EXPORTED WRAPPER COMPONENT
// ====================================================================================

interface ManagementPagesProps {
  view: Exclude<View, 'dashboard' | 'player'>;
  user: User;
  courses: Course[];
  enrollments: Enrollment[];
  allUsers: User[];
  courseToEdit?: Course | null;
  onSave: (course: Course) => void;
  onExit: () => void;
  onEditCourse: (course: Course | null) => void;
  onSelectCourse: (course: Course) => void;
  conversations: Conversation[];
  messages: Message[];
  onSendMessage: (recipientIds: string[], subject: string, content: string) => void;
  onUpdateMessages: (messages: Message[]) => void;
  calendarEvents: CalendarEvent[];
  historyLogs: HistoryLog[];
  liveSessions: LiveSession[];
  onScheduleSession: (session: Omit<LiveSession, 'id'>) => Promise<void>;
  onDeleteSession: (sessionId: string) => Promise<void>;
  onRefetchData: () => void;
  onSaveUserProfile: (updates: Partial<User> & { newPassword?: string }) => Promise<void>;
}

export const ManagementPages: React.FC<ManagementPagesProps> = (props) => {
    switch (props.view) {
        case 'certifications':
            return <CertificationsPage user={props.user} courses={props.courses} enrollments={props.enrollments} />;
        case 'my-courses':
            return <MyCoursesPage user={props.user} courses={props.courses} onEditCourse={props.onEditCourse} onSelectCourse={props.onSelectCourse} />;
        case 'course-editor': // This case is handled in App.tsx but added for completeness
             return props.courseToEdit !== undefined ? <CourseEditorPage course={props.courseToEdit} user={props.user} onSave={props.onSave} onExit={props.onExit} /> : <div>Error: No course selected for editing.</div>;
        case 'user-management':
            return <UserManagementPage allUsers={props.allUsers} onRefetchData={props.onRefetchData} onSaveUserProfile={props.onSaveUserProfile}/>;
        case 'student-management':
            return <StudentManagementPage user={props.user} courses={props.courses} enrollments={props.enrollments} allUsers={props.allUsers}/>;
        case 'platform-settings':
            return <PlatformSettingsPage />;
        case 'inbox':
            return <InboxPage user={props.user} conversations={props.conversations} messages={props.messages} allUsers={props.allUsers} onSendMessage={props.onSendMessage} onUpdateMessages={props.onUpdateMessages}/>;
        case 'calendar':
            return <CalendarPage user={props.user} events={props.calendarEvents}/>
        case 'history':
            return <HistoryPage user={props.user} logs={props.historyLogs}/>
        case 'live-sessions':
            return <LiveSessionsPage user={props.user} liveSessions={props.liveSessions} courses={props.courses} onScheduleSession={props.onScheduleSession} onDeleteSession={props.onDeleteSession}/>;
        case 'profile':
            return <ProfilePage user={props.user} onSave={props.onSaveUserProfile} />;
        case 'help':
            return <HelpPage user={props.user} />;
        case 'analytics':
             return <div className="p-8"><h1 className="text-2xl font-bold">Analytics Page (Under Construction)</h1></div>; // Placeholder
        default:
            return <div>Unknown view: {props.view}</div>;
    }
};