import React from 'react';
import { Course, Role, User } from '../types';
import { ProgressBar } from './ProgressBar';
import { BookOpenIcon, ClockIcon, EditIcon } from './Icons';

interface CourseCardProps {
  course: Course;
  user: User;
  progress?: number; // Optional progress for enrolled courses
  onSelect: (course: Course) => void;
  onEdit?: (course: Course) => void;
}

export const CourseCard: React.FC<CourseCardProps> = ({ course, user, progress, onSelect, onEdit }) => {
  const isInstructor = user.role === Role.INSTRUCTOR && user.id === course.instructorId;

  const handleSelect = () => {
    // Instructors viewing their own course card should go to edit view
    if (isInstructor && onEdit) {
      onEdit(course);
    } else {
      onSelect(course);
    }
  }

  return (
    <div 
      onClick={handleSelect}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group cursor-pointer flex flex-col"
    >
      <div className="relative">
        <img src={course.thumbnail} alt={course.title} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300" />
        <div className="absolute top-3 right-3 bg-gray-900/50 text-white text-xs font-semibold px-2 py-1 rounded-full">{course.category}</div>
      </div>
      <div className="p-5 flex flex-col flex-grow">
        <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400 group-hover:text-pink-500 transition-colors">{course.title}</h3>
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
          ) : isInstructor ? (
             <button className="w-full mt-4 bg-blue-500 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-blue-600 transition-all flex items-center justify-center gap-2">
                <EditIcon className="w-4 h-4" />
                Edit Course
            </button>
          ) : (
             <button className="w-full mt-4 bg-pink-500 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-pink-600 transition-all">
                View Course
            </button>
          )}
        </div>
      </div>
    </div>
  );
};