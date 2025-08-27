import React from 'react';
import { Course, Enrollment, User, Role, EngagementData } from '../types';
import { CourseCard } from '../components/CourseCard';
import { UsersIcon, BarChart2Icon, BookOpenIcon, CheckCircle2Icon, PlusCircleIcon, LayoutDashboardIcon } from '../components/Icons';

// NOTE: Chart data is now derived from props or placeholder, not mock file.
const generatePlaceholderChartData = (label: string, length = 6) => {
    return Array.from({length}, (_, i) => ({ name: `${label} ${i+1}`, value: Math.floor(Math.random() * 400) + 50 }));
}

// Re-importing Chart components as they are not in separate files.
// In a real app, these would be in their own files.
// NOTE: These are simple SVG-based charts for demonstration. A real app would use a library like Recharts or Chart.js.
const SimpleBarChart: React.FC<{data: EngagementData[], color: string}> = ({ data, color }) => (
    <div className="w-full h-64 bg-gray-100 dark:bg-gray-700/50 p-4 rounded-lg flex items-end justify-around gap-2">
        {data.map((item, index) => (
            <div key={index} className="flex-1 flex flex-col items-center justify-end h-full">
                <div 
                    className="w-3/4 rounded-t-md"
                    style={{ height: `${(item.value / Math.max(...data.map(d => d.value), 1)) * 100}%`, backgroundColor: color }}
                    title={`${item.name}: ${item.value}`}
                ></div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.name}</p>
            </div>
        ))}
    </div>
);


// ===== SHARED COMPONENTS =====

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


// ===== STUDENT DASHBOARD =====

const StudentDashboardComponent: React.FC<{
  user: User;
  courses: Course[];
  enrollments: Enrollment[];
  onSelectCourse: (course: Course) => void;
}> = ({ user, courses, enrollments, onSelectCourse }) => {
  const enrolledCourseIds = enrollments.map(e => e.courseId);
  
  const enrolledCourses = courses.filter(c => enrolledCourseIds.includes(c.id));
  const availableCourses = courses.filter(c => !enrolledCourseIds.includes(c.id));

  const getProgress = (courseId: string) => {
    return enrollments.find(e => e.courseId === courseId)?.progress || 0;
  }

  return (
    <div className="p-4 md:p-8">
      <div className="text-center max-w-3xl mx-auto">
        <LayoutDashboardIcon className="w-16 h-16 mx-auto text-pink-500" />
        <h1 className="mt-4 text-4xl md:text-5xl font-extrabold">Welcome back, {user.firstName}!</h1>
        <p className="mt-4 text-lg md:text-xl text-gray-600 dark:text-gray-400">Ready to continue your learning journey?</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-12">
          <StatCard 
            icon={<BookOpenIcon className="w-8 h-8 text-white" />}
            value={enrollments.filter(e => e.progress > 0 && e.progress < 100).length}
            label="Courses in Progress"
            color="from-cyan-500 to-blue-500"
          />
           <StatCard 
            icon={<CheckCircle2Icon className="w-8 h-8 text-white" />}
            value={enrollments.filter(e => e.progress === 100).length}
            label="Courses Completed"
            color="from-green-500 to-emerald-600"
          />
      </div>

      <section className="mt-16">
        <h2 className="text-2xl font-bold">My Library</h2>
        {enrolledCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mt-6">
            {enrolledCourses.map(course => (
                <CourseCard 
                    key={course.id} 
                    course={course} 
                    user={user}
                    progress={getProgress(course.id)}
                    onSelect={onSelectCourse}
                />
            ))}
            </div>
        ) : (
            <div className="mt-6 text-center py-12 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <p className="text-gray-500 dark:text-gray-400">You are not enrolled in any courses yet.</p>
            </div>
        )}
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-bold">Explore Courses</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mt-6">
          {availableCourses.map(course => (
            <CourseCard 
              key={course.id} 
              course={course}
              user={user}
              onSelect={onSelectCourse}
            />
          ))}
        </div>
      </section>
    </div>
  );
};


// ===== INSTRUCTOR DASHBOARD =====

const InstructorDashboard: React.FC<{
    user: User;
    courses: Course[];
    enrollments: Enrollment[];
    onNavigate: (view: any) => void;
    onEditCourse: (course: Course) => void;
}> = ({ user, courses, enrollments, onNavigate, onEditCourse }) => {
    const instructorCourses = courses.filter(c => c.instructorId === user.id);
    const instructorCourseIds = instructorCourses.map(c => c.id);
    const instructorEnrollments = enrollments.filter(e => instructorCourseIds.includes(e.courseId));
    
    const totalStudents = new Set(instructorEnrollments.map(e => e.userId)).size;
    const avgCompletion = instructorEnrollments.length > 0 
        ? instructorEnrollments.reduce((acc, e) => acc + e.progress, 0) / instructorEnrollments.length 
        : 0;

    return (
        <div className="p-4 md:p-8">
            <div className="text-center max-w-3xl mx-auto">
                <LayoutDashboardIcon className="w-16 h-16 mx-auto text-pink-500" />
                <h1 className="mt-4 text-4xl md:text-5xl font-extrabold">Instructor Dashboard</h1>
                <p className="mt-4 text-lg md:text-xl text-gray-600 dark:text-gray-400">Manage your courses and view student analytics.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
                <StatCard icon={<UsersIcon className="w-8 h-8" />} value={totalStudents} label="Total Students" color="from-cyan-500 to-blue-500" />
                <StatCard icon={<BookOpenIcon className="w-8 h-8" />} value={instructorCourses.length} label="Your Courses" color="from-pink-500 to-rose-500" />
                <StatCard icon={<BarChart2Icon className="w-8 h-8" />} value={`${Math.round(avgCompletion)}%`} label="Avg. Completion" color="from-amber-500 to-orange-500" />
            </div>

            <div className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md">
                    <h3 className="text-xl font-bold">Student Engagement</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">New enrollments over the last 6 months</p>
                    <SimpleBarChart data={generatePlaceholderChartData('Month')} color="var(--brand-purple)" />
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold">Your Courses</h3>
                        <button 
                            onClick={() => onEditCourse({} as Course)} 
                            className="flex items-center gap-2 text-sm font-semibold text-pink-500 hover:text-pink-600 dark:text-pink-400 dark:hover:text-pink-300 bg-pink-100/50 dark:bg-pink-900/30 hover:bg-pink-100 dark:hover:bg-pink-900/50 px-3 py-1.5 rounded-lg transition-all"
                        >
                            <PlusCircleIcon className="w-5 h-5" />
                            <span>Add New Course</span>
                        </button>
                    </div>
                     <ul className="space-y-4">
                        {instructorCourses.length > 0 ? (
                            instructorCourses.map(course => (
                                <li key={course.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <div>
                                        <p className="font-semibold text-blue-600 dark:text-blue-400">{course.title}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{course.category}</p>
                                    </div>
                                    <button onClick={() => onNavigate('my-courses')} className="text-sm font-semibold text-pink-500 hover:text-pink-600">Manage</button>
                                </li>
                            ))
                        ) : (
                            <li className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <p>You haven't created any courses yet.</p>
                            </li>
                        )}
                    </ul>
                </div>
            </div>
        </div>
    );
};


// ===== ADMIN DASHBOARD =====

const AdminDashboard: React.FC<{ user: User, courses: Course[], enrollments: Enrollment[], allUsers: User[] }> = ({ user, courses, enrollments, allUsers }) => {
    return (
        <div className="p-4 md:p-8">
            <div className="text-center max-w-3xl mx-auto">
                <LayoutDashboardIcon className="w-16 h-16 mx-auto text-pink-500" />
                <h1 className="mt-4 text-4xl md:text-5xl font-extrabold">Platform Overview</h1>
                <p className="mt-4 text-lg md:text-xl text-gray-600 dark:text-gray-400">Key metrics for the Nexus LMS.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
                <StatCard icon={<UsersIcon className="w-8 h-8" />} value={allUsers.length} label="Total Users" color="from-blue-600 to-violet-600" />
                <StatCard icon={<BookOpenIcon className="w-8 h-8" />} value={courses.length} label="Total Courses" color="from-pink-500 to-rose-500" />
                <StatCard icon={<BarChart2Icon className="w-8 h-8" />} value={enrollments.length.toLocaleString()} label="Total Enrollments" color="from-teal-400 to-cyan-600" />
            </div>

            <div className="mt-16 grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md">
                    <h3 className="text-xl font-bold">New User Signups</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Last 6 months</p>
                    <SimpleBarChart data={generatePlaceholderChartData('Month')} color="var(--brand-blue)" />
                </div>
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md">
                    <h3 className="text-xl font-bold">Course Performance</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Average completion rate by category</p>
                     <SimpleBarChart data={generatePlaceholderChartData('Course', 4)} color="var(--brand-pink)" />
                </div>
            </div>
        </div>
    );
};

// ===== EXPORTED WRAPPER COMPONENT =====

interface DashboardProps {
  user: User;
  viewAsRole: Role; // Added to determine which dashboard to show
  courses: Course[];
  enrollments: Enrollment[];
  allUsers: User[];
  onSelectCourse: (course: Course) => void;
  onNavigate: (view: any) => void;
  onEditCourse: (course: Course) => void;
}

export const StudentDashboard: React.FC<DashboardProps> = ({ user, viewAsRole, courses, enrollments, allUsers, onSelectCourse, onNavigate, onEditCourse }) => {
  if (viewAsRole === Role.INSTRUCTOR) {
    return <InstructorDashboard user={user} courses={courses} enrollments={enrollments} onNavigate={onNavigate} onEditCourse={onEditCourse} />;
  }
  if (viewAsRole === Role.ADMIN) {
    return <AdminDashboard user={user} courses={courses} enrollments={enrollments} allUsers={allUsers} />;
  }
  
  const userEnrollments = enrollments.filter(e => e.userId === user.id);
  return <StudentDashboardComponent user={user} courses={courses} enrollments={userEnrollments} onSelectCourse={onSelectCourse} />;
};