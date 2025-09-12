import { supabase } from './supabaseClient';
import { Course, Enrollment, User, Role, Module, Lesson, DiscussionPost, Conversation, Message, CalendarEvent, LiveSession, Category, QuizAttempt } from './types';

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
    // 1. Try to fetch the existing profile
    const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`*`)
        .eq('id', userId)
        .single();

    // If we get an error that is NOT "0 rows", something is wrong.
    // PGRST116 is the code for " esattamente una riga" (exactly one row) not being found.
    if (profileError && profileError.code !== 'PGRST116') {
        console.error("Error fetching profile:", profileError.message);
        return null;
    }
    
    // 2. If profile exists, return it
    if (profileData) {
        return snakeToCamel(profileData);
    }

    // 3. If profile does NOT exist, create it. This handles the race condition on first login.
    console.warn(`Profile not found for user ${userId}. Attempting to create one.`);

    // Get user details from auth to create the profile
    const { data: { user } } = await supabase.auth.getUser();

    // Safety check in case the session is invalid
    if (!user || user.id !== userId) {
        console.error("Mismatched user or unable to get auth user to create profile.");
        return null;
    }

    // Insert a new profile using auth details
    const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
            id: user.id,
            email: user.email,
            first_name: user.user_metadata?.firstName || '',
            last_name: user.user_metadata?.lastName || '',
            // The `handle_new_user` trigger should ideally set the role, 
            // but we default to 'student' as a fallback.
            role: user.user_metadata?.role || 'student',
        })
        .select()
        .single();

    if (insertError) {
        console.error("Error creating new profile:", insertError.message);
        return null;
    }

    console.log(`Successfully created new profile for user ${userId}.`);
    return snakeToCamel(newProfile);
}


export const getInitialData = async (user: User) => {
    try {
        // 1. Define role-based queries for all sensitive/user-specific data
        const enrollmentsPromise = user.role === Role.ADMIN
            ? supabase.from('enrollments').select('*')
            : supabase.from('enrollments').select('*').eq('user_id', user.id);
        
        const conversationsPromise = user.role === Role.ADMIN
            ? supabase.from('conversations').select('*')
            : supabase.from('conversations').select('*').contains('participant_ids', [user.id]);
            
        const calendarEventsPromise = user.role === Role.ADMIN
            ? supabase.from('calendar_events').select('*')
            : supabase.from('calendar_events').select('*').eq('user_id', user.id);

        // For non-admins, RLS policies should restrict which users they can see.
        const usersPromise = supabase.from('profiles').select('*');

        // 2. Fetch base data in parallel
        const [
            coursesRes, 
            modulesRes, 
            lessonsRes, 
            enrollmentsRes,
            usersRes,
            conversationsRes,
            calendarEventsRes,
            liveSessionsRes,
            categoriesRes,
        ] = await Promise.all([
            supabase.from('courses').select('*'), // Use a simple query instead of a complex join
            supabase.from('modules').select('*'),
            supabase.from('lessons').select('*'),
            enrollmentsPromise,
            usersPromise,
            conversationsPromise,
            calendarEventsPromise,
            supabase.from('live_sessions').select('*'),
            supabase.from('categories').select('*').order('name'),
        ]);

        // 3. Centralized error checking for the first batch
        const firstBatchResults = { coursesRes, modulesRes, lessonsRes, enrollmentsRes, usersRes, conversationsRes, calendarEventsRes, liveSessionsRes, categoriesRes };
        for (const [key, result] of Object.entries(firstBatchResults)) {
            if (result.error) {
                console.error(`Error fetching ${key}:`, result.error);
                throw result.error;
            }
        }
        
        // 4. Fetch dependent data (messages) based on role
        const conversationIds = (conversationsRes.data || []).map(c => c.id);
        let messagesRes;
        if (user.role === Role.ADMIN) {
            messagesRes = await supabase.from('messages').select('*');
        } else {
             messagesRes = conversationIds.length > 0
                ? await supabase.from('messages').select('*').in('conversation_id', conversationIds)
                : { data: [], error: null };
        }
            
        if (messagesRes.error) throw messagesRes.error;

        // 5. Transform and assemble the final data structure
        const allUsers: User[] = snakeToCamel(usersRes.data || []);
        const userMap = new Map(allUsers.map(u => [u.id, u]));

        const lessons: Lesson[] = snakeToCamel(lessonsRes.data || []);
        const modules: Module[] = snakeToCamel(modulesRes.data || []).map((module: any) => ({
            ...module,
            lessons: lessons.filter(l => l.moduleId === module.id).sort((a,b) => a.order - b.order)
        }));
        
        const courses: Course[] = snakeToCamel(coursesRes.data || []).map((course: any) => {
            const courseModules = modules.filter(m => m.courseId === course.id).sort((a,b) => a.order - b.order);
            const totalLessons = courseModules.reduce((acc, mod) => acc + mod.lessons.length, 0);
            const totalMinutes = courseModules.reduce((acc, mod) => acc + mod.lessons.reduce((lAcc, l) => lAcc + l.duration, 0), 0);
            const instructor = userMap.get(course.instructorId);
            
            return {
                ...course,
                instructorName: instructor ? `${instructor.firstName} ${instructor.lastName}` : 'Unknown Instructor',
                modules: courseModules,
                totalLessons,
                estimatedDuration: Math.round(totalMinutes / 60),
            }
        });

        
        return {
            courses,
            enrollments: snakeToCamel(enrollmentsRes.data || []),
            allUsers,
            conversations: snakeToCamel(conversationsRes.data || []),
            messages: snakeToCamel(messagesRes.data || []),
            calendarEvents: snakeToCamel(calendarEventsRes.data || []),
            liveSessions: snakeToCamel(liveSessionsRes.data || []),
            categories: snakeToCamel(categoriesRes.data || []),
        };

    } catch (error) {
        console.error("Error fetching initial dashboard data:", error);
        throw error;
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

export const saveQuizAttempt = async (attempt: Omit<QuizAttempt, 'id' | 'submittedAt'>) => {
    const payload = {
        user_id: attempt.userId,
        course_id: attempt.courseId,
        lesson_id: attempt.lessonId,
        score: attempt.score,
        passed: attempt.passed,
        answers: attempt.answers,
    };
    const { data, error } = await supabase.from('quiz_attempts').insert(payload).select().single();

    if (error) {
        console.error("Error saving quiz attempt:", error);
        return { success: false, error };
    }
    return { success: true, data: snakeToCamel(data) };
};

export const saveCourse = async (course: Course) => {
    try {
        const isNewCourse = course.id.startsWith('new-course-');
        let dbCourseId = course.id;
        let savedModules: (Module & { lessons: Lesson[] })[] = [];

        // 1. Handle Course Record (Insert vs. Update)
        // FIX: Recalculate hasQuizzes based on the current state of the course content.
        const hasQuizzes = course.modules.some(module => module.quiz && module.quiz.questions.length > 0);

        const coursePayload = {
            title: course.title,
            description: course.description,
            thumbnail: course.thumbnail,
            category_id: course.categoryId || null,
            instructor_id: course.instructorId,
            has_quizzes: hasQuizzes,
            is_certification_course: course.isCertificationCourse,
            is_hidden: course.isHidden,
            is_published: course.isPublished,
        };

        if (isNewCourse) {
            const { data: newCourse, error } = await supabase.from('courses').insert(coursePayload).select('id').single();
            if (error) throw new Error(`Failed to create course: ${error.message}`);
            dbCourseId = newCourse.id;
        } else {
            const { error } = await supabase.from('courses').update(coursePayload).eq('id', dbCourseId);
            if (error) throw new Error(`Failed to update course: ${error.message}`);
        }

        // 2. Handle Modules
        for (const [index, module] of course.modules.entries()) {
            const isNewModule = module.id.startsWith('new-module-');
            let savedModuleId = module.id;

            if (isNewModule) {
                const insertPayload = {
                    title: module.title,
                    quiz: module.quiz,
                    order: index,
                    course_id: dbCourseId,
                };
                const { data: newModule, error } = await supabase.from('modules').insert(insertPayload).select('id').single();
                if (error) throw new Error(`Failed to create module: ${error.message}`);
                savedModuleId = newModule.id;
            } else {
                const updatePayload = {
                    title: module.title,
                    quiz: module.quiz,
                    order: index,
                };
                const { error } = await supabase.from('modules').update(updatePayload).eq('id', module.id);
                if (error) throw new Error(`Failed to update module: ${error.message}`);
            }
            savedModules.push({ ...module, id: savedModuleId, courseId: dbCourseId });
        }

        const savedModuleIds = new Set(savedModules.map(m => m.id));
        const { data: existingModules } = await supabase.from('modules').select('id').eq('course_id', dbCourseId);
        const modulesToDelete = existingModules?.filter(m => !savedModuleIds.has(m.id)).map(m => m.id) || [];
        if (modulesToDelete.length > 0) {
            await supabase.from('modules').delete().in('id', modulesToDelete);
        }

        // 3. Handle Lessons
        const allSavedLessonIds = new Set<string>();
        for (const module of savedModules) {
            for (const [index, lesson] of module.lessons.entries()) {
                const isNewLesson = lesson.id.startsWith('new-lesson-');
                let savedLessonId = lesson.id;

                if (isNewLesson) {
                     const insertPayload = {
                        title: lesson.title,
                        type: lesson.type,
                        content: lesson.content,
                        duration: lesson.duration,
                        order: index,
                        module_id: module.id
                    };
                    const { data: newLesson, error } = await supabase.from('lessons').insert(insertPayload).select('id').single();
                    if (error) throw new Error(`Failed to create lesson: ${error.message}`);
                    savedLessonId = newLesson.id;
                } else {
                     const updatePayload = {
                        title: lesson.title,
                        type: lesson.type,
                        content: lesson.content,
                        duration: lesson.duration,
                        order: index,
                    };
                    const { error } = await supabase.from('lessons').update(updatePayload).eq('id', lesson.id);
                    if (error) throw new Error(`Failed to update lesson: ${error.message}`);
                }
                allSavedLessonIds.add(savedLessonId);
            }
        }
        
        if (savedModuleIds.size > 0) {
            const { data: existingLessons } = await supabase.from('lessons').select('id').in('module_id', Array.from(savedModuleIds));
            const lessonsToDelete = existingLessons?.filter(l => !allSavedLessonIds.has(l.id)).map(l => l.id) || [];
            if (lessonsToDelete.length > 0) {
                await supabase.from('lessons').delete().in('id', lessonsToDelete);
            }
        }
        
        return { success: true };
    } catch (error: any) {
        console.error("Error saving course:", error);
        return { success: false, error: { message: error.message || 'An unknown error occurred.' } };
    }
};

export const deleteCourse = async (courseId: string) => {
    try {
        // Step 1: Get all modules and lessons associated with the course
        const { data: modules, error: modulesError } = await supabase
            .from('modules')
            .select('id, lessons(id)')
            .eq('course_id', courseId);
        
        if (modulesError) throw new Error(`Could not fetch modules: ${modulesError.message}`);

        const moduleIds = modules.map(m => m.id);
        const lessonIds = modules.flatMap(m => m.lessons.map((l: any) => l.id));

        // Step 2: Delete associated data in order
        if (lessonIds.length > 0) {
            // Delete discussion posts
            const { error: discussionError } = await supabase.from('discussion_posts').delete().in('lesson_id', lessonIds);
            if (discussionError) throw new Error(`Could not delete discussions: ${discussionError.message}`);
        }

        // Delete quiz attempts for the course
        const { error: quizAttemptsError } = await supabase.from('quiz_attempts').delete().eq('course_id', courseId);
        if (quizAttemptsError) throw new Error(`Could not delete quiz attempts: ${quizAttemptsError.message}`);

        // Delete enrollments
        const { error: enrollmentsError } = await supabase.from('enrollments').delete().eq('course_id', courseId);
        if (enrollmentsError) throw new Error(`Could not delete enrollments: ${enrollmentsError.message}`);

        if (lessonIds.length > 0) {
            // Delete lessons
            const { error: lessonsError } = await supabase.from('lessons').delete().in('id', lessonIds);
            if (lessonsError) throw new Error(`Could not delete lessons: ${lessonsError.message}`);
        }

        if (moduleIds.length > 0) {
            // Delete modules
            const { error: deleteModulesError } = await supabase.from('modules').delete().in('id', moduleIds);
            if (deleteModulesError) throw new Error(`Could not delete modules: ${deleteModulesError.message}`);
        }

        // Finally, delete the course itself
        const { error: courseError } = await supabase.from('courses').delete().eq('id', courseId);
        if (courseError) throw new Error(`Could not delete course: ${courseError.message}`);

        return { success: true };
    } catch (error: any) {
        console.error("Error deleting course:", error);
        return { success: false, error: { message: error.message || 'An unknown error occurred.' } };
    }
};

export const updateCourseVisibility = async (courseId: string, isHidden: boolean) => {
    const { data, error } = await supabase
      .from('courses')
      .update({ is_hidden: isHidden })
      .eq('id', courseId)
      .select('id, is_hidden')
      .single();

    if (error) {
      console.error('Error updating course visibility:', error);
      return { success: false, error };
    }
    return { success: true, data: snakeToCamel(data) };
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

export const addCategory = async (category: { name: string; parentId: string | null; }) => {
    const { data, error } = await supabase
        .from('categories')
        .insert({ name: category.name, parent_id: category.parentId })
        .select()
        .single();
    if (error) {
        console.error('Error adding category:', error);
        return { success: false, error };
    }
    return { success: true, data: snakeToCamel(data) };
};

export const updateCategory = async (category: { id: string; name: string; parentId: string | null; }) => {
    const { data, error } = await supabase
        .from('categories')
        .update({ name: category.name, parent_id: category.parentId })
        .eq('id', category.id)
        .select()
        .single();
    if (error) {
        console.error('Error updating category:', error);
        return { success: false, error };
    }
    return { success: true, data: snakeToCamel(data) };
};

export const deleteCategory = async (categoryId: string) => {
    // Check for child categories
    const { data: children, error: childrenError } = await supabase.from('categories').select('id', { count: 'exact' }).eq('parent_id', categoryId);
    if (childrenError) return { success: false, error: childrenError };
    if ((children?.length || 0) > 0) return { success: false, error: { message: "Cannot delete a category that has child categories. Please reassign children first." } };

    // Check for associated courses
    const { data: courses, error: coursesError } = await supabase.from('courses').select('id', { count: 'exact' }).eq('category_id', categoryId);
    if (coursesError) return { success: false, error: coursesError };
    if ((courses?.length || 0) > 0) return { success: false, error: { message: "Cannot delete category. Reassign courses from this category first." } };

    const { error } = await supabase.from('categories').delete().eq('id', categoryId);
    if (error) {
        console.error('Error deleting category:', error);
        return { success: false, error };
    }
    return { success: true };
};