

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Course, Enrollment, Lesson, LessonType, QuizData, Question, User, QuizAttempt, DiscussionPost } from '../types';
import { ProgressBar } from '../components/ProgressBar';
import { PlayCircleIcon, CheckCircle2Icon, CircleIcon, ChevronLeftIcon, LockIcon, ClipboardListIcon, StarIcon, BookOpenIcon, FileTextIcon, ChevronRightIcon, ClockIcon, XIcon, AwardIcon, MessageSquareIcon, SendIcon, VideoIcon, UserCircleIcon } from '../components/Icons';
import * as api from '../supabaseApi';

type PlayerView = 'lesson' | 'quiz_result';

// --- Helper functions to parse video URLs and extract IDs ---
const getYouTubeId = (url: string): string | null => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    // Handle cases where the URL is just the ID itself, or a valid parsed ID
    if (match && match[2].length === 11) {
        return match[2];
    }
    if (url.length === 11 && !url.includes('/')) {
        return url;
    }
    return null;
};

const getVimeoId = (url: string): string | null => {
    if (!url) return null;
    if (/^\d+$/.test(url)) return url; // It's already an ID
    const regExp = /https?:\/\/(?:www\.)?vimeo.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+)(?:$|\/|\?)/;
    const match = url.match(regExp);
    return match ? match[3] : null;
};

// --- Discussion View ---
const DiscussionView: React.FC<{ lessonId: string; user: User }> = ({ lessonId, user }) => {
    const [posts, setPosts] = useState<DiscussionPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newPostContent, setNewPostContent] = useState('');
    const [isPosting, setIsPosting] = useState(false);

    useEffect(() => {
        setIsLoading(true);
        api.getDiscussions(lessonId).then(data => {
            setPosts(data);
            setIsLoading(false);
        });
    }, [lessonId]);

    const handlePost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPostContent.trim()) return;
        setIsPosting(true);
        const newPost = await api.postDiscussion({
            lessonId,
            authorId: user.id,
            content: newPostContent,
        });
        if (newPost) {
            setPosts(prev => [newPost, ...prev]);
            setNewPostContent('');
        }
        setIsPosting(false);
    };

    return (
        <div className="w-full max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">Discussions</h2>
            <form onSubmit={handlePost} className="mb-8 bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <textarea
                    value={newPostContent}
                    onChange={e => setNewPostContent(e.target.value)}
                    placeholder="Ask a question or share your thoughts..."
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                    rows={4}
                />
                 {/* A real implementation would have file upload logic here for attachments */}
                <div className="flex justify-between items-center mt-2">
                    <div className="flex gap-2 text-gray-500">
                        <button type="button" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><VideoIcon className="w-5 h-5"/></button>
                        <button type="button" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><FileTextIcon className="w-5 h-5"/></button>
                    </div>
                    <button type="submit" disabled={isPosting || !newPostContent.trim()} className="bg-pink-500 text-white font-semibold px-6 py-2 rounded-lg disabled:bg-gray-400">
                        {isPosting ? 'Posting...' : 'Post'}
                    </button>
                </div>
            </form>
            <div className="space-y-6">
                {isLoading ? <p>Loading discussions...</p> : posts.map(post => (
                    <div key={post.id} className="flex gap-4">
                        <UserCircleIcon className="w-10 h-10 text-gray-400 flex-shrink-0" />
                        <div className="flex-grow bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                            <div className="flex justify-between">
                                <p className="font-bold">{post.author.firstName} {post.author.lastName}</p>
                                <p className="text-xs text-gray-500">{new Date(post.timestamp).toLocaleString()}</p>
                            </div>
                            <p className="mt-2">{post.content}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};


// --- Quiz View (part of a lesson now) ---
const QuizView: React.FC<{ quizData: QuizData; lessonTitle: string; onQuizSubmit: (answers: Record<string, number>) => void; }> = ({ quizData, lessonTitle, onQuizSubmit }) => {
    const [answers, setAnswers] = useState<Record<string, number>>({});
    const handleAnswerChange = (questionId: string, optionIndex: number) => setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onQuizSubmit(answers); };

    return (
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-8 rounded-2xl shadow-lg w-full max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
                <ClipboardListIcon className="w-8 h-8 text-pink-500" />
                <h2 className="text-2xl sm:text-3xl font-bold">{lessonTitle}</h2>
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

type CurriculumItem = 
    | { type: 'lesson'; data: Lesson }
    | { type: 'module-quiz'; data: { module: Course['modules'][0]; quiz: QuizData } }
    | { type: 'final-exam'; data: { course: Course; quiz: QuizData } };

interface CoursePlayerProps {
  user: User;
  course: Course;
  enrollment: Enrollment;
  onExit: () => void;
  onEnrollmentUpdate: (enrollment: Enrollment) => void;
  onSaveQuizAttempt: (attempt: Omit<QuizAttempt, 'id' | 'submittedAt'>) => void;
}

const CoursePlayer: React.FC<CoursePlayerProps> = ({ user, course, enrollment, onExit, onEnrollmentUpdate, onSaveQuizAttempt }) => {
    const allLessons = useMemo(() => course.modules.flatMap(m => m.lessons), [course]);
    const curriculumItems = useMemo<CurriculumItem[]>(() => {
        const items: CurriculumItem[] = [];
        course.modules.forEach(module => {
            module.lessons.forEach(lesson => items.push({ type: 'lesson', data: lesson }));
            if (module.quiz) {
                items.push({ type: 'module-quiz', data: { module, quiz: module.quiz } });
            }
        });
        if (course.finalExam) {
            items.push({ type: 'final-exam', data: { course, quiz: course.finalExam } });
        }
        return items;
    }, [course]);

    const findInitialItem = () => {
        const lastAccessed = curriculumItems.find(item => item.type === 'lesson' && item.data.id === enrollment.lastAccessedLessonId);
        return lastAccessed || curriculumItems[0] || null;
    };
    
    const [currentItem, setCurrentItem] = useState<CurriculumItem | null>(findInitialItem());
    const [playerView, setPlayerView] = useState<PlayerView>('lesson');
    const [activeTab, setActiveTab] = useState('lesson');
    const [lastQuizResult, setLastQuizResult] = useState<{ score: number; passed: boolean; passingScore: number; } | null>(null);
    const [isPlayerSidebarOpen, setIsPlayerSidebarOpen] = useState(false);
    const [origin, setOrigin] = useState('');

    useEffect(() => { setOrigin(window.location.origin); }, []);

    const videoId = useMemo(() => {
        if (currentItem?.type !== 'lesson' || !currentItem.data.content.videoData) return null;
        const { provider, url } = currentItem.data.content.videoData;
        if (provider === 'youtube') return getYouTubeId(url);
        if (provider === 'vimeo') return getVimeoId(url);
        return url;
    }, [currentItem]);

    const currentItemIndex = currentItem ? curriculumItems.findIndex(item => {
        if (item.type === 'lesson' && currentItem.type === 'lesson') return item.data.id === currentItem.data.id;
        if (item.type === 'module-quiz' && currentItem.type === 'module-quiz') return item.data.module.id === currentItem.data.module.id;
        if (item.type === 'final-exam' && currentItem.type === 'final-exam') return item.data.course.id === currentItem.data.course.id;
        return false;
    }) : -1;
    
    const isItemCompleted = (item: CurriculumItem): boolean => {
        switch (item.type) {
            case 'lesson': return enrollment.completedLessonIds.includes(item.data.id);
            case 'module-quiz': return enrollment.quizScores[`module-${item.data.module.id}`]?.passed === true;
            case 'final-exam': return enrollment.quizScores[`course-${item.data.course.id}`]?.passed === true;
            default: return false;
        }
    };
    
    const isItemUnlocked = (item: CurriculumItem): boolean => {
        const index = curriculumItems.findIndex(i => {
            if (i.type !== item.type) return false;
            switch(i.type) {
                case 'lesson': return i.data.id === (item as any).data.id;
                case 'module-quiz': return i.data.module.id === (item as any).data.module.id;
                case 'final-exam': return i.data.course.id === (item as any).data.course.id;
            }
            return false;
        });
        if (index <= 0) return true;
        
        const prevItem = curriculumItems[index - 1];
        return isItemCompleted(prevItem);
    };

    const handleContinue = () => {
        const nextItem = curriculumItems[currentItemIndex + 1];
        if (nextItem) {
            handleSelectItem(nextItem);
        } else {
            onExit();
        }
    };

    const handleMarkComplete = () => {
        if (!currentItem || currentItem.type !== 'lesson' || isItemCompleted(currentItem)) return;
        const newCompletedIds = [...new Set([...enrollment.completedLessonIds, currentItem.data.id])];
        onEnrollmentUpdate({ ...enrollment, completedLessonIds: newCompletedIds });
        handleContinue();
    };

    const handleQuizSubmit = (answers: Record<string, number>) => {
        if (!currentItem || (currentItem.type !== 'module-quiz' && currentItem.type !== 'final-exam' && (currentItem.type === 'lesson' && currentItem.data.type !== 'quiz'))) return;
        
        let quizData: QuizData;
        let quizKey: string;

        if (currentItem.type === 'lesson' && currentItem.data.content.quizData) {
            quizData = currentItem.data.content.quizData;
            quizKey = `lesson-${currentItem.data.id}`;
        } else if (currentItem.type === 'module-quiz') {
            quizData = currentItem.data.quiz;
            quizKey = `module-${currentItem.data.module.id}`;
        } else if (currentItem.type === 'final-exam') {
            quizData = currentItem.data.quiz;
            quizKey = `course-${currentItem.data.course.id}`;
        } else {
            return;
        }

        const correctCount = quizData.questions.filter(q => answers[q.id] === q.correctAnswerIndex).length;
        const score = (correctCount / quizData.questions.length) * 100;
        const passed = score >= quizData.passingScore;

        const existingScore = enrollment.quizScores[quizKey];
        
        const newQuizScores = {
            ...enrollment.quizScores,
            [quizKey]: { score: Math.max(existingScore?.score || 0, score), passed: existingScore?.passed || passed }
        };

        const newEnrollment = { ...enrollment, quizScores: newQuizScores };
        onEnrollmentUpdate(newEnrollment);

        onSaveQuizAttempt({ userId: user.id, courseId: course.id, lessonId: quizKey, score, passed, answers });
        setLastQuizResult({ score, passed, passingScore: quizData.passingScore });
        setPlayerView('quiz_result');
    };

    const handleSelectItem = (item: CurriculumItem) => {
        if (isItemUnlocked(item)) {
            setCurrentItem(item);
            setPlayerView('lesson');
            setActiveTab('lesson');
            setLastQuizResult(null);
            setIsPlayerSidebarOpen(false);
            if (item.type === 'lesson' && enrollment.lastAccessedLessonId !== item.data.id) {
                onEnrollmentUpdate({ ...enrollment, lastAccessedLessonId: item.data.id });
            }
        }
    };
    
    const courseProgress = curriculumItems.length > 0 ? Math.round((curriculumItems.filter(isItemCompleted).length / curriculumItems.length) * 100) : 0;
    const canCompleteLesson = currentItem?.type === 'lesson' && !isItemCompleted(currentItem);
    const isLastItem = currentItemIndex === curriculumItems.length - 1;

    return (
        <div className="flex flex-col md:flex-row h-full bg-white dark:bg-gray-900">
            <main className="flex-1 flex flex-col min-w-0">
                 <div className="p-4 sm:p-8 sm:pb-6 flex justify-between items-start gap-4">
                    <div>
                        <p className="text-pink-500 font-semibold">{course.title}</p>
                        <h1 className="text-2xl sm:text-4xl font-bold mt-1">
                            {currentItem?.type === 'lesson' ? currentItem.data.title :
                             currentItem?.type === 'module-quiz' ? `Quiz: ${currentItem.data.module.title}` :
                             currentItem?.type === 'final-exam' ? 'Final Exam' : 'Loading...'}
                        </h1>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => setIsPlayerSidebarOpen(true)} className="md:hidden bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Curriculum</button>
                        <button onClick={onExit} className="bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Exit</button>
                    </div>
                </div>

                {currentItem?.type === 'lesson' && (
                    <div className="border-b border-gray-200 dark:border-gray-700 px-4 sm:px-8">
                        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                            <button onClick={() => setActiveTab('lesson')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'lesson' ? 'border-pink-500 text-pink-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Lesson</button>
                            <button onClick={() => setActiveTab('discussion')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'discussion' ? 'border-pink-500 text-pink-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Discussion</button>
                        </nav>
                    </div>
                )}
                
                <div className="flex-grow overflow-y-auto px-4 sm:px-8 py-10">
                    {activeTab === 'discussion' && currentItem?.type === 'lesson' ? <DiscussionView lessonId={currentItem.data.id} user={user} /> :
                    playerView === 'quiz_result' && lastQuizResult ? <QuizResult result={lastQuizResult} onContinue={handleContinue} onRetry={() => setPlayerView('lesson')} /> :
                    currentItem?.type === 'lesson' && currentItem.data.type === LessonType.VIDEO && origin ? (
                        <div className="w-full max-w-6xl mx-auto aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl">
                           {/* Video rendering logic (unchanged) */}
                        </div>
                    ) : currentItem?.type === 'lesson' && currentItem.data.type === LessonType.TEXT ? (
                        <div className="w-full max-w-4xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg prose prose-lg dark:prose-invert" dangerouslySetInnerHTML={{ __html: currentItem.data.content.text || '' }}></div>
                    ) : currentItem && (currentItem.type === 'module-quiz' || currentItem.type === 'final-exam') ? (
                        <QuizView quizData={currentItem.data.quiz} lessonTitle={currentItem.type === 'final-exam' ? 'Final Exam' : `Quiz: ${currentItem.data.module.title}`} onQuizSubmit={handleQuizSubmit} />
                    ) : currentItem?.type === 'lesson' && currentItem.data.type === LessonType.QUIZ && currentItem.data.content.quizData ? (
                        <QuizView quizData={currentItem.data.content.quizData} lessonTitle={currentItem.data.title} onQuizSubmit={handleQuizSubmit} />
                    ) : null}
                </div>

                <div className="p-4 sm:p-8 pt-6 flex justify-between items-center">
                    {currentItemIndex > 0 ? (
                        <button onClick={() => handleSelectItem(curriculumItems[currentItemIndex - 1])} className="bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-bold py-3 px-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all text-lg flex items-center gap-2"><ChevronLeftIcon className="w-5 h-5" /> Previous</button>
                    ) : <div />}

                    {canCompleteLesson ? (
                        <button onClick={handleMarkComplete} className="bg-green-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-green-700 transition-all text-lg flex items-center gap-2">Mark as Complete <CheckCircle2Icon className="w-5 h-5" /></button>
                    ) : !isLastItem ? (
                        <button onClick={handleContinue} disabled={!isItemUnlocked(curriculumItems[currentItemIndex + 1])} className="bg-pink-500 text-white font-bold py-3 px-8 rounded-lg hover:bg-pink-600 transition-all text-lg flex items-center gap-2 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed">Next <ChevronRightIcon className="w-5 h-5" /></button>
                    ) : isItemCompleted(currentItem) ? (
                        <button onClick={onExit} className="bg-blue-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-700 transition-all text-lg flex items-center gap-2">Finish Course <AwardIcon className="w-5 h-5" /></button>
                    ) : <div />}
                </div>
            </main>

            {isPlayerSidebarOpen && <div onClick={() => setIsPlayerSidebarOpen(false)} className="fixed inset-0 bg-black/50 z-40 md:hidden" aria-hidden="true"></div>}

            <aside className={`fixed top-0 right-0 h-full w-80 sm:w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col z-50 transition-transform duration-300 ease-in-out md:relative md:w-96 md:translate-x-0 ${isPlayerSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 flex justify-between items-center">
                    <h2 className="text-xl font-bold">{course.title}</h2>
                    <button onClick={() => setIsPlayerSidebarOpen(false)} className="md:hidden p-1 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"><XIcon className="w-6 h-6" /></button>
                </div>
                <div className="mt-4 px-6"><ProgressBar progress={courseProgress} /><p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">{curriculumItems.filter(isItemCompleted).length} of {curriculumItems.length} items completed</p></div>
                
                <div className="flex-grow overflow-y-auto">
                    {course.modules.map((module, moduleIndex) => (
                        <div key={module.id} className="p-4 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="font-bold mb-3">Module {moduleIndex + 1}: {module.title}</h3>
                            <ul>
                                {module.lessons.map((lesson) => {
                                    const item = { type: 'lesson', data: lesson } as CurriculumItem;
                                    const isCurrent = currentItem?.type === 'lesson' && currentItem.data.id === lesson.id;
                                    const completed = isItemCompleted(item);
                                    const unlocked = isItemUnlocked(item);
                                    const LessonIcon = lesson.type === LessonType.VIDEO ? PlayCircleIcon : lesson.type === LessonType.PDF ? FileTextIcon : lesson.type === LessonType.QUIZ ? ClipboardListIcon : BookOpenIcon;
                                    return (
                                        <li key={lesson.id}><a href="#" onClick={(e) => { e.preventDefault(); if (unlocked) handleSelectItem(item); }} className={`flex items-start gap-3 p-3 rounded-lg mb-1 transition-colors ${!unlocked ? 'opacity-50 cursor-not-allowed' : (isCurrent ? 'bg-pink-100 dark:bg-pink-900/50' : 'hover:bg-gray-100 dark:hover:bg-gray-700/50')}`}>
                                            <div className="mt-0.5 flex-shrink-0 w-5 h-5 flex items-center justify-center">{completed ? <CheckCircle2Icon className="w-5 h-5 text-green-500" /> : (unlocked ? <LessonIcon className="w-5 h-5 text-gray-400" /> : <LockIcon className="w-4 h-4 text-gray-400"/>)}</div>
                                            <div className="flex-grow"><p className={`font-semibold ${isCurrent ? 'text-pink-600' : ''}`}>{lesson.title}</p><p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5"><ClockIcon className="w-3 h-3" /> {lesson.duration} min</p></div>
                                        </a></li>
                                    );
                                })}
                                {module.quiz && (() => {
                                    const item = { type: 'module-quiz', data: { module, quiz: module.quiz } } as CurriculumItem;
                                    const isCurrent = currentItem?.type === 'module-quiz' && currentItem.data.module.id === module.id;
                                    const completed = isItemCompleted(item);
                                    const unlocked = isItemUnlocked(item);
                                    return (
                                        <li key={`${module.id}-quiz`}><a href="#" onClick={(e) => { e.preventDefault(); if (unlocked) handleSelectItem(item); }} className={`flex items-start gap-3 p-3 rounded-lg mb-1 transition-colors ${!unlocked ? 'opacity-50 cursor-not-allowed' : (isCurrent ? 'bg-pink-100 dark:bg-pink-900/50' : 'hover:bg-gray-100 dark:hover:bg-gray-700/50')}`}>
                                            <div className="mt-0.5 flex-shrink-0 w-5 h-5 flex items-center justify-center">{completed ? <CheckCircle2Icon className="w-5 h-5 text-green-500" /> : (unlocked ? <ClipboardListIcon className="w-5 h-5 text-gray-400" /> : <LockIcon className="w-4 h-4 text-gray-400"/>)}</div>
                                            <div className="flex-grow"><p className={`font-semibold ${isCurrent ? 'text-pink-600' : ''}`}>{`Module ${moduleIndex + 1} Quiz`}</p></div>
                                        </a></li>
                                    );
                                })()}
                            </ul>
                        </div>
                    ))}
                    {course.finalExam && (() => {
                        const item = { type: 'final-exam', data: { course, quiz: course.finalExam } } as CurriculumItem;
                        const isCurrent = currentItem?.type === 'final-exam';
                        const completed = isItemCompleted(item);
                        const unlocked = isItemUnlocked(item);
                        return (
                             <div className="p-4"><a href="#" onClick={(e) => { e.preventDefault(); if (unlocked) handleSelectItem(item); }} className={`flex items-start gap-3 p-3 rounded-lg mb-1 transition-colors font-bold ${!unlocked ? 'opacity-50 cursor-not-allowed' : (isCurrent ? 'bg-pink-100 dark:bg-pink-900/50' : 'hover:bg-gray-100 dark:hover:bg-gray-700/50')}`}>
                                <div className="mt-0.5 flex-shrink-0 w-5 h-5 flex items-center justify-center">{completed ? <CheckCircle2Icon className="w-5 h-5 text-green-500" /> : (unlocked ? <AwardIcon className="w-5 h-5 text-yellow-500" /> : <LockIcon className="w-4 h-4 text-gray-400"/>)}</div>
                                <div className="flex-grow"><p className={`${isCurrent ? 'text-pink-600' : ''}`}>Final Exam</p></div>
                            </a></div>
                        );
                    })()}
                </div>
            </aside>
        </div>
    );
};

export default CoursePlayer;