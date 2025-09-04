import { supabase } from './supabaseClient';
import { Course, Enrollment, User, Role, Module, Lesson, DiscussionPost, Conversation, Message, CalendarEvent, HistoryLog, LiveSession, Category } from './types';

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

export const getProfile = async (userId: string): Promise<User | null> => {
    const { data, error } = await supabase
        .from('users_view')
        .select(`*`)
        .eq('id', userId)
        .single();
    
    if (error) {
        console.error("Error fetching profile:", error);
        return null;
    }
    return snakeToCamel(data);
}

export const getInitialData = async (user: User) => {
    try {
        // 1. Define role-based queries and independent queries
        const enrollmentsPromise = user.role === Role.ADMIN
            ? supabase.from('enrollments').select('*')
            : supabase.from('enrollments').select('*').eq('user_id', user.id);
        
        // For non-admins, RLS policies should restrict which users they can see.
        // The app currently needs this for the user management page and messaging.
        const usersPromise = supabase.from('users_view').select('*');

        // 2. Fetch base data in parallel
        const [
            coursesRes, 
            modulesRes, 
            lessonsRes, 
            enrollmentsRes,
            usersRes,
            conversationsRes,
            calendarEventsRes,
            historyLogsRes,
            liveSessionsRes,
            categoriesRes,
        ] = await Promise.all([
            supabase.from('courses').select('*, instructor:profiles!instructor_id(first_name, last_name)'),
            supabase.from('modules').select('*'),
            supabase.from('lessons').select('*'),
            enrollmentsPromise,
            usersPromise,
            supabase.from('conversations').select('*').contains('participant_ids', [user.id]),
            supabase.from('calendar_events').select('*').eq('user_id', user.id),
            supabase.from('history_logs').select('*').eq('user_id', user.id).order('timestamp', { ascending: false }),
            supabase.from('live_sessions').select('*'),
            supabase.from('categories').select('*'),
        ]);

        // 3. Centralized error checking for the first batch
        const firstBatchResults = { coursesRes, modulesRes, lessonsRes, enrollmentsRes, usersRes, conversationsRes, calendarEventsRes, historyLogsRes, liveSessionsRes, categoriesRes };
        for (const [key, result] of Object.entries(firstBatchResults)) {
            if (result.error) {
                console.error(`Error fetching ${key}:`, result.error);
                throw result.error;
            }
        }
        
        // 4. Fetch dependent data (messages) based on the user's conversations
        const conversationIds = (conversationsRes.data || []).map(c => c.id);
        const messagesRes = conversationIds.length > 0
            ? await supabase.from('messages').select('*').in('conversation_id', conversationIds)
            : { data: [], error: null };
            
        if (messagesRes.error) throw messagesRes.error;

        // 5. Transform and assemble the final data structure
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
        
        return {
            courses,
            enrollments: snakeToCamel(enrollmentsRes.data),
            allUsers,
            conversations: snakeToCamel(conversationsRes.data),
            messages: snakeToCamel(messagesRes.data),
            calendarEvents: snakeToCamel(calendarEventsRes.data),
            historyLogs: snakeToCamel(historyLogsRes.data),
            liveSessions: snakeToCamel(liveSessionsRes.data),
            categories: snakeToCamel(categoriesRes.data),
        };

    } catch (error) {
        console.error("Error fetching initial dashboard data:", error);
        return null;
    }
};

export const getDiscussions = async (lessonId: string): Promise<DiscussionPost[]> => {
    const { data, error } = await supabase
        .from('discussion_posts')
        .select(`*, author:profiles!author_id(id, first_name, last_name, avatar_url)`)
        .eq('lesson_id', lessonId)
        .is('parent_post_id', null) // Fetch only top-level posts
        .order('timestamp', { ascending: false });

    if (error) {
        console.error('Error fetching discussions:', error);
        return [];
    }

    const defaultAuthor = { id: 'deleted', firstName: 'Deleted', lastName: 'User', avatarUrl: '' };

    // TODO: Implement fetching replies recursively if needed
    return snakeToCamel(data).map((post: any) => ({
        ...post,
        author: post.author ? {
            id: post.author.id,
            firstName: post.author.firstName,
            lastName: post.author.lastName,
            avatarUrl: post.author.avatarUrl
        } : defaultAuthor,
        replies: [] // Placeholder for replies
    }));
}


// ====================================================================================
// ===== DATA MUTATION API
// ====================================================================================
export const updateUserProfile = async (userId: string, updates: { firstName?: string; lastName?: string; role?: Role; }) => {
    const payload: { [key: string]: any } = {
        first_name: updates.firstName,
        last_name: updates.lastName,
        role: updates.role,
    };
    
    // remove undefined keys
    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

    const { data, error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', userId)
        .select()
        .single();
    
    if (error) {
        console.error('Error updating user profile:', error);
        return { success: false, error };
    }
    return { success: true, data: snakeToCamel(data) };
};

export const postDiscussion = async (post: { lessonId: string; authorId: string; content: string; }): Promise<DiscussionPost | null> => {
    const { lessonId, authorId, content } = post;
    const { data, error } = await supabase
        .from('discussion_posts')
        .insert({ lesson_id: lessonId, author_id: authorId, content })
        .select(`*, author:profiles!author_id(id, first_name, last_name, avatar_url)`)
        .single();
    
    if (error) {
        console.error('Error posting discussion:', error);
        return null;
    }

    const defaultAuthor = { id: 'deleted', firstName: 'Deleted', lastName: 'User', avatarUrl: '' };
    const newPost = snakeToCamel(data);

    return {
        ...newPost,
         author: newPost.author ? {
            id: newPost.author.id,
            firstName: newPost.author.firstName,
            lastName: newPost.author.lastName,
            avatarUrl: newPost.author.avatarUrl
        } : defaultAuthor,
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
        const { id, title, description, thumbnail, categoryId, instructorId } = course;
        const coursePayload = { id, title, description, thumbnail, category_id: categoryId, instructor_id: instructorId };
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
    const newSession = snakeToCamel(data);

    // Also create a calendar event for it
    const newCalendarEvent = {
        user_id: session.instructorId, // This might need adjustment if students should see it too
        date: session.dateTime.split('T')[0],
        title: `Live: ${session.title}`,
        course_id: session.audience !== 'all' ? session.audience : undefined,
        type: 'live_session',
        live_session_id: newSession.id,
    };
    await supabase.from('calendar_events').insert(newCalendarEvent);

    return newSession;
}

export const deleteSession = async (sessionId: string) => {
    // Also delete the associated calendar event
    await supabase.from('calendar_events').delete().match({ live_session_id: sessionId });
    
    const { error } = await supabase.from('live_sessions').delete().match({ id: sessionId });
    if (error) {
        console.error("Error deleting session:", error);
        return { success: false, error };
    }
    return { success: true };
}