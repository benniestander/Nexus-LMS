

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Course, Enrollment, Lesson, LessonType, QuizData, Question, User } from '../types';
import { ProgressBar } from '../components/ProgressBar';
import { PlayCircleIcon, CheckCircle2Icon, CircleIcon, ChevronLeftIcon, LockIcon, ClipboardListIcon, StarIcon, BookOpenIcon, FileTextIcon, ChevronRightIcon, ClockIcon, XIcon, AwardIcon } from '../components/Icons';

type PlayerView = 'lesson' | 'quiz_result';

// --- Quiz View (part of a lesson now) ---
const QuizView: React.FC<{ quizData: QuizData; lessonTitle: string; onQuizSubmit: (answers: Record<string, number>) => void; }> = ({ quizData, lessonTitle, onQuizSubmit }) => {
    const [answers, setAnswers] = useState<Record<string, number>>({});
    const handleAnswerChange = (questionId: string, optionIndex: number) => setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onQuizSubmit(answers); };

    return (
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-8 rounded-2xl shadow-lg w-full max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
                <ClipboardListIcon className="w-8 h-8 text-pink-500" />
                <h2 className="text-2xl sm:text-3xl font-bold">Quiz: {lessonTitle}</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-8">Test your knowledge from this section.</p>
            <form onSubmit={handleSubmit}>
                <div className="space-y-8">
                    {quizData.questions.map((q, index) => (
                        <div key={q.id}>
                            <p className="font-semibold text-lg text-gray-800 dark:text-gray-200 mb-4">{index + 1}. {q.questionText}</p>
                            <div className="space-y-3">
                                {q.options.map((option, optIndex) => (
                                    <label key={optIndex} className="flex items-center p-4 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors has-[:checked]:bg-pink-50 has-[:checked]:border-pink-500 dark:has-[:checked]:bg-pink-900/30 dark:has-[:checked]:border-pink-500">
                                        <input type="radio" name={q.id} value={optIndex} checked={answers[q.id] === optIndex} onChange={() => handleAnswerChange(q.id, optIndex)} className="h-4 w-4 text-pink-600 border-gray-300 focus:ring-pink-500" />
                                        <span className="ml-4 text-gray-800 dark:text-gray-200">{option}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-10 text-right">
                    <button type="submit" className="bg-pink-500 text-white font-bold py-3 px-10 rounded-lg hover:bg-pink-600 transition-all text-lg" disabled={Object.keys(answers).length !== quizData.questions.length}>
                        Submit Answers
                    </button>
                </div>
            </form>
        </div>
    );
};

const QuizResult: React.FC<{ 
    result: { score: number; passed: boolean; passingScore: number; }; 
    onContinue: () => void;
    onRetry: () => void;
}> = ({ result, onContinue, onRetry }) => (
    <div className={`p-8 rounded-2xl shadow-lg text-center ${result.passed ? 'bg-green-50 dark:bg-green-900/50 border-green-500' : 'bg-red-50 dark:bg-red-900/50 border-red-500'} border-2`}>
        <h2 className="text-4xl font-bold">{result.passed ? "Congratulations!" : "Keep Trying!"}</h2>
        <p className="text-xl mt-4">You scored</p>
        <p className={`text-7xl font-extrabold my-2 ${result.passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{result.score.toFixed(0)}%</p>
        {result.passed ? 
            (<>
                <p className="text-gray-600 dark:text-gray-400 mt-4">Passing score: {result.passingScore}%</p>
                <div className="flex justify-center gap-4 mt-8">
                    <button onClick={onContinue} className="bg-pink-500 text-white font-bold py-3 px-8 rounded-lg hover:bg-pink-600 transition-all text-lg">Continue</button>
                </div>
            </>) : 
            (<>
                <p className="text-gray-600 dark:text-gray-400 mt-4">You did not pass. Please review the material and try again. Passing score: {result.passingScore}%</p>
                 <div className="flex justify-center gap-4 mt-8">
                    <button onClick={onRetry} className="bg-blue-500 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-600 transition-all text-lg">Retry Quiz</button>
                </div>
            </>)
        }
    </div>
);

interface CoursePlayerProps {
  user: User;
  course: Course;
  enrollment: Enrollment;
  onExit: () => void;
  onEnrollmentUpdate: (enrollment: Enrollment) => void;
}

const CoursePlayer: React.FC<CoursePlayerProps> = ({ user, course, enrollment, onExit, onEnrollmentUpdate }) => {
  const allLessons = useMemo(() => course.modules.flatMap(m => m.lessons), [course]);

  const findInitialLesson = () => allLessons.find(l => l.id === enrollment.lastAccessedLessonId) || allLessons[0] || null;

  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(findInitialLesson());
  const [playerView, setPlayerView] = useState<PlayerView>('lesson');
  const [lastQuizResult, setLastQuizResult] = useState<{ score: number; passed: boolean; passingScore: number; } | null>(null);
  const [isPlayerSidebarOpen, setIsPlayerSidebarOpen] = useState(false);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    // Set origin dynamically for YouTube embed security
    setOrigin(window.location.origin);
  }, []);
  
  const currentLessonIndex = currentLesson ? allLessons.findIndex(l => l.id === currentLesson.id) : -1;
  const currentModule = currentLesson ? course.modules.find(m => m.id === currentLesson.moduleId) : null;
  const isCurrentLessonComplete = currentLesson ? enrollment.completedLessonIds.includes(currentLesson.id) : false;
  
  const courseProgress = allLessons.length > 0 ? Math.round((enrollment.completedLessonIds.length / allLessons.length) * 100) : 0;

  const isLessonUnlocked = (lessonIndex: number) => {
      if (lessonIndex < 0 || lessonIndex >= allLessons.length) return false;
      if (lessonIndex === 0) return true;
      const prevLesson = allLessons[lessonIndex - 1];
      return enrollment.completedLessonIds.includes(prevLesson.id);
  };

  const handleContinue = () => {
    const nextLesson = allLessons[currentLessonIndex + 1];
    if (nextLesson) {
        handleSelectLesson(nextLesson)
    } else {
        onExit(); // Course finished
    }
  };

  const handleMarkComplete = () => {
    if (!currentLesson || currentLesson.type === LessonType.QUIZ || isCurrentLessonComplete) {
        return;
    }

    const newCompletedIds = Array.from(new Set([...enrollment.completedLessonIds, currentLesson.id]));
    const newProgress = allLessons.length > 0 ? Math.round((newCompletedIds.length / allLessons.length) * 100) : 0;
    
    const updatedEnrollment = { 
        ...enrollment, 
        completedLessonIds: newCompletedIds, 
        progress: newProgress 
    };
    
    onEnrollmentUpdate(updatedEnrollment);
    
    // Automatically move to the next lesson or exit if it's the last one
    handleContinue();
  };
  
  const handleQuizSubmit = (answers: Record<string, number>) => {
    if (!currentLesson || currentLesson.type !== LessonType.QUIZ || !currentLesson.content.quizData) return;
    const { quizData } = currentLesson.content;
    const correctCount = quizData.questions.filter(q => answers[q.id] === q.correctAnswerIndex).length;
    const score = (correctCount / quizData.questions.length) * 100;
    const passed = score >= quizData.passingScore;
    
    const wasAlreadyPassed = enrollment.completedLessonIds.includes(currentLesson.id);

    const newQuizScores = {
        ...enrollment.quizScores,
        [currentLesson.id]: {
            score: Math.max(enrollment.quizScores[currentLesson.id]?.score || 0, score),
            passed: enrollment.quizScores[currentLesson.id]?.passed || passed
        }
    };
    
    let newCompletedIds = enrollment.completedLessonIds;
    if (passed && !wasAlreadyPassed) {
      newCompletedIds = Array.from(new Set([...enrollment.completedLessonIds, currentLesson.id]));
    }
    
    const newProgress = allLessons.length > 0 ? Math.round((newCompletedIds.length / allLessons.length) * 100) : 0;

    const newEnrollment = { 
        ...enrollment, 
        completedLessonIds: newCompletedIds,
        quizScores: newQuizScores,
        progress: newProgress
    };
    onEnrollmentUpdate(newEnrollment);

    setLastQuizResult({ score, passed, passingScore: quizData.passingScore });
    setPlayerView('quiz_result');
  };
  
  const handleSelectLesson = (lesson: Lesson) => {
    const lessonIndex = allLessons.findIndex(l => l.id === lesson.id);
    if (isLessonUnlocked(lessonIndex)) {
      setCurrentLesson(lesson);
      setPlayerView('lesson');
      setLastQuizResult(null); // Clear any previous quiz result view
      setIsPlayerSidebarOpen(false); // Close mobile sidebar on selection

      // Only update the last accessed lesson ID if it's different
      if (enrollment.lastAccessedLessonId !== lesson.id) {
        onEnrollmentUpdate({ ...enrollment, lastAccessedLessonId: lesson.id });
      }
    }
  };

  const canComplete = currentLesson && currentLesson.type !== LessonType.QUIZ && !isCurrentLessonComplete;

  return (
    <div className="flex flex-col md:flex-row h-full bg-white dark:bg-gray-900">
      <main className="flex-1 flex flex-col min-w-0">
          <div className="p-4 sm:p-8 sm:pb-6 flex justify-between items-start gap-4">
              <div>
                <p className="text-pink-500 font-semibold">{course.title}</p>
                <h1 className="text-2xl sm:text-4xl font-bold mt-1">{currentLesson?.title}</h1>
                <p className="text-gray-500 mt-2 hidden sm:block">{currentModule?.title}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => setIsPlayerSidebarOpen(true)} className="md:hidden bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  Curriculum
                </button>
                <button onClick={onExit} className="bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Exit</button>
              </div>
          </div>
          
          <div className="flex-grow overflow-y-auto px-4 sm:px-8 py-10">
              {playerView === 'quiz_result' && lastQuizResult ? (
                 <QuizResult 
                    result={lastQuizResult} 
                    onContinue={handleContinue}
                    onRetry={() => setPlayerView('lesson')} 
                 />
              ) : currentLesson?.type === LessonType.VIDEO && currentLesson.content.videoData && origin ? (
                <div className="w-full max-w-6xl mx-auto aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl">
                    {currentLesson.content.videoData.provider === 'youtube' && (
                        <iframe 
                            className="w-full h-full" 
                            src={`https://www.youtube.com/embed/${currentLesson.content.videoData.url}?rel=0&origin=${origin}`} 
                            title={currentLesson.title} 
                            frameBorder="0"
                            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            referrerPolicy="strict-origin-when-cross-origin"
                            allowFullScreen
                        ></iframe>
                    )}
                    {currentLesson.content.videoData.provider === 'self_hosted' && (
                        <video
                            className="w-full h-full bg-black"
                            src={currentLesson.content.videoData.url}
                            controls
                            autoPlay
                        >
                            Your browser does not support the video tag.
                        </video>
                    )}
                    {currentLesson.content.videoData.provider === 'vimeo' && (
                        <iframe
                            className="w-full h-full"
                            src={`https://player.vimeo.com/video/${currentLesson.content.videoData.url}`}
                            title={currentLesson.title}
                            frameBorder="0"
                            allow="autoplay; fullscreen; picture-in-picture"
                            allowFullScreen
                        ></iframe>
                    )}
                </div>
              ) : currentLesson?.type === LessonType.TEXT ? (
                <div className="w-full max-w-4xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg prose prose-lg dark:prose-invert" dangerouslySetInnerHTML={{ __html: currentLesson.content.text || '' }}></div>
              ) : currentLesson?.type === LessonType.PDF ? (
                <div className="w-full aspect-[4/3] max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-lg"><iframe src={currentLesson.content.pdfUrl} className="w-full h-full" /></div>
              ) : currentLesson?.type === LessonType.QUIZ && currentLesson.content.quizData ? (
                 <QuizView quizData={currentLesson.content.quizData} lessonTitle={currentLesson.title} onQuizSubmit={handleQuizSubmit} />
              ) : null}
          </div>

          <div className="p-4 sm:p-8 pt-6 flex justify-between items-center">
            {currentLessonIndex > 0 ? (
              <button
                onClick={() => handleSelectLesson(allLessons[currentLessonIndex - 1])}
                className="bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-bold py-3 px-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all text-lg flex items-center gap-2"
              >
                <ChevronLeftIcon className="w-5 h-5" />
                Previous
              </button>
            ) : (
              <div /> // Spacer
            )}

            {canComplete ? (
                <button
                    onClick={handleMarkComplete}
                    className="bg-green-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-green-700 transition-all text-lg flex items-center gap-2"
                >
                    Mark as Complete
                    <CheckCircle2Icon className="w-5 h-5" />
                </button>
            ) : currentLessonIndex < allLessons.length - 1 ? (
                 <button
                    onClick={handleContinue}
                    disabled={!isLessonUnlocked(currentLessonIndex + 1)}
                    className="bg-pink-500 text-white font-bold py-3 px-8 rounded-lg hover:bg-pink-600 transition-all text-lg flex items-center gap-2 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                    title={!isLessonUnlocked(currentLessonIndex + 1) ? "Complete the current lesson to unlock" : "Go to next lesson"}
                >
                    Next Lesson
                    {isLessonUnlocked(currentLessonIndex + 1) ? (
                      <ChevronRightIcon className="w-5 h-5" />
                    ) : (
                      <LockIcon className="w-5 h-5" />
                    )}
                </button>
            ) : isCurrentLessonComplete ? (
                 <button
                    onClick={onExit}
                    className="bg-blue-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-700 transition-all text-lg flex items-center gap-2"
                >
                    Finish Course
                    <AwardIcon className="w-5 h-5" />
                </button>
            ) : (
                <div /> // Spacer
            )}
          </div>
      </main>

      {/* Backdrop for mobile sidebar */}
      {isPlayerSidebarOpen && (
        <div onClick={() => setIsPlayerSidebarOpen(false)} className="fixed inset-0 bg-black/50 z-40 md:hidden" aria-hidden="true"></div>
      )}

      <aside className={`fixed top-0 right-0 h-full w-80 sm:w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col z-50 transition-transform duration-300 ease-in-out md:relative md:w-96 md:translate-x-0 ${isPlayerSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 flex justify-between items-center">
            <h2 className="text-xl font-bold">{course.title}</h2>
            <button onClick={() => setIsPlayerSidebarOpen(false)} className="md:hidden p-1 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white">
                <XIcon className="w-6 h-6"/>
            </button>
        </div>
        <div className="mt-4 px-6"><ProgressBar progress={courseProgress} /><p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">{enrollment.completedLessonIds.length} of {allLessons.length} lessons completed</p></div>
        
        <div className="flex-grow overflow-y-auto">
          {course.modules.map((module, moduleIndex) => (
            <div key={module.id} className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-bold mb-3">Module {moduleIndex + 1}: {module.title}</h3>
              <ul>
                {module.lessons.map((lesson, lessonIndexInModule) => {
                  const globalLessonIndex = allLessons.findIndex(l => l.id === lesson.id);
                  const isCompleted = enrollment.completedLessonIds.includes(lesson.id);
                  const isCurrent = lesson.id === currentLesson?.id;
                  const unlocked = isLessonUnlocked(globalLessonIndex);
                  const LessonIcon = lesson.type === LessonType.VIDEO ? PlayCircleIcon : lesson.type === LessonType.PDF ? FileTextIcon : lesson.type === LessonType.QUIZ ? ClipboardListIcon : BookOpenIcon;
                  return (
                    <li key={lesson.id}>
                      <a href="#" onClick={(e) => { e.preventDefault(); if (unlocked) handleSelectLesson(lesson); }} className={`flex items-start gap-3 p-3 rounded-lg mb-1 transition-colors ${!unlocked ? 'opacity-50 cursor-not-allowed' : (isCurrent ? 'bg-pink-100 dark:bg-pink-900/50' : 'hover:bg-gray-100 dark:hover:bg-gray-700/50')}`}>
                        <div className="mt-0.5 flex-shrink-0 w-5 h-5 flex items-center justify-center">{isCompleted ? <CheckCircle2Icon className="w-5 h-5 text-green-500" /> : (unlocked ? <LessonIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" /> : <LockIcon className="w-4 h-4 text-gray-400 dark:text-gray-500"/>) }</div>
                        <div className="flex-grow"><p className={`font-semibold ${isCurrent ? 'text-pink-600 dark:text-pink-400' : (unlocked ? 'text-gray-800 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400')}`}>{lesson.title}</p><p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5"><ClockIcon className="w-3 h-3" /> {lesson.duration} min</p></div>
                      </a>
                    </li>);
                })}
              </ul>
            </div>))}
        </div>
      </aside>
    </div>
  );
};

export default CoursePlayer;