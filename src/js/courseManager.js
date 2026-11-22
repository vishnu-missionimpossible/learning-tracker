/**
 * Course Manager Module - FIXED VERSION
 * Handles CRUD operations for courses with better error handling
 */

const CourseManager = {
    isCreating: false, // Prevent duplicate submissions

    /**
     * Create new course
     * @param {Object} courseData - Course details
     * @returns {Promise} - Firestore promise
     */
    createCourse: async (courseData) => {
        // Prevent duplicate submissions
        if (CourseManager.isCreating) {
            Utils.showError('Creating course... Please wait');
            return;
        }

        try {
            CourseManager.isCreating = true;
            const userId = AuthModule.getCurrentUser().uid;

            if (!courseData.courseName || !courseData.courseName.trim()) {
                throw new Error('Course name is required');
            }
            if (!courseData.startDate || !/^\d{4}-\d{2}-\d{2}$/.test(courseData.startDate)) {
                throw new Error('Start date is required');
            }
            if (courseData.endDate && !/^\d{4}-\d{2}-\d{2}$/.test(courseData.endDate)) {
                throw new Error('End date is not valid');
            }
            if (courseData.endDate && courseData.endDate < courseData.startDate) {
                throw new Error('End date cannot be before the start date');
            }


            const course = {
                userId: userId,
                courseName: courseData.courseName.trim().slice(0, 100),
                startDate: courseData.startDate,
                endDate: courseData.endDate || null,
                description: (courseData.description || '').slice(0, 500),
                createdAt: new Date(),
                updatedAt: new Date(),
                isActive: true,
                // Sharing: owner is always the first member
                memberIds: [userId],
                memberEmails: { [userId]: (AuthModule.getCurrentUser().email || '').toLowerCase() },
                invitedEmails: []
            };

            const docRef = await db.collection('courses').add(course);
            console.log('✓ Course created with ID:', docRef.id);

            Utils.showSuccess(Fun.msg('course'));

            // Wait a bit for the success message to show
            setTimeout(() => {
                AppController.showCourses();
            }, 1000);

            return { id: docRef.id, ...course };
        } catch (error) {
            console.error('Error creating course:', error);
            Utils.showError('Error: ' + error.message);
            throw error;
        } finally {
            CourseManager.isCreating = false;
        }
    },

    /**
     * Get all courses for current user
     * @returns {Promise<Array>} - Array of courses
     */
    getCourses: async () => {
        try {
            const user = AuthModule.getCurrentUser();
            const userId = user.uid;

            // Own courses (always works) + courses shared with me
            const own = await db.collection('courses').where('userId', '==', userId).get();
            let shared = [];
            try {
                const snap = await db.collection('courses').where('memberIds', 'array-contains', userId).get();
                shared = snap.docs;
            } catch (e) {
                console.warn('Could not load shared courses (check Firestore rules):', e.message);
            }

            const map = {};
            [...own.docs, ...shared].forEach(doc => {
                map[doc.id] = { id: doc.id, ...doc.data() };
            });
            const courses = Object.values(map).filter(c => c.isActive !== false);

            // One-time migration of older courses so they can be shared
            courses.forEach(c => {
                if (c.userId === userId && !c.memberIds) {
                    c.memberIds = [userId];
                    c.memberEmails = { [userId]: (user.email || '').toLowerCase() };
                    c.invitedEmails = c.invitedEmails || [];
                    db.collection('courses').doc(c.id).update({
                        memberIds: c.memberIds,
                        memberEmails: c.memberEmails,
                        invitedEmails: c.invitedEmails
                    }).catch(err => console.warn('Course migration failed:', err.message));
                }
            });

            const toMs = (t) => (t && t.toMillis ? t.toMillis() : new Date(t || 0).getTime());
            courses.sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));
            console.log('Fetched', courses.length, 'courses');
            return courses;
        } catch (error) {
            console.error('Error fetching courses:', error);
            Utils.showError('Error loading courses: ' + error.message);
            return [];
        }
    },

    /**
     * Get single course by ID
     * @param {string} courseId - Course ID
     * @returns {Promise<Object>} - Course object
     */
    getCourse: async (courseId) => {
        try {
            const doc = await db.collection('courses').doc(courseId).get();
            if (!doc.exists) {
                throw new Error('Course not found');
            }
            return { id: doc.id, ...doc.data() };
        } catch (error) {
            console.error('Error fetching course:', error);
            Utils.showError('Error: ' + error.message);
            throw error;
        }
    },

    /**
     * Update course
     * @param {string} courseId - Course ID
     * @param {Object} updates - Fields to update
     * @returns {Promise} - Firestore promise
     */
    updateCourse: async (courseId, updates) => {
        try {
            updates.updatedAt = new Date();
            await db.collection('courses').doc(courseId).update(updates);
            Utils.showSuccess('✓ Course updated successfully!');
        } catch (error) {
            console.error('Error updating course:', error);
            Utils.showError('Error: ' + error.message);
            throw error;
        }
    },

    /**
     * Delete course (soft delete)
     * @param {string} courseId - Course ID
     * @returns {Promise} - Firestore promise
     */
    deleteCourse: async (courseId) => {
        try {
            if (confirm('Are you sure you want to delete this course?')) {
                await db.collection('courses').doc(courseId).update({
                    isActive: false,
                    updatedAt: new Date()
                });
                console.log('✓ Course deleted');
                Utils.showSuccess(Fun.msg('courseDelete'));

                setTimeout(() => {
                    AppController.showCourses();
                }, 800);
            }
        } catch (error) {
            console.error('Error deleting course:', error);
            Utils.showError('Error: ' + error.message);
            throw error;
        }
    }
};

console.log('✓ Course Manager module loaded');