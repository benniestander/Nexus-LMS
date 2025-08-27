

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Course, Enrollment, User, Role, Lesson, Module, LessonType, Question, QuizData, Conversation, Message, CalendarEvent, HistoryLog, HistoryAction, LiveSession } from '../types';
import { AwardIcon, BarChart2Icon, BookOpenIcon, CheckCircle2Icon, ChevronDownIcon, ChevronUpIcon, EditIcon, FileTextIcon, GripVerticalIcon, PlusCircleIcon, SettingsIcon, Trash2Icon, UsersIcon, PlayCircleIcon, ClipboardListIcon, XIcon, SearchIcon, DownloadIcon, MailIcon, SendIcon, CalendarIcon, ChevronLeftIcon, ChevronRightIcon, HistoryIcon, MessageSquareIcon, VideoIcon, UserCircleIcon, BoldIcon, ItalicIcon, UnderlineIcon, ListIcon, ListOrderedIcon, ClockIcon } from '../components/Icons';
import { RichTextEditor } from '../components/RichTextEditor';
import { CourseCard } from '../components/CourseCard';
import { ProgressBar } from '../components/ProgressBar';
import { HelpPage } from './HelpPage';
import * as api from '../supabaseApi';
import { supabase } from '../supabaseClient';


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
        .filter((c): c is Course => c !== undefined);

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
// ===== 3. PROFILE PAGE
// ====================================================================================
const ProfilePage: React.FC<{ user: User; onSave: (updates: Partial<User> & { newPassword?: string }) => void; }> = ({ user, onSave }) => {
    const [firstName, setFirstName] = useState(user.firstName);
    const [lastName, setLastName] = useState(user.lastName);
    const [bio, setBio] = useState(user.bio);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleProfileSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        await onSave({ firstName, lastName, bio });
        setIsSaving(false);
    };

    const handlePasswordSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            alert("Passwords do not match.");
            return;
        }
        if (newPassword.length < 6) {
            alert("Password must be at least 6 characters long.");
            return;
        }
        setIsSaving(true);
        await onSave({ newPassword });
        setIsSaving(false);
        setNewPassword('');
        setConfirmPassword('');
    };

    return (
        <div className="p-4 md:p-8">
            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-3"><UserCircleIcon className="w-10 h-10 text-pink-500" /> My Profile</h1>
            <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">Update your personal information and password.</p>

            <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Profile Info Form */}
                <form onSubmit={handleProfileSave} className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md">
                    <h2 className="text-2xl font-bold mb-6">Personal Information</h2>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div><label className="block text-sm font-bold mb-1">First Name</label><input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600" /></div>
                            <div><label className="block text-sm font-bold mb-1">Last Name</label><input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600" /></div>
                        </div>
                        <div><label className="block text-sm font-bold mb-1">Email</label><input type="email" value={user.email} disabled className="w-full p-2 border rounded-lg bg-gray-200 dark:bg-gray-600 dark:border-gray-500 cursor-not-allowed" /></div>
                        <div><label className="block text-sm font-bold mb-1">Bio</label><textarea value={bio} onChange={e => setBio(e.target.value)} rows={4} className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600"></textarea></div>
                    </div>
                    <div className="mt-6 text-right">
                        <button type="submit" disabled={isSaving} className="bg-pink-500 text-white font-semibold py-2.5 px-5 rounded-lg hover:bg-pink-600 disabled:bg-gray-400">{isSaving ? 'Saving...' : 'Save Profile'}</button>
                    </div>
                </form>

                {/* Change Password Form */}
                <form onSubmit={handlePasswordSave} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md">
                    <h2 className="text-2xl font-bold mb-6">Change Password</h2>
                    <div className="space-y-4">
                        <div><label className="block text-sm font-bold mb-1">New Password</label><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600" /></div>
                        <div><label className="block text-sm font-bold mb-1">Confirm New Password</label><input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600" /></div>
                    </div>
                    <div className="mt-6 text-right">
                        <button type="submit" disabled={isSaving || !newPassword} className="bg-blue-500 text-white font-semibold py-2.5 px-5 rounded-lg hover:bg-blue-600 disabled:bg-gray-400">{isSaving ? 'Saving...' : 'Update Password'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// ====================================================================================
// ===== 4. MY COURSES & COURSE EDITOR (Instructor)
// ====================================================================================

const MyCoursesPage: React.FC<{ user: User, courses: Course[], onEditCourse: (course: Course | null) => void }> = ({ user, courses, onEditCourse }) => {
    const instructorCourses = courses.filter(c => c.instructorId === user.id);

    return (
        <div className="p-4 md:p-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-3"><BookOpenIcon className="w-10 h-10 text-pink-500" /> My Courses</h1>
                    <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">Manage, edit, and create new courses.</p>
                </div>
                <button onClick={() => onEditCourse(null)} className="bg-pink-500 text-white font-semibold py-2.5 px-5 rounded-lg hover:bg-pink-600 transition-all flex items-center justify-center gap-2"><PlusCircleIcon className="w-5 h-5"/> Create New Course</button>
            </div>

            {instructorCourses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {instructorCourses.map(course => (
                        <CourseCard key={course.id} course={course} user={user} onEdit={onEditCourse} onSelect={() => {}} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-gray-100 dark:bg-gray-800/50 rounded-2xl">
                    <p className="text-xl text-gray-500 dark:text-gray-400">You haven't created any courses yet.</p>
                    <button onClick={() => onEditCourse(null)} className="mt-4 bg-pink-500 text-white font-semibold py-2.5 px-5 rounded-lg hover:bg-pink-600">Create Your First Course</button>
                </div>
            )}
        </div>
    );
};

const CourseEditor: React.FC<{ courseToEdit: Course | null, user: User, onSave: (course: Course) => void, onExit: () => void }> = ({ courseToEdit, user, onSave, onExit }) => {
    const isNewCourse = !courseToEdit?.id;
    const initialCourseState = useMemo(() => ({
        id: courseToEdit?.id || crypto.randomUUID(),
        title: courseToEdit?.title || '',
        description: courseToEdit?.description || '',
        thumbnail: courseToEdit?.thumbnail || 'https://i.postimg.cc/d3x1YvBf/placeholder-Nexus.jpg',
        category: courseToEdit?.category || '',
        instructorId: courseToEdit?.instructorId || user.id,
        instructorName: courseToEdit?.instructorName || `${user.firstName} ${user.lastName}`,
        modules: courseToEdit?.modules || [],
        totalLessons: courseToEdit?.totalLessons || 0,
        estimatedDuration: courseToEdit?.estimatedDuration || 0,
    }), [courseToEdit, user]);

    const [course, setCourse] = useState<Course>(initialCourseState);
    const [activeModuleId, setActiveModuleId] = useState<string | null>(null);

    const handleCourseChange = (field: keyof Course, value: any) => {
        setCourse(prev => ({ ...prev, [field]: value }));
    };

    const handleAddModule = () => {
        const newModule: Module = {
            id: crypto.randomUUID(),
            courseId: course.id,
            title: `New Module ${course.modules.length + 1}`,
            lessons: [],
            order: course.modules.length,
        };
        handleCourseChange('modules', [...course.modules, newModule]);
    };
    
    // ... More handlers for editing modules, lessons, etc. ...

    return (
        <div className="p-4 md:p-8">
             <div className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-extrabold text-gray-900 dark:text-gray-100">{isNewCourse ? "Create New Course" : "Edit Course"}</h1>
                <div className="flex gap-3">
                    <button onClick={onExit} className="bg-gray-200 dark:bg-gray-600 font-semibold py-2.5 px-5 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
                    <button onClick={() => onSave(course)} className="bg-pink-500 text-white font-semibold py-2.5 px-5 rounded-lg hover:bg-pink-600">Save Course</button>
                </div>
             </div>
             {/* A proper course editor would have tabs for details, curriculum, settings etc. */}
             {/* This is a simplified version */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md">
                 <h2 className="text-2xl font-bold mb-4">Course Details</h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-bold mb-1">Course Title</label><input type="text" value={course.title} onChange={e => handleCourseChange('title', e.target.value)} className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700" /></div>
                    <div><label className="block text-sm font-bold mb-1">Category</label><input type="text" value={course.category} onChange={e => handleCourseChange('category', e.target.value)} className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700" /></div>
                 </div>
                 <div className="mt-4"><label className="block text-sm font-bold mb-1">Description</label><textarea value={course.description} onChange={e => handleCourseChange('description', e.target.value)} rows={4} className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700" /></div>
                 <div className="mt-4"><label className="block text-sm font-bold mb-1">Thumbnail URL</label><input type="text" value={course.thumbnail} onChange={e => handleCourseChange('thumbnail', e.target.value)} className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700" /></div>

                 <h2 className="text-2xl font-bold mt-8 mb-4">Curriculum</h2>
                 <div className="space-y-4">
                    {course.modules.map((mod, index) => (
                        <div key={mod.id} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                            <h3 className="font-bold text-lg">{mod.title}</h3>
                            {/* Lesson management would go here */}
                        </div>
                    ))}
                 </div>
                 <button onClick={handleAddModule} className="mt-4 flex items-center gap-2 text-sm font-semibold text-pink-500 hover:text-pink-600"><PlusCircleIcon className="w-5 h-5"/>Add Module</button>
            </div>
        </div>
    );
};


// ====================================================================================
// ===== 5. STUDENT MANAGEMENT (Instructor)
// ====================================================================================

const StudentManagementPage: React.FC<{ user: User, courses: Course[], enrollments: Enrollment[], allUsers: User[] }> = ({ user, courses, enrollments, allUsers }) => {
    const instructorCourseIds = useMemo(() => courses.filter(c => c.instructorId === user.id).map(c => c.id), [courses, user.id]);
    
    const studentData = useMemo(() => {
        const studentMap = new Map<string, { user: User; enrollments: { courseTitle: string; progress: number }[] }>();
        enrollments.forEach(e => {
            if (instructorCourseIds.includes(e.courseId)) {
                const student = allUsers.find(u => u.id === e.userId);
                const course = courses.find(c => c.id === e.courseId);
                if (student && course) {
                    if (!studentMap.has(student.id)) {
                        studentMap.set(student.id, { user: student, enrollments: [] });
                    }
                    studentMap.get(student.id)!.enrollments.push({ courseTitle: course.title, progress: e.progress });
                }
            }
        });
        return Array.from(studentMap.values());
    }, [instructorCourseIds, enrollments, allUsers, courses]);

    return (
        <div className="p-4 md:p-8">
            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-3"><UsersIcon className="w-10 h-10 text-pink-500" /> Student Management</h1>
            <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">View progress and details for students in your courses.</p>
            <div className="mt-8 bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-x-auto">
                 <table className="w-full text-left">
                    <thead><tr className="border-b dark:border-gray-700"><th className="p-4">Student</th><th className="p-4">Email</th><th className="p-4">Courses & Progress</th></tr></thead>
                    <tbody>
                        {studentData.map(({ user, enrollments }) => (
                            <tr key={user.id} className="border-b dark:border-gray-700 last:border-0">
                                <td className="p-4 font-semibold">{user.firstName} {user.lastName}</td>
                                <td className="p-4 text-gray-600 dark:text-gray-300">{user.email}</td>
                                <td className="p-4">
                                    <div className="space-y-2">
                                    {enrollments.map(e => (
                                        <div key={e.courseTitle}>
                                            <div className="flex justify-between text-sm mb-1"><span className="font-medium">{e.courseTitle}</span><span className="font-bold text-pink-500">{e.progress}%</span></div>
                                            <ProgressBar progress={e.progress} size="sm"/>
                                        </div>
                                    ))}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
            </div>
        </div>
    );
};


// ====================================================================================
// ===== 6. ANALYTICS (Instructor/Admin)
// ====================================================================================

const AnalyticsPage: React.FC<{ user: User, courses: Course[], enrollments: Enrollment[], allUsers: User[] }> = ({ user, courses, enrollments, allUsers }) => {
    const isInstructor = user.role === Role.INSTRUCTOR;
    const isSuperAdmin = user.role === Role.ADMIN;
    
    const relevantCourses = isInstructor ? courses.filter(c => c.instructorId === user.id) : courses;
    const relevantCourseIds = relevantCourses.map(c => c.id);
    const relevantEnrollments = isInstructor ? enrollments.filter(e => relevantCourseIds.includes(e.courseId)) : enrollments;

    const totalStudents = new Set(relevantEnrollments.map(e => e.userId)).size;
    const avgCompletion = relevantEnrollments.length > 0 ? relevantEnrollments.reduce((sum, e) => sum + e.progress, 0) / relevantEnrollments.length : 0;

    const courseEnrollmentData = relevantCourses.map(course => ({
        name: course.title,
        value: enrollments.filter(e => e.courseId === course.id).length
    })).sort((a,b) => b.value - a.value).slice(0, 5);

    return (
        <div className="p-4 md:p-8">
            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-3"><BarChart2Icon className="w-10 h-10 text-pink-500" /> Analytics</h1>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                 <StatCard icon={<UsersIcon className="w-8 h-8" />} value={isSuperAdmin ? allUsers.length : totalStudents} label={isSuperAdmin ? "Total Users" : "Your Students"} color="from-blue-600 to-violet-600" />
                 <StatCard icon={<BookOpenIcon className="w-8 h-8" />} value={relevantCourses.length} label={isSuperAdmin ? "Total Courses" : "Your Courses"} color="from-pink-500 to-rose-500" />
                 <StatCard icon={<CheckCircle2Icon className="w-8 h-8" />} value={`${Math.round(avgCompletion)}%`} label="Avg. Completion" color="from-teal-400 to-cyan-600" />
            </div>
            <div className="mt-16 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md">
                <h3 className="text-xl font-bold">Most Popular Courses</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">By number of enrollments</p>
                <SimpleBarChart data={courseEnrollmentData} color="var(--brand-pink)" />
            </div>
        </div>
    );
}

// ====================================================================================
// ===== 7. INBOX, CALENDAR, HISTORY, SESSIONS, SETTINGS (IMPLEMENTED)
// ====================================================================================

const HistoryPage: React.FC<{ historyLogs: HistoryLog[] }> = ({ historyLogs }) => {
    const iconMap: Record<HistoryAction, React.ReactNode> = {
        course_enrolled: <BookOpenIcon className="w-5 h-5 text-blue-500" />,
        lesson_completed: <CheckCircle2Icon className="w-5 h-5 text-green-500" />,
        quiz_passed: <ClipboardListIcon className="w-5 h-5 text-purple-500" />,
        certificate_earned: <AwardIcon className="w-5 h-5 text-amber-500" />,
        discussion_posted: <MessageSquareIcon className="w-5 h-5 text-pink-500" />,
    };

    const actionTextMap: Record<HistoryAction, string> = {
        course_enrolled: 'Enrolled in course',
        lesson_completed: 'Completed lesson',
        quiz_passed: 'Passed quiz in',
        certificate_earned: 'Earned certificate for',
        discussion_posted: 'Posted in',
    };

    return (
        <div className="p-4 md:p-8">
            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-3"><HistoryIcon className="w-10 h-10 text-pink-500" /> Activity History</h1>
            <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">A log of your recent activity on the platform.</p>
            <div className="mt-8 bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 space-y-4">
                {historyLogs.length > 0 ? (
                    historyLogs.map(log => (
                        <div key={log.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full">{iconMap[log.action]}</div>
                            <div>
                                <p className="font-semibold text-gray-800 dark:text-gray-200">
                                    {actionTextMap[log.action]} <span className="text-blue-600 dark:text-blue-400">"{log.targetName}"</span>
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(log.timestamp).toLocaleString()}</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-center py-8 text-gray-500 dark:text-gray-400">No activity history yet.</p>
                )}
            </div>
        </div>
    )
}

const PlatformSettingsPage: React.FC = () => {
    return (
         <div className="p-4 md:p-8">
            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-3"><SettingsIcon className="w-10 h-10 text-pink-500" /> Platform Settings</h1>
            <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">Manage global settings for the Nexus platform.</p>
             <div className="mt-8 bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 space-y-6">
                <div>
                    <label className="block text-lg font-bold mb-2">General Settings</label>
                    <div className="flex items-center justify-between p-4 border dark:border-gray-700 rounded-lg">
                        <span>Allow public user registration</span>
                         <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" value="" className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 dark:peer-focus:ring-pink-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-pink-600"></div>
                        </label>
                    </div>
                </div>
                 <div>
                    <label className="block text-lg font-bold mb-2">Theme</label>
                    <div className="p-4 border dark:border-gray-700 rounded-lg">
                        <label className="block text-sm font-medium mb-1">Primary Color</label>
                        <input type="color" defaultValue="#FA0073" className="w-24 h-10 p-1 border rounded-lg" />
                    </div>
                 </div>
                 <div className="text-right">
                    <button onClick={() => alert("Settings saved (demo functionality).")} className="bg-pink-500 text-white font-semibold py-2.5 px-5 rounded-lg hover:bg-pink-600">Save Settings</button>
                 </div>
            </div>
        </div>
    )
}

// A full-featured calendar would be complex; this is a simplified implementation.
const CalendarPage: React.FC<{ events: CalendarEvent[] }> = ({ events }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const startOfMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), [currentDate]);
    const endOfMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0), [currentDate]);
    
    const daysInMonth = useMemo(() => {
        const days = [];
        const startDay = startOfMonth.getDay();
        const endDate = endOfMonth.getDate();

        // Add blank days for the start of the month
        for (let i = 0; i < startDay; i++) {
            days.push(null);
        }
        // Add actual days
        for (let i = 1; i <= endDate; i++) {
            days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
        }
        return days;
    }, [startOfMonth, endOfMonth, currentDate]);
    
    const eventColorMap = {
        live_session: 'bg-pink-500',
        deadline: 'bg-red-500',
        assignment: 'bg-blue-500'
    };

    return (
        <div className="p-4 md:p-8">
            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-3"><CalendarIcon className="w-10 h-10 text-pink-500" /> Calendar</h1>
            <div className="mt-8 bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6">
                <div className="flex justify-between items-center mb-4">
                    <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><ChevronLeftIcon /></button>
                    <h2 className="text-2xl font-bold">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
                    <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><ChevronRightIcon /></button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center font-semibold text-gray-500">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} className="py-2">{day}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {daysInMonth.map((day, index) => (
                        <div key={index} className="h-28 border dark:border-gray-700 rounded-lg p-1 overflow-y-auto">
                            {day && (
                                <>
                                    <span className="font-semibold">{day.getDate()}</span>
                                    <div className="mt-1 space-y-1">
                                        {events.filter(e => new Date(e.date).toDateString() === day.toDateString()).map(event => (
                                            <div key={event.id} title={event.title} className={`p-1 rounded text-white text-xs truncate ${eventColorMap[event.type]}`}>{event.title}</div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

const InboxPage: React.FC<{ user: User, conversations: Conversation[], messages: Message[], allUsers: User[], onSendMessage: (recipientIds: string[], subject: string, content: string) => void }> = ({ user, conversations, messages, allUsers, onSendMessage }) => {
    const [selectedConvoId, setSelectedConvoId] = useState<string | null>(null);
    const [newMessage, setNewMessage] = useState('');

    const currentMessages = useMemo(() => {
        if (!selectedConvoId) return [];
        return messages.filter(m => m.conversationId === selectedConvoId).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }, [selectedConvoId, messages]);

    const getOtherParticipant = (convo: Conversation) => {
        const otherId = convo.participantIds.find(id => id !== user.id);
        return allUsers.find(u => u.id === otherId);
    }
    
    const handleSend = () => {
        const convo = conversations.find(c => c.id === selectedConvoId);
        if (!convo || !newMessage.trim()) return;
        const recipient = getOtherParticipant(convo);
        if (!recipient) return;

        onSendMessage([recipient.id], '', newMessage.trim());
        setNewMessage('');
    };

    return (
        <div className="p-4 md:p-8">
            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-3"><MailIcon className="w-10 h-10 text-pink-500" /> Inbox</h1>
             <div className="mt-8 bg-white dark:bg-gray-800 rounded-2xl shadow-md h-[70vh] flex">
                <div className="w-1/3 border-r dark:border-gray-700 flex flex-col">
                    <div className="p-4 border-b dark:border-gray-700 font-bold text-lg">Conversations</div>
                    <div className="overflow-y-auto">
                        {conversations.map(convo => {
                            const otherUser = getOtherParticipant(convo);
                            return (
                                <div key={convo.id} onClick={() => setSelectedConvoId(convo.id)} className={`p-4 border-b dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 ${selectedConvoId === convo.id ? 'bg-pink-50 dark:bg-pink-900/30' : ''}`}>
                                    <p className="font-semibold">{otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : 'Unknown User'}</p>
                                    <p className="text-sm text-gray-500 truncate">Last message...</p>
                                </div>
                            )
                        })}
                    </div>
                </div>
                <div className="w-2/3 flex flex-col">
                    {selectedConvoId ? (
                        <>
                            <div className="p-4 border-b dark:border-gray-700 font-bold text-lg">{getOtherParticipant(conversations.find(c => c.id === selectedConvoId)!)?.firstName}</div>
                            <div className="flex-grow p-4 space-y-4 overflow-y-auto">
                                {currentMessages.map(msg => (
                                    <div key={msg.id} className={`flex ${msg.senderId === user.id ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-md p-3 rounded-lg ${msg.senderId === user.id ? 'bg-pink-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>{msg.content}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="p-4 border-t dark:border-gray-700 flex gap-2">
                                <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type a message..." className="flex-grow p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                                <button onClick={handleSend} className="bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600"><SendIcon className="w-5 h-5"/></button>
                            </div>
                        </>
                    ) : (
                        <div className="flex-grow flex items-center justify-center text-gray-500">Select a conversation to start chatting.</div>
                    )}
                </div>
             </div>
        </div>
    );
};

const LiveSessionsPage: React.FC<{ user: User, courses: Course[], liveSessions: LiveSession[], onScheduleSession: (session: Omit<LiveSession, 'id'>) => void, onDeleteSession: (sessionId: string) => void }> = ({ user, courses, liveSessions, onScheduleSession, onDeleteSession }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const now = new Date();
    const upcomingSessions = liveSessions.filter(s => new Date(s.dateTime) >= now).sort((a,b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
    const pastSessions = liveSessions.filter(s => new Date(s.dateTime) < now).sort((a,b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

    return (
        <div className="p-4 md:p-8">
            {isModalOpen && <ScheduleSessionModal user={user} courses={courses} onClose={() => setIsModalOpen(false)} onSchedule={onScheduleSession} />}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-3"><VideoIcon className="w-10 h-10 text-pink-500" /> Live Sessions</h1>
                    <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">Schedule and manage your live webinars and Q&As.</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="bg-pink-500 text-white font-semibold py-2.5 px-5 rounded-lg hover:bg-pink-600 transition-all flex items-center justify-center gap-2"><PlusCircleIcon className="w-5 h-5"/> Schedule Session</button>
            </div>

            <div className="space-y-12">
                <div>
                    <h2 className="text-2xl font-bold border-b-2 border-pink-500 pb-2 mb-4">Upcoming Sessions</h2>
                    {upcomingSessions.length > 0 ? (
                        <div className="space-y-4">{upcomingSessions.map(s => <SessionCard key={s.id} session={s} courses={courses} onDelete={onDeleteSession} />)}</div>
                    ) : <p className="text-gray-500">No upcoming sessions scheduled.</p>}
                </div>
                 <div>
                    <h2 className="text-2xl font-bold border-b-2 border-gray-300 dark:border-gray-600 pb-2 mb-4">Past Sessions</h2>
                    {pastSessions.length > 0 ? (
                        <div className="space-y-4">{pastSessions.map(s => <SessionCard key={s.id} session={s} courses={courses} onDelete={onDeleteSession} isPast />)}</div>
                    ) : <p className="text-gray-500">No past sessions.</p>}
                </div>
            </div>
        </div>
    );
};

const SessionCard: React.FC<{session: LiveSession, courses: Course[], onDelete: (id: string) => void, isPast?: boolean}> = ({ session, courses, onDelete, isPast }) => {
    const audienceCourse = session.audience !== 'all' ? courses.find(c => c.id === session.audience) : null;
    return (
        <div className={`bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-md flex justify-between items-center ${isPast ? 'opacity-60' : ''}`}>
            <div>
                <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400">{session.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {new Date(session.dateTime).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} • {session.duration} min
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Audience: {audienceCourse ? audienceCourse.title : 'All Students'}
                </p>
            </div>
            {!isPast && (
                <div className="flex gap-2">
                    <button className="p-2 text-gray-500 hover:text-blue-500"><EditIcon className="w-5 h-5" /></button>
                    <button onClick={() => onDelete(session.id)} className="p-2 text-gray-500 hover:text-red-500"><Trash2Icon className="w-5 h-5" /></button>
                </div>
            )}
        </div>
    )
}

const ScheduleSessionModal: React.FC<{user: User, courses: Course[], onClose: () => void, onSchedule: (session: Omit<LiveSession, 'id'>) => void}> = ({ user, courses, onClose, onSchedule }) => {
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [duration, setDuration] = useState(60);
    const [audience, setAudience] = useState('all');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const dateTime = new Date(`${date}T${time}`).toISOString();
        onSchedule({
            title,
            description: '', // Can be added later
            dateTime,
            duration,
            instructorId: user.id,
            audience
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b dark:border-gray-700"><h2 className="text-2xl font-bold">Schedule New Session</h2></div>
                <div className="p-6 space-y-4">
                    <div><label className="block text-sm font-bold mb-1">Title</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700" /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-sm font-bold mb-1">Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700" /></div>
                        <div><label className="block text-sm font-bold mb-1">Time</label><input type="time" value={time} onChange={e => setTime(e.target.value)} required className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700" /></div>
                    </div>
                     <div><label className="block text-sm font-bold mb-1">Duration (minutes)</label><input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} required className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700" /></div>
                     <div><label className="block text-sm font-bold mb-1">Audience</label>
                        <select value={audience} onChange={e => setAudience(e.target.value)} className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700">
                            <option value="all">All Students</option>
                            {courses.filter(c => c.instructorId === user.id).map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </select>
                    </div>
                </div>
                <div className="p-6 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3 rounded-b-2xl">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg font-semibold bg-gray-200 dark:bg-gray-600">Cancel</button>
                    <button type="submit" className="px-4 py-2 rounded-lg font-semibold text-white bg-pink-500 hover:bg-pink-600">Schedule</button>
                </div>
            </form>
        </div>
    )
}

// ====================================================================================
// ===== 9. MAIN WRAPPER COMPONENT
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
    onEditCourse: (course: Course | null) => void;
    onSelectCourse: (course: Course) => void;
    courseToEdit?: Course | null;
    onSave: (course: Course) => void;
    onExit: () => void;
    onSendMessage: (recipientIds: string[], subject: string, content: string) => void;
    onUpdateMessages: (messages: Message[]) => void;
    onScheduleSession: (session: Omit<LiveSession, 'id'>) => void;
    onDeleteSession: (sessionId: string) => void;
    onRefetchData: () => void;
    onSaveUserProfile: (updates: Partial<User> & { newPassword?: string }) => void;
}

export const ManagementPages: React.FC<ManagementPagesProps> = (props) => {
    switch(props.view) {
        // --- STUDENT ---
        case 'certifications':
            return <CertificationPageComponent user={props.user} courses={props.courses} enrollments={props.enrollments} />;
        case 'inbox':
            return <InboxPage user={props.user} conversations={props.conversations} messages={props.messages} allUsers={props.allUsers} onSendMessage={props.onSendMessage} />;
        case 'calendar':
             return <CalendarPage events={props.calendarEvents} />;
        case 'history':
             return <HistoryPage historyLogs={props.historyLogs} />;
        case 'help':
             return <HelpPage user={props.user} />;

        // --- INSTRUCTOR ---
        case 'my-courses':
            return <MyCoursesPage user={props.user} courses={props.courses} onEditCourse={props.onEditCourse} />;
        case 'student-management':
             return <StudentManagementPage user={props.user} courses={props.courses} enrollments={props.enrollments} allUsers={props.allUsers} />;
        case 'live-sessions':
             return <LiveSessionsPage user={props.user} courses={props.courses} liveSessions={props.liveSessions} onScheduleSession={props.onScheduleSession} onDeleteSession={props.onDeleteSession} />;
        case 'analytics':
            return <AnalyticsPage user={props.user} courses={props.courses} enrollments={props.enrollments} allUsers={props.allUsers} />;
        case 'course-editor':
            return <CourseEditor courseToEdit={props.courseToEdit || null} user={props.user} onSave={props.onSave} onExit={props.onExit} />;

        // --- ADMIN ---
        case 'user-management':
            return <UserManagementPage users={props.allUsers} onRefetchData={props.onRefetchData} />;
        case 'platform-settings':
            return <PlatformSettingsPage />;
            
        // --- COMMON ---
        case 'profile':
            return <ProfilePage user={props.user} onSave={props.onSaveUserProfile} />;
        
        default:
            return <div>Page not found: {props.view}</div>;
    }
};