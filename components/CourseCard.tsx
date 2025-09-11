import React from 'react';
import { Course, Role, User } from '../types';
import { ProgressBar } from './ProgressBar';
import { BookOpenIcon, ClockIcon, EditIcon, EyeIcon, EyeOffIcon, Trash2Icon } from './Icons';

interface CourseCardProps {
  course: Course;
  user: User;
  progress?: number; // Optional progress for enrolled courses
  onSelect: (course: Course) => void;
  onEdit?: (course: Course) => void;
  onDelete?: (course: Course) => void;
  onToggleVisibility?: (course: Course) => void;
  categoryName: string;
}

export const CourseCard: React.FC<CourseCardProps> = ({ course, user, progress, onSelect, onEdit, onDelete, onToggleVisibility, categoryName }) => {
  const isOwner = user.id === course.instructorId;
  const canManage = (user.role === Role.INSTRUCTOR && isOwner) || user.role === Role.ADMIN;

  return (
    <div 
      onClick={() => onSelect(course)}
      className={`bg-white dark:bg-gray-800 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group cursor-pointer flex flex-col ${(course.isHidden || !course.isPublished) && canManage ? 'opacity-70' : ''}`}
    >
      <div className="relative">
        <img src={course.thumbnail} alt={course.title} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300" />
        <div className="absolute top-3 right-3 bg-gray-900/50 text-white text-xs font-semibold px-2 py-1 rounded-full">{categoryName}</div>
        <div className="absolute top-3 left-3 flex flex-col gap-2">
            {course.isHidden && canManage && (
                <div className="bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                    <EyeOffIcon className="w-3 h-3" />
                    HIDDEN
                </div>
            )}
            {!course.isPublished && canManage && (
                <div className="bg-gray-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    DRAFT
                </div>
            )}
        </div>
      </div>
      <div className="p-5 flex flex-col flex-grow">
        <h3 className="text-lg font-bold group-hover:text-pink-500 transition-colors">{course.title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">by {course.instructorName}</p>
        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-3 space-x-4">
            <div className="flex items-center space-x-1.5">
                <BookOpenIcon className="w-4 h-4" />
                <span>{course.totalLessons} Lessons</span>
            </div>
            <div className="flex items-center space-x-1.5">
                <ClockIcon className="w-4 h-4" />
                <span>{course.estimatedDuration} hrs</span>
            </div>
        </div>
        <div className="mt-auto pt-4">
          {progress !== undefined && user.role === Role.STUDENT ? (
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Progress</span>
                <span className="text-xs font-bold text-pink-500">{progress}%</span>
              </div>
              <ProgressBar progress={progress} size="md" />
            </div>
          ) : canManage ? (
             <div className="flex items-center gap-2">
                <button onClick={(e) => { e.stopPropagation(); onEdit?.(course); }} className="w-full bg-blue-500 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-blue-600 transition-all flex items-center justify-center gap-2">
                    <EditIcon className="w-4 h-4" />
                    Edit
                </button>
                <button onClick={(e) => { e.stopPropagation(); onToggleVisibility?.(course); }} className="flex-shrink-0 bg-yellow-100 text-yellow-600 p-2.5 rounded-lg hover:bg-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-400 dark:hover:bg-yellow-900 transition-colors" aria-label={course.isHidden ? 'Make course visible' : 'Hide course'}>
                    {course.isHidden ? <EyeIcon className="w-4 h-4" /> : <EyeOffIcon className="w-4 h-4" />}
                </button>
                <button onClick={(e) => { e.stopPropagation(); onDelete?.(course); }} className="flex-shrink-0 bg-red-100 text-red-600 p-2.5 rounded-lg hover:bg-red-200 dark:bg-red-900/50 dark:text-red-400 dark:hover:bg-red-900 transition-colors" aria-label="Delete course">
                    <Trash2Icon className="w-4 h-4" />
                </button>
             </div>
          ) : (
            <div className="h-[44px]"></div>
          )}
        </div>
      </div>
    </div>
  );
};