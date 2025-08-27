

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Course, Enrollment, Lesson, LessonType, QuizData, Question, User, ChatMessage, DiscussionPost } from '../types';
import { ProgressBar } from '../components/ProgressBar';
import { PlayCircleIcon, CheckCircle2Icon, CircleIcon, ChevronLeftIcon, LockIcon, ClipboardListIcon, StarIcon, MessageSquareIcon, BookOpenIcon, SendIcon, FileTextIcon, ChevronRightIcon, ClockIcon, XIcon, UserCircleIcon, AwardIcon } from '../components/Icons';
import { GoogleGenAI } from "@google/genai";
import * as api from '../supabaseApi';

const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

type PlayerView = 'lesson' | 'quiz_result';
type SidebarTab = 'curriculum' | 'chatbot' | 'discussions';

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

// --- Discussion View ---
const DiscussionView: React.FC<{ lessonId: string, user: User }> = ({ lessonId, user }) => {
    const [posts, setPosts] = useState<DiscussionPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newPost, setNewPost] = useState('');

    useEffect(() => {
        const fetchDiscussions = async () => {
            setIsLoading(true);
            const discussionPosts = await api.getDiscussions(lessonId);
            setPosts(discussionPosts);
            setIsLoading(false);
        }
        fetchDiscussions();
    }, [lessonId]);

    const handlePost = async () => {
        if (!newPost.trim()) return;
        const postData = {
            lessonId,
            authorId: user.id,
            content: newPost.trim()
        };
        const savedPost = await api.postDiscussion(postData);
        if (savedPost) {
             setPosts(prev => [savedPost, ...prev]);
             setNewPost('');
        }
    };

    return (
        <div className="p-4 h-full flex flex-col">
            <div className="flex-shrink-0 mb-4">
                <textarea 
                    value={newPost}
                    onChange={e => setNewPost(e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" 
                    rows={3}
                    placeholder="Ask a question or start a discussion..."
                />
                <button onClick={handlePost} className="mt-2 bg-pink-500 text-white font-semibold px-4 py-2 rounded-lg hover:bg-pink-600">Post</button>
            </div>
            <div className="flex-grow overflow-y-auto space-y-4">
                {isLoading ? <p className="text-center text-gray-500">Loading discussions...</p> : 
                 posts.length > 0 ? (
                    posts.map(post => (
                        <div key={post.id} className="p-3 bg-gray-100 dark:bg-gray-900/50 rounded-lg">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                                    <UserCircleIcon className="w-6 h-6 text-gray-500" />
                                </div>
                                <div>
                                    <p className="font-semibold text-sm">{post.author.firstName} {post.author.lastName}</p>
                                    <p className="text-xs text-gray-500">{new Date(post.timestamp).toLocaleString()}</p>
                                    <p className="mt-2 text-gray-800 dark:text-gray-200">{post.content}</p>
                                </div>
                            </div>
                        </div>
                    ))
                 ) : (
                    <p className="text-center text-gray-500">No discussions yet. Be the first to post!</p>
                 )
                }
            </div>
        </div>
    );
};


// --- Chatbot Component (for sidebar) ---
const ChatbotView: React.FC<{ messages: ChatMessage[]; onSendMessage: (message: string) => void; isBotReplying: boolean; user: User; }> = ({ messages, onSendMessage, isBotReplying, user }) => {
    // ... same as original ...
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
    const handleSend = (e: React.FormEvent) => { e.preventDefault(); if (input.trim()) { onSendMessage(input.trim()); setInput(''); } };
    return (
        <div className="bg-white dark:bg-gray-800 w-full h-full flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3 flex-shrink-0">
                 <div className="p-1.5 bg-pink-100 dark:bg-pink-900/50 rounded-full"><PlayCircleIcon className="w-7 h-7 text-pink-500" /></div>
                 <div><h3 className="text-lg font-bold">Nicky</h3><p className="text-sm text-gray-500 dark:text-gray-400">Your AI learning partner</p></div>
            </div>
            <div className="flex-grow p-4 overflow-y-auto space-y-5">{messages.map((message) => (<div key={message.id} className={`flex items-end gap-2.5 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>{message.role === 'bot' && ( <PlayCircleIcon className="w-7 h-7 text-pink-500 flex-shrink-0 self-start" /> )}<div className={`max-w-xs lg:max-w-sm px-3.5 py-2.5 rounded-2xl ${message.role === 'user' ? 'bg-pink-500 text-white rounded-br-none' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'}`}><p className="text-sm">{message.content}</p></div>{message.role === 'user' && ( <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0"><UserCircleIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" /></div> )}</div>))}{isBotReplying && (<div className="flex items-end gap-2.5 justify-start"><PlayCircleIcon className="w-7 h-7 text-pink-500 flex-shrink-0 self-start" /><div className="max-w-xs lg:max-w-sm px-3.5 py-2.5 rounded-2xl bg-gray-100 dark:bg-gray-700 rounded-bl-none"><div className="flex items-center gap-2"><span className="h-2 w-2 bg-pink-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span><span className="h-2 w-2 bg-pink-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span><span className="h-2 w-2 bg-pink-500 rounded-full animate-bounce"></span></div></div></div>)}<div ref={messagesEndRef} /></div>
            <form onSubmit={handleSend} className="p-3 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2.5 flex-shrink-0"><input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask Nicky anything..." className="flex-grow p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-pink-500" disabled={isBotReplying} /><button type="submit" className="bg-pink-500 text-white p-2.5 rounded-lg hover:bg-pink-600 disabled:bg-gray-400" disabled={!input.trim() || isBotReplying}><SendIcon className="w-5 h-5" /></button></form>
        </div>
    );
};

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
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('curriculum');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isBotReplying, setIsBotReplying] = useState(false);
  const [isPlayerSidebarOpen, setIsPlayerSidebarOpen] = useState(false);
  
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
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

  const handleSendMessage = async (message:string) => {
    setIsBotReplying(true);
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: message };
    setChatHistory(prev => [...prev, userMessage]);

    try {
        const model = 'gemini-2.5-flash';
        const systemInstruction = `You are Nicky, an expert AI learning partner embedded in the Nexus LMS. 
        Your goal is to help students understand the course material better.
        The user is currently on the lesson titled "${currentLesson?.title}" within the course "${course.title}".
        Keep your answers concise, helpful, and encouraging. Do not go off-topic.
        Base your answer on the provided context if possible, but you can use general knowledge to explain concepts.`;
        
        const prompt = `Based on the lesson "${currentLesson?.title}", help me with this: ${message}`;
        
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                systemInstruction,
            }
        });

        const botResponse: ChatMessage = { id: crypto.randomUUID(), role: 'bot', content: response.text };
        setChatHistory(prev => [...prev, botResponse]);

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        const errorResponse: ChatMessage = { id: crypto.randomUUID(), role: 'bot', content: "Sorry, I'm having trouble connecting right now. Please try again later." };
        setChatHistory(prev => [...prev, errorResponse]);
    } finally {
        setIsBotReplying(false);
    }
};

  useEffect(() => {
    if (sidebarTab === 'chatbot' && chatHistory.length === 0) {
      setChatHistory([{ id: 'bot-welcome', role: 'bot', content: `Hello! I'm Nicky. How can I help you with "${currentLesson?.title}"?` }]);
    }
  }, [sidebarTab, currentLesson?.title, chatHistory.length]);

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
          
          <div className="flex-grow overflow-y-auto px-4 sm:px-8 py-12">
              {playerView === 'quiz_result' && lastQuizResult ? (
                 <QuizResult 
                    result={lastQuizResult} 
                    onContinue={handleContinue}
                    onRetry={() => setPlayerView('lesson')} 
                 />
              ) : currentLesson?.type === LessonType.VIDEO ? (
                <div className="w-full max-w-6xl mx-auto aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl">
                  <iframe 
                    className="w-full h-full" 
                    src={`https://www.youtube.com/embed/${currentLesson.content.videoId}?rel=0&origin=${origin}`} 
                    title={currentLesson.title} 
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
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
        
        <div className="border-b border-gray-200 dark:border-gray-700 flex flex-shrink-0 mt-4">
            <button onClick={() => setSidebarTab('curriculum')} className={`flex-1 p-4 font-semibold flex items-center justify-center gap-2 ${sidebarTab === 'curriculum' ? 'text-pink-600 border-b-2 border-pink-600' : 'text-gray-500'}`}><BookOpenIcon className="w-5 h-5"/>Curriculum</button>
            <button onClick={() => setSidebarTab('discussions')} className={`flex-1 p-4 font-semibold flex items-center justify-center gap-2 ${sidebarTab === 'discussions' ? 'text-pink-600 border-b-2 border-pink-600' : 'text-gray-500'}`}><MessageSquareIcon className="w-5 h-5"/>Discussions</button>
            <button onClick={() => setSidebarTab('chatbot')} className={`flex-1 p-4 font-semibold flex items-center justify-center gap-2 ${sidebarTab === 'chatbot' ? 'text-pink-600 border-b-2 border-pink-600' : 'text-gray-500'}`}><PlayCircleIcon className="w-5 h-5"/>AI Help</button>
        </div>
        <div className="flex-grow overflow-y-auto flex flex-col min-h-0">
          {sidebarTab === 'curriculum' ? (
              <div className="overflow-y-auto">
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
          ) : sidebarTab === 'chatbot' ? (
            <ChatbotView messages={chatHistory} onSendMessage={handleSendMessage} isBotReplying={isBotReplying} user={user} />
          ) : (
            currentLesson && <DiscussionView lessonId={currentLesson.id} user={user} />
          )}
        </div>
      </aside>
    </div>
  );
};

export default CoursePlayer;