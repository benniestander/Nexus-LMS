

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Course, Enrollment, User, Role, Lesson, Module, LessonType, Question, QuizData, Conversation, Message, CalendarEvent, HistoryLog, HistoryAction, LiveSession } from '../types';
import { AwardIcon, BarChart2Icon, BookOpenIcon, CheckCircle2Icon, ChevronDownIcon, ChevronUpIcon, EditIcon, FileTextIcon, GripVerticalIcon, PlusCircleIcon, SettingsIcon, Trash2Icon, UsersIcon, PlayCircleIcon, ClipboardListIcon, XIcon, SearchIcon, DownloadIcon, MailIcon, SendIcon, CalendarIcon, ChevronLeftIcon, ChevronRightIcon, HistoryIcon, MessageSquareIcon, VideoIcon, UserCircleIcon } from '../components/Icons';
// FIX: Removed unused import from a non-existent file.
import { RichTextEditor } from '../components/RichTextEditor';
import { CourseCard } from '../components/CourseCard';
import { ProgressBar } from '../components/ProgressBar';
import { HelpPage } from './HelpPage';
import * as api from '../supabaseApi';


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
                            <div className="flex items-center gap-4"><div className="bg-blue-100 dark:bg-blue-900/50 p-4 rounded-xl"><AwardIcon className="w-10 h-10 text-blue-600 dark:text-blue-400" /></div><div><h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">{course.title}</h3><p className="text-gray-500 dark:text-gray-400">Completed on: {new Date().toLocaleDateString()}</p></div></div><button onClick={() => handleDownload(course)} disabled={isDownloading === course.id} className="bg-pink-500 text-white font-semibold py-2.5 px-5 rounded-lg hover:bg-pink-600 transition-all w-full sm:w-auto flex items-center justify-center gap-2 disabled:bg-gray-400"><DownloadIcon className="w-5 h-5" />{isDownloading === course.id ? 'Downloading...' : 'Download'}</button>
                        </div>
                    ))}</div>
                ) : (
                    <div className="text-center py-16 bg-gray-100 dark:bg-gray-800/50 rounded-2xl"><p className="text-xl text-gray-500 dark:text-gray-400">You have not earned any certificates yet.</p><p className="mt-2 text-gray-500">Complete a course to see your certificate here!</p></div>
                )}
            </div>
            <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
                {completedCourses.map(course => (
                    <CertificateTemplate key={course.id} course={course} user={user} completionDate={new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} />
                ))}
            </div>
        </div>
    );
}


// ====================================================================================
// ===== 2. USER MANAGEMENT PAGE (for Admins)
// ====================================================================================

const UserEditModal: React.FC<{ user: User | null; isOpen: boolean; onClose: () => void; onSave: (updatedUser: User) => void; }> = ({ user, isOpen, onClose, onSave }) => {
    const [formData, setFormData] = useState<{ firstName: string; lastName: string; role: Role }>({ firstName: '', lastName: '', role: Role.STUDENT });

    useEffect(() => {
        if (user) {
            setFormData({
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                role: user.role,
            });
        }
    }, [user]);

    if (!isOpen || !user) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...user, ...formData });
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Edit User</h2>
                    <p className="text-gray-500 dark:text-gray-400">Update user profile and role.</p>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <div><label className="block text-sm font-bold mb-1 text-gray-700 dark:text-gray-300">First Name</label><input type="text" name="firstName" value={formData.firstName} onChange={handleChange} className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600"/></div>
                             <div><label className="block text-sm font-bold mb-1 text-gray-700 dark:text-gray-300">Last Name</label><input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600"/></div>
                        </div>
                        <div>
                             <label className="block text-sm font-bold mb-1 text-gray-700 dark:text-gray-300">Role</label>
                             <select name="role" value={formData.role} onChange={handleChange} className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
                                {Object.values(Role).map(role => <option key={role} value={role} className="capitalize">{role}</option>)}
                             </select>
                        </div>
                    </div>
                    <div className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg font-semibold bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
                        <button type="submit" className="px-4 py-2 rounded-lg font-semibold text-white bg-pink-500 hover:bg-pink-600">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AddUserModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Add New User</h2>
                </div>
                <div className="p-6">
                    <p className="text-gray-600 dark:text-gray-400">For security, new users must be created through the Supabase Authentication dashboard. This ensures that passwords are handled securely.</p>
                    <p className="mt-4 text-sm text-gray-500">Go to your Supabase project -> Authentication -> Add user.</p>
                </div>
                <div className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg font-semibold bg-pink-500 text-white hover:bg-pink-600">Got it</button>
                </div>
            </div>
        </div>
    );
}

const UserManagementPage: React.FC<{ users: User[], onRefetchData: () => void; }> = ({ users, onRefetchData }) => {
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const handleEditClick = (user: User) => {
        setSelectedUser(user);
        setIsEditModalOpen(true);
    };

    const handleSaveUser = async (updatedUser: User) => {
        if (!updatedUser) return;
        const { success } = await api.updateUserProfile(updatedUser.id, {
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            role: updatedUser.role,
        });
        if (success) {
            onRefetchData();
        } else {
            alert("Failed to update user. Check console for details.");
        }
        setIsEditModalOpen(false);
        setSelectedUser(null);
    };

    const RoleBadge: React.FC<{ role: Role }> = ({ role }) => {
        const colors = {
            [Role.ADMIN]: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
            [Role.INSTRUCTOR]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
            [Role.STUDENT]: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        };
        return <span className={`px-2.5 py-1 text-sm font-semibold rounded-full capitalize ${colors[role] || ''}`}>{role}</span>;
    };

    return (
        <div className="p-4 md:p-8">
            <UserEditModal user={selectedUser} isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onSave={handleSaveUser} />
            <AddUserModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />

            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-3"><UsersIcon className="w-10 h-10 text-pink-500" /> User Management</h1>
                    <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">Manage all users on the platform.</p>
                </div>
                <button onClick={() => setIsAddModalOpen(true)} className="bg-pink-500 text-white font-semibold py-2.5 px-5 rounded-lg hover:bg-pink-600 transition-all flex items-center justify-center gap-2"><PlusCircleIcon className="w-5 h-5"/> Add User</button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="border-b border-gray-200 dark:border-gray-700">
                        <tr>
                            <th className="p-4 text-sm font-semibold text-gray-500 dark:text-gray-400">User</th>
                            <th className="p-4 text-sm font-semibold text-gray-500 dark:text-gray-400">Email</th>
                            <th className="p-4 text-sm font-semibold text-gray-500 dark:text-gray-400">Role</th>
                            <th className="p-4 text-sm font-semibold text-gray-500 dark:text-gray-400">Joined</th>
                            <th className="p-4 text-sm font-semibold text-gray-500 dark:text-gray-400">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} className="border-b border-gray-200 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="p-4 font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center"><UserCircleIcon className="w-6 h-6 text-gray-500"/></div>
                                    {user.firstName || user.lastName ? `${user.firstName} ${user.lastName}`: 'N/A'}
                                </td>
                                <td className="p-4 text-gray-600 dark:text-gray-300">{user.email}</td>
                                <td className="p-4"><RoleBadge role={user.role} /></td>
                                <td className="p-4 text-gray-600 dark:text-gray-300">{new Date(user.createdAt).toLocaleDateString()}</td>
                                <td className="p-4">
                                    <div className="flex gap-2">
                                        <button onClick={() => handleEditClick(user)} className="p-2 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-md"><EditIcon className="w-5 h-5"/></button>
                                        <button className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md" title="Delete user from Supabase dashboard"><Trash2Icon className="w-5 h-5"/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ====================================================================================
// ===== 3. OTHER PAGES (My Courses, Inbox, etc.) - Simplified placeholders
// ====================================================================================

const PlaceholderPage: React.FC<{ title: string; icon: React.ReactNode }> = ({ title, icon }) => (
    <div className="p-4 md:p-8 h-full flex items-center justify-center text-center">
        <div>
            <div className="w-20 h-20 mx-auto text-pink-500">{icon}</div>
            <h1 className="mt-4 text-4xl md:text-5xl font-extrabold text-gray-800 dark:text-gray-200">{title}</h1>
            <p className="mt-4 text-lg md:text-xl text-gray-600 dark:text-gray-400">This feature is under construction. Check back soon!</p>
        </div>
    </div>
);


const CourseEditor: React.FC<{ course: Course | null, onSave: (course: Course) => void, onExit: () => void }> = ({ course, onSave, onExit }) => {
    /* ... A full-featured course editor would be complex. This is a simplified version ... */
    const [editedCourse, setEditedCourse] = useState<Course | null>(null);
    
    useEffect(() => {
        if (course) {
            setEditedCourse(JSON.parse(JSON.stringify(course))); // deep copy
        } else {
            // Create a new course structure
        }
    }, [course]);
    
    if (!editedCourse) return <div>Loading course editor...</div>

    return <PlaceholderPage title="Course Editor" icon={<EditIcon />} />;
};

// ====================================================================================
// ===== 4. MAIN WRAPPER COMPONENT
// ====================================================================================

interface ManagementPagesProps {
    view: string;
    user: User;
    courses: Course[];
    enrollments: Enrollment[];
    allUsers: User[];
    conversations: Conversation[];
    messages: Message[];
    calendarEvents: CalendarEvent[];
    historyLogs: HistoryLog[];
    liveSessions: LiveSession[];
    onEditCourse?: (course: Course) => void;
    onSelectCourse?: (course: Course) => void;
    courseToEdit?: Course | null;
    onSave?: (course: Course) => void;
    onExit?: () => void;
    onSendMessage?: (recipientIds: string[], subject: string, content: string) => void;
    onUpdateMessages?: (messages: Message[]) => void;
    onScheduleSession?: (session: Omit<LiveSession, 'id'>) => void;
    onRefetchData: () => void;
}

export const ManagementPages: React.FC<ManagementPagesProps> = (props) => {
    switch(props.view) {
        // --- STUDENT ---
        case 'certifications':
            return <CertificationPageComponent user={props.user} courses={props.courses} enrollments={props.enrollments} />;
        case 'inbox':
            return <PlaceholderPage title="Inbox" icon={<MailIcon />} />;
        case 'calendar':
             return <PlaceholderPage title="Calendar" icon={<CalendarIcon />} />;
        case 'history':
             return <PlaceholderPage title="History" icon={<HistoryIcon />} />;
        case 'help':
             return <HelpPage user={props.user} />;

        // --- INSTRUCTOR ---
        case 'my-courses':
            return <PlaceholderPage title="My Courses" icon={<BookOpenIcon />} />;
        case 'student-management':
             return <PlaceholderPage title="Student Management" icon={<UsersIcon />} />;
        case 'live-sessions':
             return <PlaceholderPage title="Live Sessions" icon={<VideoIcon />} />;
        case 'analytics':
            return <PlaceholderPage title="Analytics" icon={<BarChart2Icon />} />;
        case 'course-editor':
            if (props.courseToEdit && props.onSave && props.onExit) {
                return <CourseEditor course={props.courseToEdit} onSave={props.onSave} onExit={props.onExit} />;
            }
            return <div>Error: Course editor requires course data.</div>

        // --- ADMIN ---
        case 'user-management':
            return <UserManagementPage users={props.allUsers} onRefetchData={props.onRefetchData} />;
        case 'platform-settings':
            return <PlaceholderPage title="Platform Settings" icon={<SettingsIcon />} />;
            
        // --- COMMON ---
        case 'profile':
            return <PlaceholderPage title="Profile" icon={<UserCircleIcon />} />;
        
        default:
            return <div>Page not found: {props.view}</div>;
    }
};