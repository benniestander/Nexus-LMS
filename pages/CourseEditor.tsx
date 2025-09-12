import React, { useState, useMemo, useEffect } from 'react';
import { Course, User, Category, Module, Lesson, QuizData, Question, LessonType, VideoProvider } from '../types';
import { 
    EditIcon, PlusCircleIcon, Trash2Icon, XIcon,
    BoldIcon, ItalicIcon, UnderlineIcon, ListIcon, ListOrderedIcon 
} from '../components/Icons';
import { RichTextEditor } from '../components/RichTextEditor';

// This Modal component is used by the editors below and is exported for use in other management pages.
export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode, size?: 'md' | 'lg' | 'xl' }> = ({ isOpen, onClose, title, children, footer, size = 'lg' }) => {
    if (!isOpen) return null;

    const sizeClasses = {
        md: 'max-w-md',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col`} onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-bold">{title}</h3>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"><XIcon className="w-6 h-6" /></button>
                </div>
                <div className="p-6 flex-grow overflow-y-auto">{children}</div>
                {footer && <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">{footer}</div>}
            </div>
        </div>
    );
};


// --- Category tree rendering helpers ---
interface CategoryNode extends Category {
    children: CategoryNode[];
}

const buildCategoryTree = (items: Category[], parentId: string | null = null): CategoryNode[] => {
    return items
        .filter(item => item.parentId === parentId)
        .map(item => ({
            ...item,
            children: buildCategoryTree(items, item.id)
        }));
};

const renderCategoryOptions = (nodes: CategoryNode[], level: number = 0, excludeId: string | null = null): JSX.Element[] => {
    return nodes.flatMap(node => {
        if (node.id === excludeId) return [];
        return [
            <option key={node.id} value={node.id}>
                {'\u00A0'.repeat(level * 4)}{node.name}
            </option>,
            ...renderCategoryOptions(node.children, level + 1, excludeId)
        ];
    });
};


const QuizEditorModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    quizData: QuizData | undefined;
    onSave: (quizData: QuizData) => void;
    title: string;
}> = ({ isOpen, onClose, quizData: initialQuizData, onSave, title }) => {
    const [quizData, setQuizData] = useState<QuizData>({ questions: [], passingScore: 80 });

    useEffect(() => {
        setQuizData(JSON.parse(JSON.stringify(initialQuizData || { questions: [], passingScore: 80 })));
    }, [initialQuizData, isOpen]);

    const updateQuizField = (field: keyof QuizData, value: any) => {
        setQuizData(prev => ({ ...prev, [field]: value }));
    };

    const addQuestion = () => {
        const newQuestion: Question = { id: `new-q-${Date.now()}`, questionText: '', options: ['', ''], correctAnswerIndex: 0 };
        updateQuizField('questions', [...quizData.questions, newQuestion]);
    };
    const updateQuestion = (qIndex: number, text: string) => {
        const newQuestions = [...quizData.questions];
        newQuestions[qIndex].questionText = text;
        updateQuizField('questions', newQuestions);
    };
    const deleteQuestion = (qIndex: number) => {
        const newQuestions = quizData.questions.filter((_, idx) => idx !== qIndex);
        updateQuizField('questions', newQuestions);
    };
    const addOption = (qIndex: number) => {
        const newQuestions = [...quizData.questions];
        newQuestions[qIndex].options.push('');
        updateQuizField('questions', newQuestions);
    };
    const updateOption = (qIndex: number, oIndex: number, text: string) => {
        const newQuestions = [...quizData.questions];
        newQuestions[qIndex].options[oIndex] = text;
        updateQuizField('questions', newQuestions);
    };
    const deleteOption = (qIndex: number, oIndex: number) => {
        const newQuestions = [...quizData.questions];
        newQuestions[qIndex].options.splice(oIndex, 1);
        if (newQuestions[qIndex].correctAnswerIndex >= oIndex) {
            newQuestions[qIndex].correctAnswerIndex = Math.max(0, newQuestions[qIndex].correctAnswerIndex - 1);
        }
        updateQuizField('questions', newQuestions);
    };
    const setCorrectAnswer = (qIndex: number, oIndex: number) => {
        const newQuestions = [...quizData.questions];
        newQuestions[qIndex].correctAnswerIndex = oIndex;
        updateQuizField('questions', newQuestions);
    }

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}
            footer={
                <div className="flex justify-end gap-4">
                    <button onClick={onClose} className="bg-gray-200 dark:bg-gray-600 px-6 py-2 rounded-lg font-semibold">Cancel</button>
                    <button onClick={() => onSave(quizData)} className="bg-pink-500 text-white px-6 py-2 rounded-lg font-semibold">Save Quiz</button>
                </div>
            }>
            <div className="space-y-6">
                <div>
                    <label className="font-semibold">Passing Score (%)</label>
                    <input type="number" min="0" max="100" value={quizData.passingScore} onChange={e => updateQuizField('passingScore', parseInt(e.target.value, 10) || 0)} className="w-full mt-1 p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                </div>
                <div className="space-y-4">
                    {quizData.questions.map((q, qIndex) => (
                        <div key={q.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3 bg-gray-50 dark:bg-gray-800/50">
                            <div className="flex justify-between items-center">
                                <label className="font-semibold text-gray-700 dark:text-gray-300">Question {qIndex + 1}</label>
                                <button onClick={() => deleteQuestion(qIndex)} className="p-1 text-gray-400 hover:text-red-500"><Trash2Icon className="w-5 h-5" /></button>
                            </div>
                            <textarea value={q.questionText} onChange={e => updateQuestion(qIndex, e.target.value)} placeholder="Type your question here" className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" rows={2}></textarea>
                            <div className="space-y-2">
                                {q.options.map((opt, oIndex) => (
                                    <div key={oIndex} className="flex items-center gap-2">
                                        <input type="radio" name={`correct-answer-${q.id}`} checked={q.correctAnswerIndex === oIndex} onChange={() => setCorrectAnswer(qIndex, oIndex)} className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 dark:border-gray-500 bg-transparent" />
                                        <input type="text" value={opt} onChange={e => updateOption(qIndex, oIndex, e.target.value)} placeholder={`Option ${oIndex + 1}`} className="flex-grow p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                                        <button onClick={() => deleteOption(qIndex, oIndex)} disabled={q.options.length <= 2} className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"><XIcon className="w-5 h-5" /></button>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => addOption(qIndex)} className="text-sm text-pink-500 font-semibold flex items-center gap-1"><PlusCircleIcon className="w-4 h-4" /> Add Option</button>
                        </div>
                    ))}
                </div>
                <button onClick={addQuestion} className="w-full bg-pink-100/50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 font-bold py-2 rounded-lg hover:bg-pink-100 dark:hover:bg-pink-900/50 flex items-center justify-center gap-2">
                    <PlusCircleIcon className="w-5 h-5" /> Add Question
                </button>
            </div>
        </Modal>
    );
};

const LessonEditModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    lesson: Lesson | null;
    onSave: (lesson: Lesson) => void;
}> = ({ isOpen, onClose, lesson: initialLesson, onSave }) => {
    const [lesson, setLesson] = useState<Lesson | null>(null);

    useEffect(() => {
        if (initialLesson) {
            const lessonCopy = JSON.parse(JSON.stringify(initialLesson));
            if (lessonCopy.type === LessonType.QUIZ && !lessonCopy.content.quizData) {
                lessonCopy.content.quizData = { questions: [], passingScore: 80 };
            }
            setLesson(lessonCopy);
        } else {
            setLesson(null);
        }
    }, [initialLesson, isOpen]);
    
    const updateField = (field: keyof Lesson, value: any) => {
        if (!lesson) return;
        const newLesson = { ...lesson, [field]: value };
        if (field === 'type' && value === LessonType.QUIZ && !newLesson.content.quizData) {
            newLesson.content.quizData = { questions: [], passingScore: 80 };
        }
        setLesson(newLesson);
    };

    const updateContentField = (field: keyof Lesson['content'], value: any) => {
        if (!lesson) return;
        setLesson({ ...lesson, content: { ...lesson.content, [field]: value } });
    };

    const handleSave = () => {
        if (lesson) onSave(lesson);
    };

    // --- Inline Quiz Editor Handlers ---
    const updateQuizFieldInLesson = (field: keyof QuizData, value: any) => {
        if (!lesson?.content.quizData) return;
        const newQuizData = { ...lesson.content.quizData, [field]: value };
        updateContentField('quizData', newQuizData);
    };

    const addQuestionInLesson = () => {
        if (!lesson?.content.quizData) return;
        const newQuestion: Question = { id: `new-q-${Date.now()}`, questionText: '', options: ['', ''], correctAnswerIndex: 0 };
        const newQuestions = [...lesson.content.quizData.questions, newQuestion];
        updateQuizFieldInLesson('questions', newQuestions);
    };
    const updateQuestionInLesson = (qIndex: number, text: string) => {
        if (!lesson?.content.quizData) return;
        const newQuestions = [...lesson.content.quizData.questions];
        newQuestions[qIndex].questionText = text;
        updateQuizFieldInLesson('questions', newQuestions);
    };
    const deleteQuestionInLesson = (qIndex: number) => {
        if (!lesson?.content.quizData) return;
        const newQuestions = lesson.content.quizData.questions.filter((_, idx) => idx !== qIndex);
        updateQuizFieldInLesson('questions', newQuestions);
    };
    const addOptionInLesson = (qIndex: number) => {
        if (!lesson?.content.quizData) return;
        const newQuestions = [...lesson.content.quizData.questions];
        newQuestions[qIndex].options.push('');
        updateQuizFieldInLesson('questions', newQuestions);
    };
    const updateOptionInLesson = (qIndex: number, oIndex: number, text: string) => {
        if (!lesson?.content.quizData) return;
        const newQuestions = [...lesson.content.quizData.questions];
        newQuestions[qIndex].options[oIndex] = text;
        updateQuizFieldInLesson('questions', newQuestions);
    };
    const deleteOptionInLesson = (qIndex: number, oIndex: number) => {
        if (!lesson?.content.quizData) return;
        const newQuestions = [...lesson.content.quizData.questions];
        newQuestions[qIndex].options.splice(oIndex, 1);
        if (newQuestions[qIndex].correctAnswerIndex >= oIndex) {
            newQuestions[qIndex].correctAnswerIndex = Math.max(0, newQuestions[qIndex].correctAnswerIndex - 1);
        }
        updateQuizFieldInLesson('questions', newQuestions);
    };
    const setCorrectAnswerInLesson = (qIndex: number, oIndex: number) => {
        if (!lesson?.content.quizData) return;
        const newQuestions = [...lesson.content.quizData.questions];
        newQuestions[qIndex].correctAnswerIndex = oIndex;
        updateQuizFieldInLesson('questions', newQuestions);
    };
    // --- End Inline Quiz Editor Handlers ---

    if (!isOpen || !lesson) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={lesson.id.startsWith('new') ? 'New Lesson' : 'Edit Lesson'}
            footer={
                <div className="flex justify-end gap-4">
                    <button onClick={onClose} className="bg-gray-200 dark:bg-gray-600 px-6 py-2 rounded-lg font-semibold">Cancel</button>
                    <button onClick={handleSave} className="bg-pink-500 text-white px-6 py-2 rounded-lg font-semibold">Save Lesson</button>
                </div>
            }
        >
            <div className="space-y-6">
                <div><label className="font-semibold">Title</label><input type="text" value={lesson.title} onChange={e => updateField('title', e.target.value)} className="w-full mt-1 p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"/></div>
                <div><label className="font-semibold">Duration (minutes)</label><input type="number" value={lesson.duration} onChange={e => updateField('duration', parseInt(e.target.value, 10) || 0)} className="w-full mt-1 p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"/></div>
                <div>
                    <label className="font-semibold">Lesson Type</label>
                    <select value={lesson.type} onChange={e => updateField('type', e.target.value as LessonType)} className="w-full mt-1 p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 capitalize">
                        {Object.values(LessonType).map(type => <option key={type} value={type} className="capitalize">{type}</option>)}
                    </select>
                </div>

                {lesson.type === LessonType.TEXT && (
                    <RichTextEditor label="Content" value={lesson.content.text || ''} onChange={val => updateContentField('text', val)} />
                )}

                {lesson.type === LessonType.VIDEO && (
                    <div className="space-y-4">
                        <div>
                            <label className="font-semibold">Video Provider</label>
                            <select value={lesson.content.videoData?.provider || VideoProvider.YOUTUBE} onChange={e => updateContentField('videoData', { ...(lesson.content.videoData || { provider: VideoProvider.YOUTUBE, url: '' }), provider: e.target.value as VideoProvider })} className="w-full mt-1 p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 capitalize">
                                {Object.values(VideoProvider).map(p => <option key={p} value={p}>{p.replace('_', ' ')}</option>)}
                            </select>
                        </div>
                         <div><label className="font-semibold">Video URL or ID</label><input type="text" value={lesson.content.videoData?.url || ''} onChange={e => updateContentField('videoData', { ...(lesson.content.videoData || { provider: VideoProvider.YOUTUBE, url: '' }), url: e.target.value })} className="w-full mt-1 p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"/></div>
                    </div>
                )}
                
                {lesson.type === LessonType.QUIZ && lesson.content.quizData && (
                   <div className="space-y-6 border-t border-gray-200 dark:border-gray-700 pt-6">
                        <h4 className="text-lg font-bold">Quiz Content</h4>
                        <div>
                            <label className="font-semibold">Passing Score (%)</label>
                            <input type="number" min="0" max="100" value={lesson.content.quizData.passingScore} onChange={e => updateQuizFieldInLesson('passingScore', parseInt(e.target.value, 10) || 0)} className="w-full mt-1 p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                        </div>
                        <div className="space-y-4">
                            {lesson.content.quizData.questions.map((q, qIndex) => (
                                <div key={q.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3 bg-gray-50 dark:bg-gray-800/50">
                                    <div className="flex justify-between items-center">
                                        <label className="font-semibold text-gray-700 dark:text-gray-300">Question {qIndex + 1}</label>
                                        <button onClick={() => deleteQuestionInLesson(qIndex)} className="p-1 text-gray-400 hover:text-red-500"><Trash2Icon className="w-5 h-5" /></button>
                                    </div>
                                    <textarea value={q.questionText} onChange={e => updateQuestionInLesson(qIndex, e.target.value)} placeholder="Type your question here" className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" rows={2}></textarea>
                                    <div className="space-y-2">
                                        {q.options.map((opt, oIndex) => (
                                            <div key={oIndex} className="flex items-center gap-2">
                                                <input type="radio" name={`correct-answer-${q.id}`} checked={q.correctAnswerIndex === oIndex} onChange={() => setCorrectAnswerInLesson(qIndex, oIndex)} className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 dark:border-gray-500 bg-transparent" />
                                                <input type="text" value={opt} onChange={e => updateOptionInLesson(qIndex, oIndex, e.target.value)} placeholder={`Option ${oIndex + 1}`} className="flex-grow p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                                                <button onClick={() => deleteOptionInLesson(qIndex, oIndex)} disabled={q.options.length <= 2} className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"><XIcon className="w-5 h-5" /></button>
                                            </div>
                                        ))}
                                    </div>
                                    <button onClick={() => addOptionInLesson(qIndex)} className="text-sm text-pink-500 font-semibold flex items-center gap-1"><PlusCircleIcon className="w-4 h-4" /> Add Option</button>
                                </div>
                            ))}
                        </div>
                        <button onClick={addQuestionInLesson} className="w-full bg-pink-100/50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 font-bold py-2 rounded-lg hover:bg-pink-100 dark:hover:bg-pink-900/50 flex items-center justify-center gap-2">
                            <PlusCircleIcon className="w-5 h-5" /> Add Question
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );
};


const CourseEditor: React.FC<{
    course: Course | null;
    user: User;
    onSave: (course: Course) => void;
    onExit: () => void;
    categories: Category[];
    onAddCategory: (category: { name: string; parentId: string | null; }) => Promise<{ success: boolean; data?: Category; error?: any; }>;
}> = ({ course: initialCourse, user, onSave, onExit, categories, onAddCategory }) => {
    const [course, setCourse] = useState<Course>(initialCourse || {
        id: `new-course-${Date.now()}`, title: '', description: '', thumbnail: 'https://placehold.co/600x400/e2e8f0/e2e8f0', categoryId: categories[0]?.id || '', instructorId: user.id, instructorName: `${user.firstName} ${user.lastName}`, modules: [], totalLessons: 0, estimatedDuration: 0, isPublished: false,
    });
    const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
    const [editingQuiz, setEditingQuiz] = useState<{ type: 'module' | 'final'; id: string; data: QuizData | undefined } | null>(null);
    const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
    const [newInlineCategoryName, setNewInlineCategoryName] = useState('');
    const [newInlineCategoryParentId, setNewInlineCategoryParentId] = useState<string | null>(null);
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [errors, setErrors] = useState<{ title?: string; categoryId?: string }>({});

    // Effect to sync internal state with the course prop from App.tsx.
    // This is crucial for reacting to external state changes, like resetting an invalid category.
    useEffect(() => {
        if (initialCourse) {
            setCourse(initialCourse);
        }
    }, [initialCourse]);
    
    const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);
    
    const validateCourse = (): boolean => {
        const newErrors: { title?: string; categoryId?: string } = {};
        if (!course.title.trim()) {
            newErrors.title = 'Course title is required.';
        }
        if (!course.categoryId) {
            newErrors.categoryId = 'Please select a category.';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const updateCourseField = (field: keyof Course, value: any) => {
        if (errors[field as keyof typeof errors]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field as keyof typeof errors];
                return newErrors;
            });
        }
        setCourse(prev => ({...prev, [field]: value}));
    };

    const addModule = () => {
        const newModule: Module = { id: `new-module-${Date.now()}`, courseId: course.id, title: 'New Module', lessons: [], order: course.modules.length };
        updateCourseField('modules', [...course.modules, newModule]);
    };
    
    const updateModule = (moduleId: string, updates: Partial<Module>) => {
        updateCourseField('modules', course.modules.map(m => m.id === moduleId ? {...m, ...updates} : m));
    };

    const deleteModule = (moduleId: string) => {
        if (window.confirm("Are you sure you want to delete this module and all its lessons?")) {
            updateCourseField('modules', course.modules.filter(m => m.id !== moduleId));
        }
    };
    
    const deleteLesson = (moduleId: string, lessonId: string) => {
        if (window.confirm("Are you sure you want to delete this lesson?")) {
            const newModules = course.modules.map(module => {
                if (module.id === moduleId) {
                    return { ...module, lessons: module.lessons.filter(lesson => lesson.id !== lessonId) };
                }
                return module;
            });
            updateCourseField('modules', newModules);
        }
    };

    const addLesson = (moduleId: string) => {
        const newLesson: Lesson = { id: `new-lesson-${Date.now()}`, moduleId, title: 'New Lesson', type: LessonType.TEXT, content: { text: '' }, duration: 5, order: 0 };
        setEditingLesson(newLesson);
    };

    const saveLesson = (lessonToSave: Lesson) => {
        let moduleFound = false;
        const newModules = course.modules.map(m => {
            if (m.id === lessonToSave.moduleId) {
                moduleFound = true;
                const lessonExists = m.lessons.some(l => l.id === lessonToSave.id);
                const newLessons = lessonExists ? m.lessons.map(l => l.id === lessonToSave.id ? lessonToSave : l) : [...m.lessons, {...lessonToSave, order: m.lessons.length}];
                return {...m, lessons: newLessons};
            }
            return m;
        });
        if(moduleFound) {
            updateCourseField('modules', newModules);
        }
        setEditingLesson(null);
    };

    const saveQuiz = (quizData: QuizData) => {
        if (!editingQuiz) return;
        if (editingQuiz.type === 'final') {
            updateCourseField('finalExam', quizData);
        } else if (editingQuiz.type === 'module') {
            updateModule(editingQuiz.id, { quiz: quizData });
        }
        setEditingQuiz(null);
    };
    
    const handleAddInlineCategory = async () => {
        if (!newInlineCategoryName.trim()) return;
        setIsAddingCategory(true);
        const result = await onAddCategory({
            name: newInlineCategoryName.trim(),
            parentId: newInlineCategoryParentId,
        });
        if (result.success && result.data) {
            updateCourseField('categoryId', result.data.id);
            setShowNewCategoryForm(false);
            setNewInlineCategoryName('');
            setNewInlineCategoryParentId(null);
        }
        setIsAddingCategory(false);
    };

    const handleSave = (publishState: boolean) => {
        if (validateCourse()) {
            onSave({ ...course, isPublished: publishState });
        }
    };

    return (
        <div className="p-4 md:p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-bold">{initialCourse ? 'Edit Course' : 'Create New Course'}</h1>
                <div className="flex items-center gap-4">
                     <span className={`text-sm font-semibold px-3 py-1.5 rounded-full ${course.isPublished ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                        Status: {course.isPublished ? 'Published' : 'Draft'}
                    </span>
                    <button onClick={onExit} className="bg-gray-200 dark:bg-gray-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">Cancel</button>
                    {course.isPublished ? (
                        <>
                            <button onClick={() => handleSave(false)} className="bg-yellow-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-yellow-600 transition-colors">Revert to Draft</button>
                            <button onClick={() => handleSave(true)} className="bg-pink-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-pink-600 transition-colors">Save Changes</button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => handleSave(false)} className="bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors">Save Draft</button>
                            <button onClick={() => handleSave(true)} className="bg-pink-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-pink-600 transition-colors">Publish</button>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Course Details */}
                <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md space-y-4 self-start sticky top-28">
                    <h2 className="text-xl font-bold">Course Details</h2>
                    <div>
                        <label className="font-semibold">Title</label>
                        <input 
                            type="text" 
                            value={course.title} 
                            onChange={e => updateCourseField('title', e.target.value)} 
                            className={`w-full p-2 border rounded-lg dark:bg-gray-700 mt-1 ${errors.title ? 'border-red-500' : 'dark:border-gray-600'}`}
                        />
                        {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title}</p>}
                    </div>
                    
                    <RichTextEditor
                        label="Description"
                        value={course.description}
                        onChange={value => updateCourseField('description', value)}
                    />

                    <div>
                        <label className="font-semibold">Category</label>
                        <select 
                            value={course.categoryId} 
                            onChange={e => updateCourseField('categoryId', e.target.value)} 
                            className={`w-full p-2 border rounded-lg dark:bg-gray-700 mt-1 ${errors.categoryId ? 'border-red-500' : 'dark:border-gray-600'}`}
                        >
                             <option value="">Select a category</option>
                            {renderCategoryOptions(categoryTree)}
                        </select>
                        {errors.categoryId && <p className="text-sm text-red-500 mt-1">{errors.categoryId}</p>}
                        {!showNewCategoryForm ? (
                             <button type="button" onClick={() => setShowNewCategoryForm(true)} className="text-sm text-pink-500 mt-2 hover:underline">+ Add New Category</button>
                        ) : (
                            <div className="mt-2 p-4 border rounded-lg dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 space-y-2">
                                <input 
                                    type="text" 
                                    placeholder="New category name"
                                    value={newInlineCategoryName}
                                    onChange={e => setNewInlineCategoryName(e.target.value)}
                                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                />
                                <select 
                                    value={newInlineCategoryParentId || ''} 
                                    onChange={e => setNewInlineCategoryParentId(e.target.value || null)}
                                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                >
                                    <option value="">— Parent Category —</option>
                                    {renderCategoryOptions(categoryTree)}
                                </select>
                                <div className="flex gap-2 justify-end pt-1">
                                    <button type="button" onClick={() => setShowNewCategoryForm(false)} className="text-sm px-3 py-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600">Cancel</button>
                                    <button 
                                        type="button" 
                                        onClick={handleAddInlineCategory} 
                                        disabled={isAddingCategory || !newInlineCategoryName.trim()}
                                        className="text-sm font-semibold bg-pink-500 text-white px-3 py-1 rounded-md disabled:bg-gray-400"
                                    >
                                        {isAddingCategory ? 'Adding...' : 'Add'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    <div><label className="font-semibold">Thumbnail URL</label><input type="text" value={course.thumbnail} onChange={e => updateCourseField('thumbnail', e.target.value)} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 mt-1"/></div>
                    <img src={course.thumbnail} alt="Thumbnail preview" className="w-full rounded-lg object-cover aspect-video mt-2" />
                    
                    {course.isCertificationCourse !== false && (
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
                            <h3 className="text-lg font-bold">Final Exam</h3>
                            <p className="text-sm text-gray-500">Add a final exam required for certification. This will be presented to students after completing all modules.</p>
                            <button onClick={() => setEditingQuiz({ type: 'final', id: course.id, data: course.finalExam })} className="w-full flex items-center justify-center gap-2 bg-blue-100/50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold py-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50">
                                 <EditIcon className="w-4 h-4" /> {course.finalExam && course.finalExam.questions.length > 0 ? 'Edit Final Exam' : 'Add Final Exam'}
                            </button>
                        </div>
                    )}

                </div>

                {/* Curriculum Builder */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md space-y-6">
                     <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold">Curriculum</h2>
                        <button onClick={addModule} className="flex items-center gap-2 text-sm font-semibold text-pink-500"><PlusCircleIcon className="w-5 h-5" /> Add Module</button>
                    </div>
                    {course.modules.map(module => (
                        <div key={module.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-4">
                             <div className="flex items-center gap-4">
                                <input type="text" value={module.title} onChange={e => updateModule(module.id, { title: e.target.value })} className="flex-grow font-bold text-lg bg-transparent focus:outline-none focus:ring-0 border-none p-0"/>
                                <button onClick={() => setEditingQuiz({ type: 'module', id: module.id, data: module.quiz })} className="p-2 text-gray-500 hover:text-pink-500" title="Edit Module Quiz"><EditIcon className="w-5 h-5" /></button>
                                <button onClick={() => deleteModule(module.id)} className="p-2 text-gray-500 hover:text-red-500" title="Delete Module"><Trash2Icon className="w-5 h-5" /></button>
                            </div>
                            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
                                {module.lessons.map(lesson => (
                                    <div key={lesson.id} className="flex justify-between items-center p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                                        <span>{lesson.title}</span>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => setEditingLesson(lesson)} className="p-1 text-gray-500 hover:text-pink-500"><EditIcon className="w-4 h-4" /></button>
                                            <button onClick={() => deleteLesson(module.id, lesson.id)} className="p-1 text-gray-500 hover:text-red-500"><Trash2Icon className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                ))}
                                <button onClick={() => addLesson(module.id)} className="w-full text-center text-sm py-2 text-pink-500 font-semibold hover:bg-pink-50 dark:hover:bg-pink-900/30 rounded-lg">+ Add Lesson</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <LessonEditModal isOpen={!!editingLesson} onClose={() => setEditingLesson(null)} lesson={editingLesson} onSave={saveLesson} />
            <QuizEditorModal isOpen={!!editingQuiz} onClose={() => setEditingQuiz(null)} quizData={editingQuiz?.data} onSave={saveQuiz} title={editingQuiz?.type === 'final' ? 'Final Exam Editor' : 'Module Quiz Editor'} />
        </div>
    );
};

export default CourseEditor;
