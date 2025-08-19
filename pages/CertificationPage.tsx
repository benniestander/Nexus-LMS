import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Course, Enrollment, User, Role, Lesson, Module, LessonType, Question, QuizData, Conversation, Message, CalendarEvent, HistoryLog, HistoryAction, LiveSession } from '../types';
import { AwardIcon, BarChart2Icon, BookOpenIcon, CheckCircle2Icon, ChevronDownIcon, ChevronUpIcon, EditIcon, FileTextIcon, GripVerticalIcon, PlusCircleIcon, SettingsIcon, Trash2Icon, UsersIcon, PlayCircleIcon, ClipboardListIcon, XIcon, SearchIcon, DownloadIcon, MailIcon, SendIcon, CalendarIcon, ChevronLeftIcon, ChevronRightIcon, HistoryIcon, MessageSquareIcon, VideoIcon } from '../components/Icons';
import { mockEngagementData } from '../constants/mockData';
import { RichTextEditor } from '../components/RichTextEditor';
import { CourseCard } from '../components/CourseCard';
import { ProgressBar } from '../components/ProgressBar';
import { HelpPage } from './HelpPage';


declare global {
  interface Window {
    jspdf: any;
    html2canvas: any;
  }
}

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
                    top: 'calc(47.5% - 30px)',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '28px',
                    fontWeight: 700,
                    textAlign: 'center',
                    color: '#18608C',
                }}
            >
                {`${user.firstName} ${user.lastName}`}
            </div>
            
            {/* Course Name */}
            <div
                style={{
                    position: 'absolute',
                    top: 'calc(55% - 15px)',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontFamily: 'Poppins, sans-serif',
                    fontSize: '28px',
                    fontWeight: 400,
                    textAlign: 'center',
                    color: '#18608C',
                }}
            >
                {course.title}
            </div>

            {/* Completion Date */}
            <div
                style={{
                    position: 'absolute',
                    top: 'calc(84.5% - 80px)',
                    left: 'calc(76.5% - 140px)',
                    transform: 'translateX(-50%)',
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '18px',
                    textAlign: 'center',
                    color: '#333',
                }}
            >
                {completionDate}
            </div>
        </div>
    );
};


const CertificationPageComponent: React.FC<{ user: User; courses: Course[]; enrollments: Enrollment[]; }> = ({ user, courses, enrollments }) => {
    const [isDownloading, setIsDownloading] = useState<string | null>(null);

    const completedCourses = enrollments
        .filter(e => e.userId === user.id && e.progress === 100)
        .map(enrollment => {
            return courses.find(c => c.id === enrollment.courseId);
        })
        .filter((c): c is Course => c !== null);

    const handleDownload = async (course: Course) => {
        setIsDownloading(course.id);
        const certificateElement = document.getElementById(`certificate-${course.id}-${user.id}`);
        if (!certificateElement || !window.html2canvas || !window.jspdf) { setIsDownloading(null); return; }
        
        const { jsPDF } = window.jspdf;
        try {
            const canvas = await window.html2canvas(certificateElement, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Nexus_Certificate_${course.title.replace(/\s/g, '_')}.pdf`);
        } catch (error) { console.error("Error generating PDF:", error); } 
        finally { setIsDownloading(null); }
    };
    
    return (
        <div className="p-4 md:p-8">
            <div className="text-center max-w-3xl mx-auto">
                <AwardIcon className="w-16 h-16 mx-auto text-pink-500" />
                <h1 className="mt-4 text-4xl md:text-5xl font-extrabold text-blue-700 dark:text-blue-300">My Certifications</h1>
                <p className="mt-4 text-lg md:text-xl text-gray-600 dark:text-gray-400">You've earned it! Download your certificates here.</p>
            </div>
            <div className="mt-16">
                {completedCourses.length > 0 ? (
                    <div className="space-y-6">{completedCourses.map(course => (
                        <div key={course.id} className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-2xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:shadow-lg hover:scale-[1.01]">
                            <div className="flex items-center gap-4"><div className="bg-blue-100 dark:bg-blue-900/50 p-4 rounded-xl"><AwardIcon className="w-10 h-10 text-blue-600 dark:text-blue-400" /></div><div><h3 className="text-lg md:text-xl font-bold text-blue-600 dark:text-blue-400">{course.title}</h3><p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Completed on: {new Date().toLocaleDateString()}</p></div></div>
                            <button onClick={() => handleDownload(course)} disabled={!!isDownloading} className="bg-pink-500 text-white font-semibold px-6 py-3 rounded-lg hover:bg-pink-600 transition-all disabled:bg-gray-400 disabled:cursor-wait flex items-center gap-2 w-full sm:w-auto justify-center">{isDownloading === course.id ? 'Downloading...' : 'Download PDF'}</button>
                        </div>))}
                    </div>
                ) : (
                     <div className="mt-6 text-center py-20 bg-gray-100 dark:bg-gray-800 rounded-lg"><AwardIcon className="w-16 h-16 mx-auto text-gray-400" /><p className="mt-4 text-xl font-semibold text-gray-700 dark:text-gray-300">No Certificates Yet</p><p className="mt-2 text-gray-500 dark:text-gray-400">Complete a course to earn your first certificate.</p></div>
                )}
            </div>
            <div style={{ position: 'absolute', left: '-9999px', top: 0, zIndex: -1 }}>
                {completedCourses.map(course => ( <CertificateTemplate key={`cert-render-${course.id}`} course={course} user={user} completionDate={new Date().toLocaleDateString()} /> ))}
            </div>
        </div>
    );
}

// ====================================================================================
// ===== 2. MY COURSES PAGE (for Instructors)
// ====================================================================================

const MyCoursesPage: React.FC<{ user: User, courses: Course[], onEditCourse: (course: Course) => void, onSelectCourse: (course: Course) => void }> = ({ user, courses, onEditCourse, onSelectCourse }) => {
    const instructorCourses = courses.filter(c => c.instructorId === user.id);

    return (
        <div className="p-4 md:p-8">
            <div className="text-center max-w-3xl mx-auto">
                <BookOpenIcon className="w-16 h-16 mx-auto text-pink-500" />
                <h1 className="mt-4 text-4xl md:text-5xl font-extrabold text-purple-700 dark:text-purple-300">My Courses</h1>
                <p className="mt-4 text-lg md:text-xl text-gray-600 dark:text-gray-400">Manage your existing courses or create a new one.</p>
                <div className="mt-8">
                    <button onClick={() => onEditCourse({} as Course)} className="bg-pink-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-pink-600 transition-all text-lg flex items-center justify-center gap-2 mx-auto">
                        <PlusCircleIcon className="w-6 h-6" /> <span>Create New Course</span>
                    </button>
                </div>
            </div>
             {instructorCourses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mt-16">
                    {instructorCourses.map(course => (
                        <CourseCard 
                            key={course.id}
                            course={course}
                            user={user}
                            onEdit={() => onEditCourse(course)}
                            onSelect={onSelectCourse}
                        />
                    ))}
                </div>
            ) : (
                <div className="mt-10 text-center py-20 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <BookOpenIcon className="w-16 h-16 mx-auto text-gray-400" />
                    <p className="mt-4 text-xl font-semibold text-gray-700 dark:text-gray-300">No Courses Created Yet</p>
                    <p className="mt-2 text-gray-500 dark:text-gray-400">Click "Create New Course" to get started.</p>
                </div>
            )}
        </div>
    );
};


// ====================================================================================
// ===== 3. STUDENT MANAGEMENT (for Instructors)
// ====================================================================================

const StudentDetailModal: React.FC<{
    student: User;
    enrollments: Enrollment[];
    courses: Course[];
    onClose: () => void;
}> = ({ student, enrollments, courses, onClose }) => {
    const [isDownloading, setIsDownloading] = useState<string | null>(null);
    const [certToDownload, setCertToDownload] = useState<{course: Course, student: User} | null>(null);

    const studentEnrollments = useMemo(() => enrollments.filter(e => e.userId === student.id), [enrollments, student.id]);
    
    const studentCourses = useMemo(() => {
        return studentEnrollments.map(e => {
            const course = courses.find(c => c.id === e.courseId);
            return course ? { ...course, progress: e.progress } : null;
        }).filter((c): c is Course & { progress: number } => c !== null);
    }, [studentEnrollments, courses]);
    
    const completed = studentCourses.filter(c => c.progress === 100);
    const inProgress = studentCourses.filter(c => c.progress < 100);

    const handleDownload = async (course: Course) => {
        setCertToDownload({ course, student });
        setIsDownloading(course.id);
        
        // Allow state to update and component to render before starting download
        setTimeout(async () => {
            const certificateElement = document.getElementById(`certificate-${course.id}-${student.id}`);
            if (!certificateElement || !window.html2canvas || !window.jspdf) {
                setIsDownloading(null);
                setCertToDownload(null);
                return;
            }
            
            const { jsPDF } = window.jspdf;
            try {
                const canvas = await window.html2canvas(certificateElement, { scale: 2, useCORS: true });
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                pdf.save(`Nexus_Certificate_${student.firstName}_${student.lastName}_${course.title.replace(/\s/g, '_')}.pdf`);
            } catch (error) {
                console.error("Error generating PDF:", error);
            } finally {
                setIsDownloading(null);
                setCertToDownload(null);
            }
        }, 100);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <img src={student.avatar} alt="Student Avatar" className="w-16 h-16 rounded-full"/>
                        <div>
                            <h2 className="text-2xl font-bold text-blue-700 dark:text-blue-300">{student.firstName} {student.lastName}</h2>
                            <p className="text-gray-500 dark:text-gray-400">{student.email}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                        <XIcon className="w-6 h-6"/>
                    </button>
                </div>
                <div className="flex-grow overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1 space-y-4">
                        <div><h4 className="font-bold text-gray-700 dark:text-gray-300">Company</h4><p>{student.company || 'Not Specified'}</p></div>
                        <div><h4 className="font-bold text-gray-700 dark:text-gray-300">Bio</h4><p className="text-sm text-gray-600 dark:text-gray-400">{student.bio}</p></div>
                    </div>
                    <div className="md:col-span-2 space-y-6">
                        <div>
                            <h4 className="font-bold text-lg text-gray-800 dark:text-gray-200 mb-2">Courses in Progress ({inProgress.length})</h4>
                             {inProgress.length > 0 ? (
                                <ul className="space-y-3">{inProgress.map(c => <li key={c.id}><div><div className="flex justify-between mb-1"><span className="font-semibold text-sm">{c.title}</span><span className="text-sm font-bold text-pink-500">{c.progress}%</span></div><ProgressBar progress={c.progress} /></div></li>)}</ul>
                            ) : <p className="text-sm text-gray-500">No courses in progress.</p>}
                        </div>
                        <div>
                            <h4 className="font-bold text-lg text-gray-800 dark:text-gray-200 mb-2">Completed Courses ({completed.length})</h4>
                            {completed.length > 0 ? (
                                <ul className="space-y-3">{completed.map(c => <li key={c.id} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg"> <p className="font-semibold">{c.title}</p><button onClick={() => handleDownload(c)} disabled={isDownloading === c.id} className="text-sm bg-blue-500 text-white font-semibold px-3 py-1.5 rounded-md hover:bg-blue-600 flex items-center gap-1.5 disabled:bg-gray-400"><DownloadIcon className="w-4 h-4"/>{isDownloading === c.id ? '...' : 'Certificate'}</button></li>)}</ul>
                            ) : <p className="text-sm text-gray-500">No completed courses yet.</p>}
                        </div>
                    </div>
                </div>
            </div>
             {certToDownload && <div style={{ position: 'absolute', left: '-9999px', top: 0, zIndex: -1 }}><CertificateTemplate course={certToDownload.course} user={certToDownload.student} completionDate={new Date().toLocaleDateString()} /></div>}
        </div>
    );
};

const StudentManagementPage: React.FC<{ user: User; allUsers: User[]; courses: Course[]; enrollments: Enrollment[]; }> = ({ user, allUsers, courses, enrollments }) => {
    const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const instructorCourseIds = useMemo(() => courses.filter(c => c.instructorId === user.id).map(c => c.id), [courses, user.id]);
    
    const instructorStudents = useMemo(() => {
        const studentIds = new Set<string>();
        enrollments.forEach(e => {
            if (instructorCourseIds.includes(e.courseId)) { studentIds.add(e.userId); }
        });
        return allUsers.filter(u => studentIds.has(u.id));
    }, [instructorCourseIds, enrollments, allUsers]);

    const filteredStudents = useMemo(() => {
        if (!searchTerm) return instructorStudents;
        return instructorStudents.filter(student =>
            `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [instructorStudents, searchTerm]);
    
    const getStudentCourseData = useCallback((studentId: string) => {
        const studentEnrollments = enrollments.filter(e => e.userId === studentId && instructorCourseIds.includes(e.courseId));
        
        const completed = studentEnrollments.filter(e => e.progress === 100);
        const inProgress = studentEnrollments.filter(e => e.progress < 100 && e.progress > 0);
        
        return { completed, inProgress };
    }, [enrollments, instructorCourseIds]);

    return (
        <div className="p-4 md:p-8">
            <div className="text-center max-w-3xl mx-auto">
                <UsersIcon className="w-16 h-16 mx-auto text-pink-500" />
                <h1 className="mt-4 text-4xl md:text-5xl font-extrabold text-purple-700 dark:text-purple-300">Student Management</h1>
                <p className="mt-4 text-lg md:text-xl text-gray-600 dark:text-gray-400">Track progress and view details for your students.</p>
            </div>

            <div className="mt-12 relative max-w-lg mx-auto">
                <input 
                    type="text"
                    placeholder="Search students by name or email..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full p-3 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                />
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
            </div>

            <div className="mt-8 bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="p-4 font-semibold whitespace-nowrap">Student Name</th>
                                <th className="p-4 font-semibold whitespace-nowrap">Company</th>
                                <th className="p-4 font-semibold whitespace-nowrap">Completed</th>
                                <th className="p-4 font-semibold whitespace-nowrap">In Progress</th>
                                <th className="p-4 font-semibold whitespace-nowrap">Certificates</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                           {filteredStudents.map(student => {
                                const { completed, inProgress } = getStudentCourseData(student.id);
                                return (
                                    <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                        <td className="p-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <img src={student.avatar} className="w-10 h-10 rounded-full" alt="avatar" />
                                                <div>
                                                    <button onClick={() => setSelectedStudent(student)} className="font-bold text-blue-600 hover:underline">{student.firstName} {student.lastName}</button>
                                                    <p className="text-sm text-gray-500">{student.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 whitespace-nowrap text-gray-600 dark:text-gray-400">{student.company || '--'}</td>
                                        <td className="p-4 whitespace-nowrap">{completed.length} course{completed.length !== 1 && 's'}</td>
                                        <td className="p-4 whitespace-nowrap">
                                            {inProgress.length > 0 ? (
                                                <div className="flex flex-col gap-1 text-xs">
                                                    {inProgress.map(e => {
                                                        const course = courses.find(c => c.id === e.courseId);
                                                        return <div key={e.courseId}>{course?.title} ({e.progress}%)</div>
                                                    })}
                                                </div>
                                            ) : 0}
                                        </td>
                                        <td className="p-4 whitespace-nowrap">
                                            <div className="flex items-center gap-1.5"><AwardIcon className="w-5 h-5 text-yellow-500"/>{completed.length}</div>
                                        </td>
                                    </tr>
                                )
                           })}
                        </tbody>
                    </table>
                </div>
            </div>
            {selectedStudent && <StudentDetailModal student={selectedStudent} enrollments={enrollments} courses={courses} onClose={() => setSelectedStudent(null)} />}
        </div>
    )
}

// ====================================================================================
// ===== 4. INBOX / MESSAGING PAGE
// ====================================================================================
const NewMessageModal: React.FC<{
  user: User;
  onClose: () => void;
  onSend: (recipients: string[], subject: string, content: string) => void;
  allUsers: User[];
  courses: Course[];
  enrollments: Enrollment[];
}> = ({ user, onClose, onSend, allUsers, courses, enrollments }) => {
    const [recipient, setRecipient] = useState('');
    const [subject, setSubject] = useState('');
    const [content, setContent] = useState('');
    const [broadcastType, setBroadcastType] = useState('all'); // 'all' or courseId

    const getRecipientOptions = () => {
        if (user.role === Role.STUDENT) {
            const instructorIds = new Set<string>();
            enrollments.forEach(e => {
                if(e.userId === user.id) {
                    const course = courses.find(c => c.id === e.courseId);
                    if(course) instructorIds.add(course.instructorId);
                }
            });
            return allUsers.filter(u => instructorIds.has(u.id));
        } else { // INSTRUCTOR
            const studentIds = new Set<string>();
             courses.filter(c => c.instructorId === user.id).forEach(c => {
                 enrollments.filter(e => e.courseId === c.id).forEach(e => studentIds.add(e.userId));
             });
             return allUsers.filter(u => studentIds.has(u.id));
        }
    };
    
    const handleSend = () => {
        if (!content.trim() || (!recipient && broadcastType === 'individual')) return;
        
        let recipientIds: string[] = [];
        if (recipient) { // Individual message
            recipientIds = [recipient];
        } else { // Broadcast
            const studentIds = new Set<string>();
            const instructorCourseIds = courses.filter(c => c.instructorId === user.id).map(c => c.id);
            enrollments.forEach(e => {
                if (broadcastType === 'all' && instructorCourseIds.includes(e.courseId)) {
                    studentIds.add(e.userId);
                } else if (e.courseId === broadcastType) {
                    studentIds.add(e.userId);
                }
            });
            recipientIds = Array.from(studentIds);
        }
        
        onSend(recipientIds, subject, content);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-blue-700 dark:text-blue-300">New Message</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><XIcon className="w-6 h-6"/></button>
                </div>
                <div className="p-6 space-y-4">
                    {user.role === Role.INSTRUCTOR && !recipient && (
                         <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                            <label className="font-semibold text-sm">Broadcast To:</label>
                             <div className="flex gap-4 mt-2">
                                <label className="flex items-center gap-2"><input type="radio" name="broadcast" value="all" checked={broadcastType === 'all'} onChange={e => setBroadcastType(e.target.value)} /> All My Students</label>
                                {courses.filter(c => c.instructorId === user.id).map(course => (
                                    <label key={course.id} className="flex items-center gap-2"><input type="radio" name="broadcast" value={course.id} checked={broadcastType === course.id} onChange={e => setBroadcastType(e.target.value)}/> {course.title}</label>
                                ))}
                             </div>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-semibold mb-1">To:</label>
                        <select value={recipient} onChange={e => {setRecipient(e.target.value); setBroadcastType('individual')}} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
                             <option value="">{user.role === Role.INSTRUCTOR ? 'Select a student for a direct message...' : 'Select an instructor...'}</option>
                            {getRecipientOptions().map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-semibold mb-1">Subject:</label>
                        <input type="text" value={subject} onChange={e => setSubject(e.target.value)} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-1">Message:</label>
                        <textarea value={content} onChange={e => setContent(e.target.value)} rows={8} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700" />
                    </div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 text-right">
                    <button onClick={handleSend} className="bg-pink-500 text-white font-bold py-2.5 px-6 rounded-lg hover:bg-pink-600">Send Message</button>
                </div>
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
    onSendMessage: (recipients: string[], subject: string, content: string) => void;
    onUpdateMessages: (messages: Message[]) => void;
}> = ({ user, conversations, messages, allUsers, courses, enrollments, onSendMessage, onUpdateMessages }) => {
    const [selectedConvoId, setSelectedConvoId] = useState<string | null>(null);
    const [isComposeOpen, setComposeOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    const myConversations = useMemo(() => {
        return conversations
            .filter(c => c.participantIds.includes(user.id))
            .sort((a, b) => new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime());
    }, [conversations, user.id]);

    const selectedMessages = useMemo(() => {
        if (!selectedConvoId) return [];
        return messages.filter(m => m.conversationId === selectedConvoId).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }, [messages, selectedConvoId]);
    
    useEffect(() => {
        if (selectedConvoId) {
            const updatedMessages = messages.map(m => 
                m.conversationId === selectedConvoId && m.senderId !== user.id && !m.isRead 
                    ? { ...m, isRead: true } 
                    : m
            );
            onUpdateMessages(updatedMessages);
        }
    }, [selectedConvoId, user.id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [selectedMessages]);

    const handleSendReply = (content: string) => {
        const convo = myConversations.find(c => c.id === selectedConvoId);
        if(!convo || !content.trim()) return;
        const recipientId = convo.participantIds.find(pId => pId !== user.id);
        if (recipientId) {
            onSendMessage([recipientId], '', content);
        }
    };
    
    return (
        <div className="w-full h-full flex bg-white dark:bg-gray-800 overflow-hidden">
            {isComposeOpen && <NewMessageModal user={user} onClose={() => setComposeOpen(false)} onSend={(r,s,c) => { onSendMessage(r,s,c); setComposeOpen(false); }} allUsers={allUsers} courses={courses} enrollments={enrollments} />}
            {/* Conversation List */}
            <aside className={`w-full md:w-96 h-full flex flex-col border-r border-gray-200 dark:border-gray-700 flex-shrink-0 ${selectedConvoId ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-bold text-blue-700 dark:text-blue-300">Inbox</h1>
                         <button onClick={() => setComposeOpen(true)} className="bg-pink-500 text-white font-semibold py-2 px-3 rounded-lg hover:bg-pink-600 flex items-center gap-2">
                            <EditIcon className="w-5 h-5" /> <span className="hidden sm:inline">New Message</span>
                        </button>
                    </div>
                </div>
                <div className="flex-grow overflow-y-auto">
                    {myConversations.map(convo => {
                        const otherUserId = convo.participantIds.find(p => p !== user.id);
                        const otherUser = allUsers.find(u => u.id === otherUserId);
                        const lastMessage = messages.filter(m => m.conversationId === convo.id).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
                        const hasUnread = messages.some(m => m.conversationId === convo.id && !m.isRead && m.senderId !== user.id);
                        
                        return (
                            <div key={convo.id} onClick={() => setSelectedConvoId(convo.id)} className={`p-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer flex gap-3 items-start ${selectedConvoId === convo.id ? 'bg-pink-50 dark:bg-pink-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                                <div className="relative flex-shrink-0">
                                    <img src={otherUser?.avatar} className="w-12 h-12 rounded-full" />
                                    {hasUnread && <span className="absolute top-0 right-0 block h-3 w-3 rounded-full bg-pink-500 ring-2 ring-white dark:ring-gray-800"></span>}
                                </div>
                                <div className="flex-grow overflow-hidden">
                                    <div className="flex justify-between items-baseline">
                                        <p className={`font-bold ${hasUnread ? 'text-gray-800 dark:text-gray-100' : 'text-gray-600 dark:text-gray-300'}`}>{otherUser?.firstName} {otherUser?.lastName}</p>
                                        <p className="text-xs text-gray-400 flex-shrink-0">{new Date(convo.lastMessageTimestamp).toLocaleDateString()}</p>
                                    </div>
                                    <p className={`text-sm truncate ${hasUnread ? 'text-gray-600 dark:text-gray-300 font-semibold' : 'text-gray-500 dark:text-gray-400'}`}>{lastMessage?.content}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </aside>
            {/* Message View */}
            <main className={`flex-1 flex-col ${selectedConvoId ? 'flex' : 'hidden md:flex'}`}>
                {selectedConvoId ? (
                    <>
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 flex items-center gap-2"> {/* Header */}
                            <button onClick={() => setSelectedConvoId(null)} className="md:hidden p-1 -ml-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                                <ChevronLeftIcon className="w-6 h-6" />
                            </button>
                            <p className="font-bold text-lg">
                                {allUsers.find(u => u.id === conversations.find(c=>c.id===selectedConvoId)?.participantIds.find(pId => pId !== user.id))?.firstName}
                                {' '}
                                {allUsers.find(u => u.id === conversations.find(c=>c.id===selectedConvoId)?.participantIds.find(pId => pId !== user.id))?.lastName}
                            </p>
                        </div>
                        <div className="flex-grow p-6 overflow-y-auto space-y-6 bg-gray-50 dark:bg-gray-900/50"> {/* Messages */}
                             {selectedMessages.map(msg => {
                                const sender = allUsers.find(u => u.id === msg.senderId);
                                const isMe = sender?.id === user.id;
                                return (
                                <div key={msg.id} className={`flex items-end gap-2.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    {!isMe && <img src={sender?.avatar} className="w-8 h-8 rounded-full flex-shrink-0" />}
                                    <div className={`max-w-md p-3.5 rounded-2xl ${isMe ? 'bg-pink-500 text-white rounded-br-none' : 'bg-white dark:bg-gray-700 rounded-bl-none'}`}>
                                        <p className="text-sm">{msg.content}</p>
                                    </div>
                                     {isMe && <img src={user.avatar} className="w-8 h-8 rounded-full flex-shrink-0" />}
                                </div>
                                )
                             })}
                             <div ref={messagesEndRef} />
                        </div>
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0"> {/* Input */}
                            <form onSubmit={(e) => { e.preventDefault(); handleSendReply(e.currentTarget.message.value); e.currentTarget.message.value = ''; }} className="flex items-center gap-3">
                                <input name="message" type="text" placeholder="Type your message..." className="flex-grow p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"/>
                                <button type="submit" className="bg-pink-500 text-white p-3 rounded-lg hover:bg-pink-600"><SendIcon className="w-6 h-6" /></button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-grow flex flex-col items-center justify-center text-center p-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50">
                        <MailIcon className="w-24 h-24 text-gray-300 dark:text-gray-600" />
                        <h2 className="mt-4 text-2xl font-semibold text-gray-700 dark:text-gray-300">Select a conversation</h2>
                        <p>Choose a conversation from the left to read messages, or start a new one.</p>
                    </div>
                )}
            </main>
        </div>
    )
}

// ====================================================================================
// ===== 5. COURSE EDITOR (for Instructors) - FULLY IMPLEMENTED
// ====================================================================================
type EditableItem = { type: 'course' } | { type: 'module', id: string } | { type: 'lesson', moduleId: string, lessonId: string };

const InputField: React.FC<{label: string, value: string, onChange: (val: string) => void, placeholder?: string}> = ({label, value, onChange, placeholder}) => (
    <div>
        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">{label}</label>
        <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-pink-500" />
    </div>
);

const QuizEditor: React.FC<{lesson: Lesson, onUpdate: (data: QuizData) => void}> = ({ lesson, onUpdate }) => {
    const quizData = useMemo(() => lesson.content.quizData || { questions: [], passingScore: 80 }, [lesson.content.quizData]);

    const updateQuiz = (field: keyof QuizData, value: any) => onUpdate({ ...quizData, [field]: value });
    const addQuestion = () => updateQuiz('questions', [...quizData.questions, { id: `q-${Date.now()}`, questionText: "", options: ["", ""], correctAnswerIndex: 0 }]);
    const updateQuestion = (qId: string, updatedQ: Partial<Question>) => updateQuiz('questions', quizData.questions.map(q => q.id === qId ? {...q, ...updatedQ} : q));
    const deleteQuestion = (qId: string) => updateQuiz('questions', quizData.questions.filter(q => q.id !== qId));

    return (
        <div className="space-y-6">
            <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Passing Score (%)</label>
                <input type="number" value={quizData.passingScore} onChange={e => updateQuiz('passingScore', Number(e.target.value))} className="w-48 p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-pink-500" />
            </div>
            <div className="space-y-8">
                {quizData.questions.map((q, qIndex) => (
                    <div key={q.id} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-4">
                            <h5 className="font-bold text-gray-800 dark:text-gray-200">Question {qIndex + 1}</h5>
                            <button onClick={() => deleteQuestion(q.id)} className="text-red-500 hover:text-red-700"><Trash2Icon className="w-5 h-5" /></button>
                        </div>
                        <RichTextEditor label="Question Text" value={q.questionText} onChange={v => updateQuestion(q.id, { questionText: v })} />
                        <div className="mt-4">
                            <h6 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Options (select correct answer)</h6>
                            <div className="space-y-2">
                                {q.options.map((opt, oIndex) => (
                                    <div key={oIndex} className="flex items-center gap-2">
                                        <input type="radio" name={`correct-${q.id}`} checked={q.correctAnswerIndex === oIndex} onChange={() => updateQuestion(q.id, { correctAnswerIndex: oIndex })} className="h-4 w-4 text-pink-600 border-gray-300 focus:ring-pink-500"/>
                                        <input type="text" value={opt} onChange={e => updateQuestion(q.id, { options: q.options.map((o, i) => i === oIndex ? e.target.value : o)})} className="flex-grow p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"/>
                                        <button onClick={() => updateQuestion(q.id, { options: q.options.filter((_, i) => i !== oIndex) })} className="text-gray-500 hover:text-red-500 p-1"><XIcon className="w-4 h-4"/></button>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => updateQuestion(q.id, { options: [...q.options, ""]})} className="text-sm text-pink-500 hover:text-pink-700 mt-2 font-semibold">Add Option</button>
                        </div>
                    </div>
                ))}
            </div>
            <button onClick={addQuestion} className="bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-600">Add Question</button>
        </div>
    );
};


const CourseEditor: React.FC<{ course: Course, onSave: (course: Course) => void, onExit: () => void, user: User }> = ({ course: initialCourse, onSave, onExit, user }) => {
    const [course, setCourse] = useState<Course>(() => {
        if (!initialCourse.id) {
            return {
                id: `course-${Date.now()}`,
                title: 'New Course Title',
                description: '',
                thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=800',
                category: 'New Category',
                instructorId: user.id,
                instructorName: `${user.firstName} ${user.lastName}`,
                modules: [],
                totalLessons: 0,
                estimatedDuration: 0,
            };
        }
        return JSON.parse(JSON.stringify(initialCourse));
    });
    const [selectedItem, setSelectedItem] = useState<EditableItem>({ type: 'course' });
    const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>(() => Object.fromEntries(course.modules.map(m => [m.id, true])));

    const updateCourse = (field: keyof Course, value: any) => setCourse(prev => ({...prev, [field]: value}));

    const updateModule = (moduleId: string, newTitle: string) => {
        setCourse(prev => ({...prev, modules: prev.modules.map(m => m.id === moduleId ? {...m, title: newTitle} : m)}));
    };

    const updateLesson = (moduleId: string, lessonId: string, updatedLesson: Partial<Lesson>) => {
        setCourse(prev => ({...prev, modules: prev.modules.map(m => m.id === moduleId ? {...m, lessons: m.lessons.map(l => l.id === lessonId ? {...l, ...updatedLesson} : l)} : m)}));
    };
    
    const addModule = () => {
        const newModule: Module = { id: `m-${Date.now()}`, courseId: course.id, title: "New Module", lessons: [] };
        setCourse(prev => ({ ...prev, modules: [...prev.modules, newModule]}));
        setExpandedModules(prev => ({...prev, [newModule.id]: true}));
    };

    const addLesson = (moduleId: string) => {
        const newLesson: Lesson = { id: `l-${Date.now()}`, moduleId, title: "New Lesson", type: LessonType.TEXT, duration: 5, content: { text: "Start writing your lesson here." } };
        setCourse(prev => ({ ...prev, modules: prev.modules.map(m => m.id === moduleId ? {...m, lessons: [...m.lessons, newLesson]} : m) }));
        setSelectedItem({ type: 'lesson', moduleId, lessonId: newLesson.id });
    };

    const deleteModule = (moduleId: string) => {
        if (!window.confirm("Are you sure you want to delete this module and all its lessons?")) return;
        setCourse(prev => ({ ...prev, modules: prev.modules.filter(m => m.id !== moduleId) }));
        if (selectedItem.type === 'module' && selectedItem.id === moduleId) setSelectedItem({type: 'course'});
    }

    const deleteLesson = (moduleId: string, lessonId: string) => {
        if (!window.confirm("Are you sure you want to delete this lesson?")) return;
        setCourse(prev => ({ ...prev, modules: prev.modules.map(m => m.id === moduleId ? {...m, lessons: m.lessons.filter(l => l.id !== lessonId)} : m)}));
        if (selectedItem.type === 'lesson' && selectedItem.lessonId === lessonId) setSelectedItem({type: 'module', id: moduleId});
    }

    const { selectedModule, selectedLesson } = useMemo(() => {
        if (selectedItem.type === 'module') return { selectedModule: course.modules.find(m => m.id === selectedItem.id), selectedLesson: null };
        if (selectedItem.type === 'lesson') return {
            selectedModule: course.modules.find(m => m.id === selectedItem.moduleId),
            selectedLesson: course.modules.find(m => m.id === selectedItem.moduleId)?.lessons.find(l => l.id === selectedItem.lessonId)
        };
        return { selectedModule: null, selectedLesson: null };
    }, [selectedItem, course]);

    const renderEditPanel = () => {
        switch (selectedItem.type) {
            case 'course': return (
                <div className="space-y-6">
                    <InputField label="Course Title" value={course.title} onChange={v => updateCourse('title', v)} />
                    <RichTextEditor label="Description" value={course.description} onChange={v => updateCourse('description', v)} />
                    <div className="grid grid-cols-2 gap-6">
                         <InputField label="Category" value={course.category} onChange={v => updateCourse('category', v)} />
                         <InputField label="Thumbnail URL" value={course.thumbnail} onChange={v => updateCourse('thumbnail', v)} />
                    </div>
                    {course.thumbnail && <img src={course.thumbnail} alt="Thumbnail preview" className="rounded-lg w-full max-w-sm" />}
                </div>
            );
            case 'module': return selectedModule ? (
                 <InputField label="Module Title" value={selectedModule.title} onChange={v => updateModule(selectedModule.id, v)} />
            ) : null;
            case 'lesson': return selectedModule && selectedLesson ? (
                <div className="space-y-6">
                    <InputField label="Lesson Title" value={selectedLesson.title} onChange={v => updateLesson(selectedModule.id, selectedLesson.id, { title: v })} />
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                           <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Lesson Type</label>
                           <select value={selectedLesson.type} onChange={e => updateLesson(selectedModule.id, selectedLesson.id, { type: e.target.value as LessonType, content: {} })} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-pink-500">
                               <option value={LessonType.TEXT}>Text</option>
                               <option value={LessonType.VIDEO}>Video</option>
                               <option value={LessonType.PDF}>PDF</option>
                               <option value={LessonType.QUIZ}>Quiz</option>
                           </select>
                        </div>
                         <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Duration (minutes)</label>
                            <input type="number" value={selectedLesson.duration} onChange={e => updateLesson(selectedModule.id, selectedLesson.id, { duration: Number(e.target.value) })} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-pink-500" />
                        </div>
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                        <h4 className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-200">Content</h4>
                        {selectedLesson.type === LessonType.TEXT && <RichTextEditor label="Lesson Content" value={selectedLesson.content.text || ''} onChange={v => updateLesson(selectedModule.id, selectedLesson.id, { content: { ...selectedLesson.content, text: v } })} />}
                        {selectedLesson.type === LessonType.VIDEO && <InputField label="YouTube Video ID" value={selectedLesson.content.videoId || ''} onChange={v => updateLesson(selectedModule.id, selectedLesson.id, { content: { ...selectedLesson.content, videoId: v } })} />}
                        {selectedLesson.type === LessonType.PDF && <InputField label="PDF URL" value={selectedLesson.content.pdfUrl || ''} onChange={v => updateLesson(selectedModule.id, selectedLesson.id, { content: { ...selectedLesson.content, pdfUrl: v } })} />}
                        {selectedLesson.type === LessonType.QUIZ && <QuizEditor lesson={selectedLesson} onUpdate={(quizData) => updateLesson(selectedModule.id, selectedLesson.id, { content: { ...selectedLesson.content, quizData } })} />}
                    </div>
                </div>
            ) : null;
            default: return null;
        }
    }

    const handleFinalSave = () => {
        const totalLessons = course.modules.reduce((acc, mod) => acc + mod.lessons.length, 0);
        const totalMinutes = course.modules.reduce((acc, mod) => acc + mod.lessons.reduce((lAcc, l) => lAcc + l.duration, 0), 0);
        const estimatedDuration = Math.round(totalMinutes / 60);
        onSave({ ...course, totalLessons, estimatedDuration });
    };
    
    return (
        <div className="flex flex-col md:flex-row h-full w-full bg-gray-50 dark:bg-gray-800">
            {/* Curriculum Sidebar */}
            <aside className="w-full md:w-96 h-full bg-white dark:bg-gray-900 flex flex-col border-r border-gray-200 dark:border-gray-700">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div onClick={() => setSelectedItem({ type: 'course' })} className={`p-3 rounded-lg cursor-pointer font-bold text-lg ${selectedItem.type === 'course' ? 'bg-pink-100 dark:bg-pink-900/50 text-pink-600' : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}>
                        {course.title || 'Course Settings'}
                    </div>
                </div>
                <div className="flex-grow overflow-y-auto p-2">
                    {course.modules.map(module => (
                        <div key={module.id} className="mb-2">
                            <div className={`flex items-center justify-between p-2 rounded-lg group ${selectedItem.type === 'module' && selectedItem.id === module.id ? 'bg-blue-100 dark:bg-blue-900/50' : 'bg-gray-100 dark:bg-gray-800'}`}>
                                <button onClick={() => setExpandedModules(p => ({...p, [module.id]: !p[module.id]}))} className="p-1">
                                    {expandedModules[module.id] ? <ChevronDownIcon className="w-5 h-5" /> : <ChevronUpIcon className="w-5 h-5" />}
                                </button>
                                <h4 onClick={() => setSelectedItem({ type: 'module', id: module.id })} className="flex-grow font-bold cursor-pointer p-1">{module.title}</h4>
                                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => deleteModule(module.id)} className="p-1 text-red-500 hover:text-red-700"><Trash2Icon className="w-4 h-4" /></button>
                                </div>
                            </div>
                            {expandedModules[module.id] && (
                                <ul className="pl-6 pr-2 py-1 border-l-2 border-gray-200 dark:border-gray-700 ml-4">
                                    {module.lessons.map(lesson => (
                                        <li key={lesson.id} onClick={() => setSelectedItem({ type: 'lesson', moduleId: module.id, lessonId: lesson.id })} className={`flex items-center justify-between gap-2 p-2.5 rounded-md cursor-pointer group ${selectedItem.type === 'lesson' && selectedItem.lessonId === lesson.id ? 'bg-pink-100 dark:bg-pink-900/50 text-pink-600' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                                            <div className="flex items-center gap-2 flex-grow">
                                                {lesson.type === LessonType.VIDEO ? <PlayCircleIcon className="w-5 h-5" /> : lesson.type === LessonType.PDF ? <FileTextIcon className="w-5 h-5" /> : lesson.type === LessonType.QUIZ ? <ClipboardListIcon className="w-5 h-5" /> : <BookOpenIcon className="w-5 h-5" />}
                                                <span className="font-medium text-sm">{lesson.title}</span>
                                            </div>
                                            <button onClick={(e) => { e.stopPropagation(); deleteLesson(module.id, lesson.id); }} className="p-1 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2Icon className="w-4 h-4" /></button>
                                        </li>
                                    ))}
                                    <li><button onClick={() => addLesson(module.id)} className="w-full text-left text-sm text-pink-500 hover:text-pink-700 font-semibold p-2.5 rounded-md hover:bg-pink-100 dark:hover:bg-pink-900/50 flex items-center gap-2"><PlusCircleIcon className="w-5 h-5" />Add Lesson</button></li>
                                </ul>
                            )}
                        </div>
                    ))}
                     <div><button onClick={addModule} className="w-full text-left text-sm text-blue-500 hover:text-blue-700 font-semibold p-3 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 flex items-center gap-2"><PlusCircleIcon className="w-5 h-5" />Add Module</button></div>
                </div>
            </aside>
            {/* Editor Panel */}
            <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-purple-700 dark:text-purple-300">Course Editor</h1>
                        <p className="text-gray-500 mt-1 capitalize">{selectedItem.type} Settings</p>
                    </div>
                    <div>
                        <button onClick={onExit} className="text-gray-600 dark:text-gray-300 font-semibold px-5 py-2.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 mr-2">Cancel</button>
                        <button onClick={handleFinalSave} className="bg-pink-500 text-white font-bold py-2.5 px-8 rounded-lg hover:bg-pink-600">Save Course</button>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md">
                    {renderEditPanel()}
                </div>
            </main>
        </div>
    );
}

// ====================================================================================
// ===== 6. ANALYTICS PAGE (for Instructors)
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


const AnalyticsPage: React.FC<{ user: User; courses: Course[]; enrollments: Enrollment[]; allUsers: User[] }> = ({ user, courses, enrollments, allUsers }) => {

    const instructorCourses = useMemo(() => courses.filter(c => c.instructorId === user.id), [courses, user.id]);
    const instructorCourseIds = useMemo(() => instructorCourses.map(c => c.id), [instructorCourses]);
    
    const instructorEnrollments = useMemo(() => enrollments.filter(e => instructorCourseIds.includes(e.courseId)), [enrollments, instructorCourseIds]);

    const stats = useMemo(() => {
        if (instructorEnrollments.length === 0) {
            return { totalEnrollments: 0, avgCompletion: 0, avgQuizScore: 0, certificatesIssued: 0 };
        }

        const totalEnrollments = instructorEnrollments.length;
        const avgCompletion = instructorEnrollments.reduce((acc, e) => acc + e.progress, 0) / totalEnrollments;
        const certificatesIssued = instructorEnrollments.filter(e => e.progress === 100).length;

        let totalScore = 0;
        let scoreCount = 0;
        instructorEnrollments.forEach(e => {
            Object.values(e.quizScores).forEach(quiz => {
                totalScore += quiz.score;
                scoreCount++;
            });
        });
        const avgQuizScore = scoreCount > 0 ? totalScore / scoreCount : 0;

        return {
            totalEnrollments,
            avgCompletion: Math.round(avgCompletion),
            avgQuizScore: Math.round(avgQuizScore),
            certificatesIssued,
        };
    }, [instructorEnrollments]);

    const coursePerformance = useMemo(() => {
        return instructorCourses.map(course => {
            const courseEnrollments = instructorEnrollments.filter(e => e.courseId === course.id);
            if (courseEnrollments.length === 0) {
                return { id: course.id, title: course.title, students: 0, completion: 0, avgScore: 0 };
            }
            const students = courseEnrollments.length;
            const completion = courseEnrollments.reduce((acc, e) => acc + e.progress, 0) / students;
            
            let totalScore = 0;
            let scoreCount = 0;
            courseEnrollments.forEach(e => {
                 Object.values(e.quizScores).forEach(quiz => {
                    totalScore += quiz.score;
                    scoreCount++;
                });
            });
            const avgScore = scoreCount > 0 ? totalScore / scoreCount : 0;

            return { id: course.id, title: course.title, students, completion: Math.round(completion), avgScore: Math.round(avgScore) };
        });
    }, [instructorCourses, instructorEnrollments]);

    const topStudents = useMemo(() => {
        const studentProgress: Record<string, { id: string, progress: number, courses: number }> = {};

        instructorEnrollments.forEach(enrollment => {
            if (!studentProgress[enrollment.userId]) {
                studentProgress[enrollment.userId] = { id: enrollment.userId, progress: 0, courses: 0 };
            }
            studentProgress[enrollment.userId].progress += enrollment.progress;
            studentProgress[enrollment.userId].courses += 1;
        });
        
        return Object.values(studentProgress)
            .map(p => ({
                ...p,
                avgProgress: p.courses > 0 ? p.progress / p.courses : 0,
                user: allUsers.find(u => u.id === p.id)
            }))
            .filter(s => s.user)
            .sort((a, b) => b.avgProgress - a.avgProgress)
            .slice(0, 5);
    }, [instructorEnrollments, allUsers]);

    const challengingLessons = useMemo(() => {
        const lessonScores: Record<string, { scores: number[], count: number }> = {};
        
        const allQuizzes = instructorCourses.flatMap(c => c.modules.flatMap(m => m.lessons.filter(l => l.type === 'quiz').map(l => ({ ...l, courseId: c.id }))));
        
        allQuizzes.forEach(quiz => {
            lessonScores[quiz.id] = { scores: [], count: 0 };
        });

        instructorEnrollments.forEach(e => {
            Object.entries(e.quizScores).forEach(([lessonId, quizResult]) => {
                if (lessonScores[lessonId]) {
                    lessonScores[lessonId].scores.push(quizResult.score);
                    lessonScores[lessonId].count++;
                }
            });
        });
        
        return Object.entries(lessonScores)
            .filter(([, data]) => data.count > 0)
            .map(([lessonId, data]) => {
                const lesson = allQuizzes.find(l => l.id === lessonId);
                const course = instructorCourses.find(c => c.id === lesson?.courseId);
                return {
                    lessonId,
                    avgScore: data.scores.reduce((a, b) => a + b, 0) / data.count,
                    lessonTitle: lesson?.title,
                    courseTitle: course?.title,
                }
            })
            .sort((a, b) => a.avgScore - b.avgScore)
            .slice(0, 5);

    }, [instructorCourses, instructorEnrollments]);


    return (
        <div className="p-4 md:p-8">
            <div className="text-center max-w-3xl mx-auto">
                <BarChart2Icon className="w-16 h-16 mx-auto text-pink-500" />
                <h1 className="mt-4 text-4xl md:text-5xl font-extrabold text-purple-700 dark:text-purple-300">Instructor Analytics</h1>
                <p className="mt-4 text-lg md:text-xl text-gray-600 dark:text-gray-400">Insights into your courses and student performance.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-16 max-w-7xl mx-auto">
                <StatCard icon={<UsersIcon className="w-8 h-8" />} value={stats.totalEnrollments} label="Total Enrollments" color="from-blue-500 to-cyan-500" />
                <StatCard icon={<BarChart2Icon className="w-8 h-8" />} value={`${stats.avgCompletion}%`} label="Avg. Completion" color="from-pink-500 to-rose-500" />
                <StatCard icon={<ClipboardListIcon className="w-8 h-8" />} value={`${stats.avgQuizScore}%`} label="Avg. Quiz Score" color="from-amber-500 to-orange-500" />
                <StatCard icon={<AwardIcon className="w-8 h-8" />} value={stats.certificatesIssued} label="Certificates Issued" color="from-green-500 to-emerald-600" />
            </div>

            <div className="mt-16 max-w-7xl mx-auto">
                 <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Course Performance</h2>
                 <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                <tr>
                                    <th className="p-4 font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Course Title</th>
                                    <th className="p-4 font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Students</th>
                                    <th className="p-4 font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Completion Rate</th>
                                    <th className="p-4 font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Average Score</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {coursePerformance.length > 0 ? (
                                    coursePerformance.map(course => {
                                        const scoreColor = course.avgScore >= 80 ? 'text-green-600 dark:text-green-400' : course.avgScore >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';
                                        return (
                                            <tr key={course.id}>
                                                <td className="p-4 font-semibold text-blue-600 dark:text-blue-400">{course.title}</td>
                                                <td className="p-4 text-center font-medium text-gray-800 dark:text-gray-200">{course.students}</td>
                                                <td className="p-4"><div className="w-24 mx-auto"><ProgressBar progress={course.completion} /></div></td>
                                                <td className={`p-4 text-center font-bold text-lg ${scoreColor}`}>{course.avgScore}%</td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="text-center p-8 text-gray-500 dark:text-gray-400">
                                            No course performance data available yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Top Students</h2>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-md space-y-3">
                        {topStudents.map((student, index) => (
                            <div key={student.id} className="flex items-center gap-4 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <span className="font-bold text-lg text-pink-500 w-6 text-center">{index + 1}</span>
                                <img src={student.user?.avatar} alt="avatar" className="w-10 h-10 rounded-full" />
                                <div className="flex-grow">
                                    <p className="font-semibold">{student.user?.firstName} {student.user?.lastName}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{student.courses} course(s)</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-lg text-blue-500">{Math.round(student.avgProgress)}%</p>
                                    <p className="text-xs text-gray-500">Avg. Progress</p>
                                </div>
                            </div>
                        ))}
                         {topStudents.length === 0 && <p className="text-center py-8 text-gray-500 dark:text-gray-400">Not enough student data to display.</p>}
                    </div>
                </div>
                 <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Most Challenging Lessons</h2>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-md space-y-3">
                        {challengingLessons.map(lesson => (
                            <div key={lesson.lessonId} className="flex items-center gap-4 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                               <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-md"><ClipboardListIcon className="w-6 h-6 text-red-500" /></div>
                                <div className="flex-grow">
                                    <p className="font-semibold">{lesson.lessonTitle}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{lesson.courseTitle}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-lg text-red-500">{Math.round(lesson.avgScore)}%</p>
                                    <p className="text-xs text-gray-500">Avg. Score</p>
                                </div>
                            </div>
                        ))}
                        {challengingLessons.length === 0 && <p className="text-center py-8 text-gray-500 dark:text-gray-400">No quiz data available to analyze.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};


// ====================================================================================
// ===== 7. USER MANAGEMENT (for Admins)
// ====================================================================================

const UserManagementPage: React.FC<{ allUsers: User[] }> = ({ allUsers }) => {
    const [users, setUsers] = useState(allUsers);
    
    return (
        <div className="p-4 md:p-8">
            <div className="text-center max-w-3xl mx-auto">
                <UsersIcon className="w-16 h-16 mx-auto text-pink-500" />
                <h1 className="mt-4 text-4xl md:text-5xl font-extrabold text-gray-800 dark:text-gray-200">User Management</h1>
                <p className="mt-4 text-lg md:text-xl text-gray-600 dark:text-gray-400">Manage all users on the platform.</p>
                <div className="mt-8">
                    <button className="bg-blue-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-600 transition-all text-lg flex items-center justify-center gap-2 mx-auto">
                        <PlusCircleIcon className="w-6 h-6" /> <span>Add User</span>
                    </button>
                </div>
            </div>
            <div className="mt-16 bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="p-4 font-semibold whitespace-nowrap">User</th>
                                <th className="p-4 font-semibold whitespace-nowrap">Email</th>
                                <th className="p-4 font-semibold whitespace-nowrap">Role</th>
                                <th className="p-4 font-semibold whitespace-nowrap hidden md:table-cell">Joined</th>
                                <th className="p-4 font-semibold whitespace-nowrap">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td className="p-4 whitespace-nowrap"><div className="flex items-center gap-3"><img src={user.avatar} className="w-10 h-10 rounded-full" alt={`${user.firstName} ${user.lastName}`} /><div><p className="font-semibold">{user.firstName} {user.lastName}</p><p className="text-sm text-gray-500 truncate max-w-[100px]">{user.id}</p></div></div></td>
                                    <td className="p-4 whitespace-nowrap">{user.email}</td>
                                    <td className="p-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${user.role === Role.ADMIN ? 'bg-red-100 text-red-800' : user.role === Role.INSTRUCTOR ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>{user.role}</span></td>
                                    <td className="p-4 whitespace-nowrap hidden md:table-cell">{new Date(user.createdAt).toLocaleDateString()}</td>
                                    <td className="p-4 whitespace-nowrap"><div className="flex items-center gap-1"><button className="text-blue-500 hover:text-blue-600 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"><EditIcon className="w-5 h-5"/></button><button className="text-red-500 hover:text-red-600 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"><Trash2Icon className="w-5 h-5"/></button></div></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// ====================================================================================
// ===== 8. PLATFORM SETTINGS (for Admins)
// ====================================================================================

const PlatformSettingsPage: React.FC = () => {
    return (
        <div className="p-4 md:p-8">
            <div className="text-center max-w-3xl mx-auto">
                <SettingsIcon className="w-16 h-16 mx-auto text-pink-500" />
                <h1 className="mt-4 text-4xl md:text-5xl font-extrabold text-gray-800 dark:text-gray-200">Platform Settings</h1>
                <p className="mt-4 text-lg md:text-xl text-gray-600 dark:text-gray-400">Configure global settings for the LMS.</p>
            </div>
            <div className="mt-16 space-y-8 max-w-2xl mx-auto">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">General</h3>
                    <div className="mt-4 space-y-4">
                         <div><label className="font-semibold">Platform Name</label><input type="text" defaultValue="Nexus by Intersect" className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600" /></div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Integrations</h3>
                    <p className="text-sm text-gray-500 mt-1 mb-4">Connect third-party tools (e.g. content libraries, external apps).</p>
                    <div className="border-t dark:border-gray-700 pt-4 text-center text-gray-500">Integration management UI would go here.</div>
                </div>
            </div>
        </div>
    );
}

// ====================================================================================
// ===== 9. CALENDAR PAGE
// ====================================================================================

const CalendarPage: React.FC<{ events: CalendarEvent[], courses: Course[] }> = ({ events, courses }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDayEvents, setSelectedDayEvents] = useState<CalendarEvent[] | null>(null);
    const [calendarView, setCalendarView] = useState<'month' | 'week' | 'agenda'>('month');

    const daysOfWeek = useMemo(() => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], []);

    const handleNavigateDate = (offset: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            if (calendarView === 'month') {
                newDate.setMonth(newDate.getMonth() + offset);
            } else if (calendarView === 'week') {
                newDate.setDate(newDate.getDate() + (offset * 7));
            }
            return newDate;
        });
    };

    const displayDate = useMemo(() => {
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        if (calendarView === 'month') {
            return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
        }
        if (calendarView === 'week') {
            const startOfWeek = new Date(currentDate);
            startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(endOfWeek.getDate() + 6);
            
            const startMonth = monthNames[startOfWeek.getMonth()].substring(0,3);
            const endMonth = monthNames[endOfWeek.getMonth()].substring(0,3);
            
            if (startOfWeek.getFullYear() !== endOfWeek.getFullYear()) {
                 return `${startMonth} ${startOfWeek.getDate()}, ${startOfWeek.getFullYear()} - ${endMonth} ${endOfWeek.getDate()}, ${endOfWeek.getFullYear()}`;
            }
            if (startMonth === endMonth) {
                return `${startMonth} ${startOfWeek.getDate()} - ${endOfWeek.getDate()}, ${endOfWeek.getFullYear()}`;
            }
            return `${startMonth} ${startOfWeek.getDate()} - ${endMonth} ${endOfWeek.getDate()}, ${endOfWeek.getFullYear()}`;
        }
        return "Agenda";
    }, [currentDate, calendarView]);

    const eventTypeColors: Record<CalendarEvent['type'], string> = {
        deadline: 'bg-red-500',
        live_session: 'bg-blue-500',
        assignment: 'bg-yellow-500',
    };

    const renderMonthView = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        let monthGrid = [];
        for (let i = 0; i < firstDayOfMonth; i++) monthGrid.push(null);
        for (let i = 1; i <= daysInMonth; i++) monthGrid.push(i);

        const getEventsForDay = (day: number) => {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            return events.filter(e => e.date === dateStr);
        };
        
        return (
            <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 border border-gray-200 dark:border-gray-700">
                {daysOfWeek.map(day => <div key={day} className="text-center font-semibold p-2 bg-gray-50 dark:bg-gray-700/50">{day}</div>)}
                {monthGrid.map((day, index) => {
                    const dayEvents = day ? getEventsForDay(day) : [];
                    const isToday = new Date().getFullYear() === year && new Date().getMonth() === month && new Date().getDate() === day;
                    return (
                        <div key={index} onClick={() => dayEvents.length > 0 && setSelectedDayEvents(dayEvents)} className={`p-2 h-28 bg-white dark:bg-gray-800 overflow-hidden ${dayEvents.length > 0 ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50' : ''}`}>
                            {day && <span className={`flex items-center justify-center w-7 h-7 rounded-full ${isToday ? 'bg-pink-500 text-white font-bold' : ''}`}>{day}</span>}
                            <div className="mt-1 space-y-1">
                                {dayEvents.slice(0, 2).map(event => (
                                    <div key={event.id} className={`text-xs text-white p-1 rounded-md flex items-center gap-1.5 ${eventTypeColors[event.type]}`}>
                                        <div className={`w-2 h-2 rounded-full bg-white/80`}></div>
                                        <span className="truncate">{event.title}</span>
                                    </div>
                                ))}
                                {dayEvents.length > 2 && <div className="text-xs text-gray-500">+{dayEvents.length - 2} more</div>}
                            </div>
                        </div>
                    )
                })}
            </div>
        );
    };

    const renderWeekView = () => {
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        const weekDays = Array.from({length: 7}).map((_, i) => {
            const day = new Date(startOfWeek);
            day.setDate(day.getDate() + i);
            return day;
        });

        const getEventsForDay = (date: Date) => {
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            return events.filter(e => e.date === dateStr);
        };

        return (
            <div className="grid grid-cols-1 md:grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 border border-gray-200 dark:border-gray-700">
                {weekDays.map((day, index) => {
                    const dayEvents = getEventsForDay(day);
                    const isToday = new Date().toDateString() === day.toDateString();
                    return (
                        <div key={index} className="bg-white dark:bg-gray-800 flex flex-col">
                            <div className="text-center font-semibold p-2 border-b border-gray-200 dark:border-gray-700">
                                {daysOfWeek[day.getDay()]} <span className={`p-1 rounded-full ${isToday ? 'bg-pink-500 text-white' : ''}`}>{day.getDate()}</span>
                            </div>
                            <div className="p-2 space-y-2 flex-grow h-96 overflow-y-auto">
                                {dayEvents.map(event => (
                                    <div key={event.id} className={`text-xs text-white p-2 rounded-md ${eventTypeColors[event.type]}`}>
                                        <p className="font-bold">{event.title}</p>
                                        {event.courseId && <p className="opacity-80">{courses.find(c => c.id === event.courseId)?.title}</p>}
                                    </div>
                                ))}
                                {dayEvents.length === 0 && <div className="h-full"></div>}
                            </div>
                        </div>
                    );
                })}
            </div>
        )
    };
    
    const renderAgendaView = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const agendaEvents = events
            .filter(e => new Date(e.date + 'T00:00:00') >= today)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .reduce((acc, event) => {
                const dateKey = new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                if (!acc[dateKey]) acc[dateKey] = [];
                acc[dateKey].push(event);
                return acc;
            }, {} as Record<string, CalendarEvent[]>);

        return (
             <div className="space-y-8 max-w-4xl mx-auto">
                {Object.keys(agendaEvents).length > 0 ? Object.entries(agendaEvents).map(([date, eventsOnDay]) => (
                    <div key={date}>
                        <h3 className="font-bold text-lg text-pink-500 pb-2 border-b border-gray-200 dark:border-gray-700">{date}</h3>
                        <div className="mt-4 space-y-3">
                            {eventsOnDay.map(event => (
                                <div key={event.id} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${eventTypeColors[event.type]}`}></div>
                                    <div className="flex-grow">
                                        <p className="font-semibold">{event.title}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{event.type.replace('_', ' ')}</p>
                                    </div>
                                    {event.courseId && <p className="text-sm font-semibold text-blue-500">{courses.find(c => c.id === event.courseId)?.title}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">No upcoming events.</div>
                )}
            </div>
        );
    };


    return (
        <div className="p-4 md:p-8">
            <div className="text-center max-w-3xl mx-auto">
                <CalendarIcon className="w-16 h-16 mx-auto text-pink-500" />
                <h1 className="mt-4 text-4xl md:text-5xl font-extrabold text-blue-700 dark:text-blue-300">Calendar</h1>
                <p className="mt-4 text-lg md:text-xl text-gray-600 dark:text-gray-400">Keep track of your deadlines and events.</p>
            </div>
            
            <div className="mt-16 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                    <div className="flex items-center gap-2">
                        <button onClick={() => handleNavigateDate(-1)} disabled={calendarView === 'agenda'} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronLeftIcon className="w-6 h-6"/></button>
                        <h2 className="text-xl md:text-2xl font-bold text-center w-48 sm:w-64">{displayDate}</h2>
                        <button onClick={() => handleNavigateDate(1)} disabled={calendarView === 'agenda'} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronRightIcon className="w-6 h-6"/></button>
                    </div>
                     <div className="flex items-center p-1 bg-gray-100 dark:bg-gray-700 rounded-lg self-center">
                        <button onClick={() => setCalendarView('month')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-all ${calendarView === 'month' ? 'bg-white dark:bg-gray-800 shadow text-pink-500' : 'text-gray-600 dark:text-gray-300'}`}>Month</button>
                        <button onClick={() => setCalendarView('week')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-all ${calendarView === 'week' ? 'bg-white dark:bg-gray-800 shadow text-pink-500' : 'text-gray-600 dark:text-gray-300'}`}>Week</button>
                        <button onClick={() => setCalendarView('agenda')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-all ${calendarView === 'agenda' ? 'bg-white dark:bg-gray-800 shadow text-pink-500' : 'text-gray-600 dark:text-gray-300'}`}>Agenda</button>
                    </div>
                </div>
                
                {calendarView === 'month' && renderMonthView()}
                {calendarView === 'week' && renderWeekView()}
                {calendarView === 'agenda' && renderAgendaView()}
            </div>

            {selectedDayEvents && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelectedDayEvents(null)}>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-xl font-bold">Events for {new Date(selectedDayEvents[0].date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</h3>
                             <button onClick={() => setSelectedDayEvents(null)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><XIcon className="w-6 h-6"/></button>
                        </div>
                        <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
                            {selectedDayEvents.map(event => (
                                <div key={event.id} className="flex items-start gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <div className={`mt-1 w-3 h-3 rounded-full flex-shrink-0 ${eventTypeColors[event.type]}`}></div>
                                    <div>
                                        <p className="font-semibold">{event.title}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{event.type.replace('_', ' ')}</p>
                                        {event.courseId && <p className="text-sm text-blue-500">{courses.find(c => c.id === event.courseId)?.title}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


// ====================================================================================
// ===== 10. HISTORY PAGE
// ====================================================================================

const timeSince = (dateString: string): string => {
    const seconds = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return "just now";
}


const HistoryPage: React.FC<{ logs: HistoryLog[], user: User }> = ({ logs, user }) => {
    const userLogs = logs.filter(log => log.userId === user.id);

    const actionIcons: Record<HistoryAction, React.ReactNode> = {
        'course_enrolled': <BookOpenIcon className="w-5 h-5 text-white" />,
        'lesson_completed': <CheckCircle2Icon className="w-5 h-5 text-white" />,
        'quiz_passed': <ClipboardListIcon className="w-5 h-5 text-white" />,
        'certificate_earned': <AwardIcon className="w-5 h-5 text-white" />,
        'discussion_posted': <MessageSquareIcon className="w-5 h-5 text-white" />,
    };

    const actionColors: Record<HistoryAction, string> = {
        'course_enrolled': 'bg-blue-500',
        'lesson_completed': 'bg-green-500',
        'quiz_passed': 'bg-purple-500',
        'certificate_earned': 'bg-yellow-500',
        'discussion_posted': 'bg-pink-500',
    };

    const actionText: Record<HistoryAction, string> = {
        'course_enrolled': 'Enrolled in course',
        'lesson_completed': 'Completed lesson',
        'quiz_passed': 'Passed quiz',
        'certificate_earned': 'Earned certificate for',
        'discussion_posted': 'Posted in',
    };

    return (
        <div className="p-4 md:p-8">
            <div className="text-center max-w-3xl mx-auto">
                <HistoryIcon className="w-16 h-16 mx-auto text-pink-500" />
                <h1 className="mt-4 text-4xl md:text-5xl font-extrabold text-blue-700 dark:text-blue-300">My History</h1>
                <p className="mt-4 text-lg md:text-xl text-gray-600 dark:text-gray-400">A timeline of your recent activity.</p>
            </div>

            <div className="mt-16 max-w-3xl mx-auto">
                {userLogs.map(log => (
                    <div key={log.id} className="flex items-start gap-4 mb-6">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${actionColors[log.action]}`}>
                            {actionIcons[log.action]}
                        </div>
                        <div className="flex-grow pt-1">
                            <p className="font-semibold text-gray-800 dark:text-gray-200">
                                {actionText[log.action]} <span className="text-blue-600 dark:text-blue-400">"{log.targetName}"</span>
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{timeSince(log.timestamp)}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ====================================================================================
// ===== 11. LIVE SESSIONS PAGE (for Instructors)
// ====================================================================================

const NewSessionModal: React.FC<{
    user: User;
    courses: Course[];
    onClose: () => void;
    onSchedule: (session: LiveSession) => void;
}> = ({ user, courses, onClose, onSchedule }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dateTime, setDateTime] = useState('');
    const [duration, setDuration] = useState(60);
    const [audience, setAudience] = useState('all');

    const instructorCourses = courses.filter(c => c.instructorId === user.id);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !dateTime) {
            alert('Please fill in title, date, and time.');
            return;
        }

        const newSession: LiveSession = {
            id: `ls-${Date.now()}`,
            title,
            description,
            dateTime,
            duration,
            instructorId: user.id,
            audience,
        };
        onSchedule(newSession);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-blue-700 dark:text-blue-300">Schedule New Live Session</h2>
                    <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><XIcon className="w-6 h-6"/></button>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto">
                    <div>
                        <label className="block text-sm font-semibold mb-1">Session Title</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700"/>
                    </div>
                     <div>
                        <label className="block text-sm font-semibold mb-1">Description</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold mb-1">Date & Time</label>
                            <input type="datetime-local" value={dateTime} onChange={e => setDateTime(e.target.value)} required className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700"/>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-1">Duration (minutes)</label>
                            <input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} required className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700"/>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-1">Invite Audience</label>
                        <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <div className="flex flex-wrap gap-4">
                                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="audience" value="all" checked={audience === 'all'} onChange={e => setAudience(e.target.value)} className="h-4 w-4 text-pink-600"/> All My Students</label>
                                {instructorCourses.map(course => (
                                    <label key={course.id} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="audience" value={course.id} checked={audience === course.id} onChange={e => setAudience(e.target.value)} className="h-4 w-4 text-pink-600"/> {course.title}</label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 text-right space-x-2">
                    <button type="button" onClick={onClose} className="text-gray-600 dark:text-gray-300 font-semibold px-5 py-2.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700">Cancel</button>
                    <button type="submit" className="bg-pink-500 text-white font-bold py-2.5 px-6 rounded-lg hover:bg-pink-600">Schedule Session</button>
                </div>
            </form>
        </div>
    );
};


const LiveSessionsPage: React.FC<{
    user: User;
    liveSessions: LiveSession[];
    courses: Course[];
    onScheduleSession: (session: LiveSession) => void;
}> = ({ user, liveSessions, courses, onScheduleSession }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const now = new Date();

    const instructorSessions = useMemo(() => {
        return liveSessions
            .filter(s => s.instructorId === user.id)
            .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
    }, [liveSessions, user.id]);

    const upcomingSessions = instructorSessions.filter(s => new Date(s.dateTime) >= now);
    const pastSessions = instructorSessions.filter(s => new Date(s.dateTime) < now);
    
    const getAudienceName = (audience: string) => {
        if (audience === 'all') return 'All Students';
        return courses.find(c => c.id === audience)?.title || 'Specific Course';
    };

    return (
        <div className="p-4 md:p-8">
            {isModalOpen && <NewSessionModal user={user} courses={courses} onClose={() => setIsModalOpen(false)} onSchedule={onScheduleSession} />}
            <div className="text-center max-w-3xl mx-auto">
                <VideoIcon className="w-16 h-16 mx-auto text-pink-500" />
                <h1 className="mt-4 text-4xl md:text-5xl font-extrabold text-purple-700 dark:text-purple-300">Live Sessions</h1>
                <p className="mt-4 text-lg md:text-xl text-gray-600 dark:text-gray-400">Schedule and manage your live webinars and Q&As.</p>
                <div className="mt-8">
                    <button onClick={() => setIsModalOpen(true)} className="bg-pink-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-pink-600 transition-all text-lg flex items-center justify-center gap-2 mx-auto">
                        <PlusCircleIcon className="w-6 h-6" /> <span>Schedule Session</span>
                    </button>
                </div>
            </div>

            <div className="mt-16 space-y-10">
                <section>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Upcoming Sessions</h2>
                    {upcomingSessions.length > 0 ? (
                        <div className="space-y-4">
                            {upcomingSessions.map(session => (
                                <div key={session.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-md flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-lg text-blue-600 dark:text-blue-400">{session.title}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(session.dateTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} &bull; {session.duration} min</p>
                                        <p className="text-sm mt-1">Audience: <span className="font-semibold">{getAudienceName(session.audience)}</span></p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button className="p-2 text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"><EditIcon className="w-5 h-5"/></button>
                                        <button className="p-2 text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"><Trash2Icon className="w-5 h-5"/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-500 dark:text-gray-400">No upcoming sessions scheduled.</div>
                    )}
                </section>
                <section>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Past Sessions</h2>
                     {pastSessions.length > 0 ? (
                        <div className="space-y-4">
                            {pastSessions.map(session => (
                                <div key={session.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm opacity-70">
                                    <p className="font-bold text-lg text-gray-600 dark:text-gray-300">{session.title}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(session.dateTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} &bull; {session.duration} min</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                         <div className="text-center py-12 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-500 dark:text-gray-400">No past sessions found.</div>
                    )}
                </section>
            </div>
        </div>
    );
};


// ====================================================================================
// ===== EXPORTED WRAPPER COMPONENT =====
// ====================================================================================
type ManagementPagesProps = {
    view: string;
    user: User;
    courses: Course[];
    enrollments: Enrollment[];
    allUsers: User[];
    onEditCourse?: (course: Course) => void;
    onSelectCourse?: (course: Course) => void;
    courseToEdit?: Course | null;
    onSave?: (course: Course) => void;
    onExit?: () => void;
    // For Inbox
    conversations?: Conversation[];
    messages?: Message[];
    onSendMessage?: (recipients: string[], subject: string, content: string) => void;
    onUpdateMessages?: (messages: Message[]) => void;
    // For Calendar & History
    calendarEvents?: CalendarEvent[];
    historyLogs?: HistoryLog[];
    // For Live Sessions
    liveSessions?: LiveSession[];
    onScheduleSession?: (session: LiveSession) => void;
}

export const ManagementPages: React.FC<ManagementPagesProps> = (props) => {
    switch(props.view) {
        case 'certifications':
            return <CertificationPageComponent user={props.user} courses={props.courses} enrollments={props.enrollments} />;
        case 'my-courses':
            return <MyCoursesPage user={props.user} courses={props.courses} onEditCourse={props.onEditCourse!} onSelectCourse={props.onSelectCourse!} />;
        case 'student-management':
            return <StudentManagementPage user={props.user} allUsers={props.allUsers} courses={props.courses} enrollments={props.enrollments} />;
        case 'inbox':
            return <InboxPage user={props.user} allUsers={props.allUsers} courses={props.courses} enrollments={props.enrollments} conversations={props.conversations!} messages={props.messages!} onSendMessage={props.onSendMessage!} onUpdateMessages={props.onUpdateMessages!} />;
        case 'course-editor':
            return <CourseEditor user={props.user} course={props.courseToEdit!} onSave={props.onSave!} onExit={props.onExit!} />;
        case 'analytics':
            return <AnalyticsPage user={props.user} courses={props.courses} enrollments={props.enrollments} allUsers={props.allUsers} />;
        case 'user-management':
            return <UserManagementPage allUsers={props.allUsers} />;
        case 'platform-settings':
            return <PlatformSettingsPage />;
        case 'calendar':
            return <CalendarPage events={props.calendarEvents!} courses={props.courses} />;
        case 'history':
            return <HistoryPage logs={props.historyLogs!} user={props.user} />;
        case 'live-sessions':
            return <LiveSessionsPage user={props.user} liveSessions={props.liveSessions!} courses={props.courses} onScheduleSession={props.onScheduleSession!} />;
        case 'help':
            return <HelpPage user={props.user} />;
        default:
            return <div className="p-8"><h1 className="text-2xl">Page Not Found</h1></div>;
    }
}