
import { supabase } from './supabaseClient';
import { Course, Enrollment, User, Role, Module, Lesson, DiscussionPost, Conversation, Message, CalendarEvent, HistoryLog, LiveSession } from './types';

// ====================================================================================
// ===== DATA TRANSFORMATION UTILS
// ====================================================================================

// Generic function to convert a single object's keys from snake_case to camelCase
// FIX: Exported snakeToCamel to be used in other parts of the application.
export const snakeToCamel = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(snakeToCamel);
    }
    return Object.keys(obj).reduce((acc, key) => {
        const camelKey = key.replace(/_([a-z])/g, g => g[1].toUpperCase());
        acc[camelKey] = snakeToCamel(obj[key]);
        return acc;
    }, {} as any);
};


// ====================================================================================
// ===== DATA FETCHING API
// ====================================================================================

export const getProfile = async (userId: string, email: string): Promise<User | null> => {
    const { data, error } = await supabase
        .from('profiles')
        .select(`*`)
        .eq('id', userId)
        .single();
    
    if (error) {
        console.error("Error fetching profile:", error);
        return null;
    }
    if (data) {
        return { ...snakeToCamel(data), email };
    }
    return null;
}

export const getInitialData = async (user: User) => {
    try {
        // 1. Fetch all base data in parallel
        const [
            coursesRes, 
            modulesRes, 
            lessonsRes, 
            enrollmentsRes,
            usersRes,
            conversationsRes,
            messagesRes,
            calendarEventsRes,
            historyLogsRes,
            liveSessionsRes
        ] = await Promise.all([
            supabase.from('courses').select('*, instructor:instructor_id (first_name, last_name)'),
            supabase.from('modules').select('*'),
            supabase.from('lessons').select('*'),
            supabase.from('enrollments').select('*'),
            supabase.from('profiles').select('*'), // For admin/instructor views
            supabase.from('conversations').select('*').contains('participant_ids', [user.id]),
            supabase.from('messages').select('*'),
            supabase.from('calendar_events').select('*').eq('user_id', user.id),
            supabase.from('history_logs').select('*').eq('user_id', user.id).order('timestamp', { ascending: false }),
            supabase.from('live_sessions').select('*'),
        ]);

        if (coursesRes.error) throw coursesRes.error;
        if (modulesRes.error) throw modulesRes.error;
        if (lessonsRes.error) throw lessonsRes.error;
        if (enrollmentsRes.error) throw enrollmentsRes.error;
        if (usersRes.error) throw usersRes.error;
        if (conversationsRes.error) throw conversationsRes.error;
        if (messagesRes.error) throw messagesRes.error;
        if (calendarEventsRes.error) throw calendarEventsRes.error;
        if (historyLogsRes.error) throw historyLogsRes.error;
        if (liveSessionsRes.error) throw liveSessionsRes.error;

        // 2. Transform and assemble data
        const lessons: Lesson[] = snakeToCamel(lessonsRes.data);
        const modules: Module[] = snakeToCamel(modulesRes.data).map((module: any) => ({
            ...module,
            lessons: lessons.filter(l => l.moduleId === module.id).sort((a,b) => a.order - b.order)
        }));
        
        const courses: Course[] = snakeToCamel(coursesRes.data).map((course: any) => {
            const courseModules = modules.filter(m => m.courseId === course.id).sort((a,b) => a.order - b.order);
            const totalLessons = courseModules.reduce((acc, mod) => acc + mod.lessons.length, 0);
            const totalMinutes = courseModules.reduce((acc, mod) => acc + mod.lessons.reduce((lAcc, l) => lAcc + l.duration, 0), 0);
            
            return {
                ...course,
                instructorName: course.instructor ? `${course.instructor.firstName} ${course.instructor.lastName}` : 'Unknown Instructor',
                modules: courseModules,
                totalLessons,
                estimatedDuration: Math.round(totalMinutes / 60),
            }
        });

        const allUsers: User[] = snakeToCamel(usersRes.data);
        
        // Filter messages based on fetched conversations for the user
        const conversationIds = new Set(conversationsRes.data.map(c => c.id));
        const relevantMessages = messagesRes.data.filter(m => conversationIds.has(m.conversation_id));

        return {
            courses,
            enrollments: snakeToCamel(enrollmentsRes.data),
            allUsers,
            conversations: snakeToCamel(conversationsRes.data),
            messages: snakeToCamel(relevantMessages),
            calendarEvents: snakeToCamel(calendarEventsRes.data),
            historyLogs: snakeToCamel(historyLogsRes.data),
            liveSessions: snakeToCamel(liveSessionsRes.data),
        };

    } catch (error) {
        console.error("Error fetching initial dashboard data:", error);
        return null;
    }
};

export const getDiscussions = async (lessonId: string): Promise<DiscussionPost[]> => {
    const { data, error } = await supabase
        .from('discussion_posts')
        .select(`*, author:author_id (id, first_name, last_name, avatar_url)`)
        .eq('lesson_id', lessonId)
        .is('parent_post_id', null) // Fetch only top-level posts
        .order('timestamp', { ascending: false });

    if (error) {
        console.error('Error fetching discussions:', error);
        return [];
    }

    // TODO: Implement fetching replies recursively if needed
    return snakeToCamel(data).map((post: any) => ({
        ...post,
        author: {
            id: post.author.id,
            firstName: post.author.firstName,
            lastName: post.author.lastName,
            avatar: post.author.avatarUrl
        },
        replies: [] // Placeholder for replies
    }));
}


// ====================================================================================
// ===== DATA MUTATION API
// ====================================================================================

export const postDiscussion = async (post: { lessonId: string; authorId: string; content: string; }): Promise<DiscussionPost | null> => {
    const { lessonId, authorId, content } = post;
    const { data, error } = await supabase
        .from('discussion_posts')
        .insert({ lesson_id: lessonId, author_id: authorId, content })
        .select(`*, author:author_id (id, first_name, last_name, avatar_url)`)
        .single();
    
    if (error) {
        console.error('Error posting discussion:', error);
        return null;
    }
    const newPost = snakeToCamel(data);
    return {
        ...newPost,
         author: {
            id: newPost.author.id,
            firstName: newPost.author.firstName,
            lastName: newPost.author.lastName,
            avatar: newPost.author.avatarUrl
        },
        replies: []
    };
};

export const updateEnrollment = async (enrollment: Enrollment): Promise<Enrollment | null> => {
    const payload = {
        user_id: enrollment.userId,
        course_id: enrollment.courseId,
        progress: enrollment.progress,
        completed_lesson_ids: enrollment.completedLessonIds,
        quiz_scores: enrollment.quizScores,
        last_accessed_lesson_id: enrollment.lastAccessedLessonId
    };

    const { data, error } = await supabase
        .from('enrollments')
        .upsert(payload)
        .select()
        .single();
    
    if (error) {
        console.error("Error updating enrollment:", error);
        return null;
    }
    return snakeToCamel(data);
};

export const saveCourse = async (course: Course) => {
    try {
        // 1. Upsert course details
        const { id, title, description, thumbnail, category, instructorId } = course;
        const coursePayload = { id, title, description, thumbnail, category, instructor_id: instructorId };
        const { error: courseError } = await supabase.from('courses').upsert(coursePayload);
        if (courseError) throw courseError;
        
        // 2. Handle Modules
        const modulePayloads = course.modules.map((m, index) => ({
            id: m.id,
            course_id: course.id,
            title: m.title,
            order: index
        }));
        const receivedModuleIds = new Set(modulePayloads.map(m => m.id));
        const { data: existingModules } = await supabase.from('modules').select('id').eq('course_id', course.id);
        const modulesToDelete = existingModules?.filter(m => !receivedModuleIds.has(m.id)).map(m => m.id) || [];
        if(modulesToDelete.length > 0) {
            const { error: deleteModError } = await supabase.from('modules').delete().in('id', modulesToDelete);
            if (deleteModError) throw deleteModError;
        }
        if(modulePayloads.length > 0) {
            const { error: moduleError } = await supabase.from('modules').upsert(modulePayloads);
            if (moduleError) throw moduleError;
        }

        // 3. Handle Lessons
        const lessonPayloads = course.modules.flatMap((m, moduleIndex) => m.lessons.map((l, lessonIndex) => ({
            id: l.id,
            module_id: m.id,
            title: l.title,
            type: l.type,
            content: l.content,
            duration: l.duration,
            order: lessonIndex
        })));
        
        const receivedLessonIds = new Set(lessonPayloads.map(l => l.id));
        const allModuleIds = course.modules.map(m => m.id);
        
        if (allModuleIds.length > 0) {
            const { data: existingLessons } = await supabase.from('lessons').select('id').in('module_id', allModuleIds);
            const lessonsToDelete = existingLessons?.filter(l => !receivedLessonIds.has(l.id)).map(l => l.id) || [];
            if(lessonsToDelete.length > 0) {
                 const { error: deleteLesError } = await supabase.from('lessons').delete().in('id', lessonsToDelete);
                 if (deleteLesError) throw deleteLesError;
            }
        }
       
        if(lessonPayloads.length > 0) {
            const { error: lessonError } = await supabase.from('lessons').upsert(lessonPayloads);
            if (lessonError) throw lessonError;
        }
        
        return { success: true };
    } catch(error) {
        console.error("Error saving course:", error);
        return { success: false, error };
    }
};

export const sendMessage = async (newMessage: Omit<Message, 'id' | 'isRead'>) => {
    // This is simplified. A real app would have a backend function to handle finding/creating conversations.
    // For now, we assume conversationId is correctly provided.
     const { conversationId, senderId, subject, content, timestamp } = newMessage;
     const payload = {
        conversation_id: conversationId,
        sender_id: senderId,
        subject,
        content,
        timestamp,
     };
     const { data, error } = await supabase.from('messages').insert(payload).select().single();
     if(error) {
         console.error("Error sending message:", error);
         return null;
     }
     // Also update conversation's last message timestamp
     await supabase.from('conversations').update({ last_message_timestamp: timestamp }).eq('id', conversationId);
     return snakeToCamel(data);
};

export const scheduleSession = async (session: Omit<LiveSession, 'id'>) => {
    const payload = {
        title: session.title,
        description: session.description,
        date_time: session.dateTime,
        duration: session.duration,
        instructor_id: session.instructorId,
        audience: session.audience
    };
    const { data, error } = await supabase.from('live_sessions').insert(payload).select().single();
    if (error) {
        console.error("Error scheduling session:", error);
        return null;
    }

    // Also create a calendar event for it
    const newCalendarEvent = {
        user_id: session.instructorId,
        date: session.dateTime.split('T')[0],
        title: session.title,
        course_id: session.audience !== 'all' ? session.audience : undefined,
        type: 'live_session',
    };
    await supabase.from('calendar_events').insert(newCalendarEvent);

    return snakeToCamel(data);
}