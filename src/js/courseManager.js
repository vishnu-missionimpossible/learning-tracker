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
            if (!courseData.startDate) {
                throw new Error('Start date is required');
            }

            console.log('Creating course with data:', courseData);

            const course = {
                userId: userId,
                courseName: courseData.courseName.trim(),
                startDate: courseData.startDate,
                endDate: courseData.endDate || null,
                description: courseData.description || '',
                createdAt: new Date(),
                updatedAt: new Date(),
                isActive: true
            };

            const docRef = await db.collection('courses').add(course);
            console.log('✓ Course created with ID:', docRef.id);

            Utils.showSuccess('✓ Course created successfully!');

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
            const userId = AuthModule.getCurrentUser().uid;
            const snapshot = await db.collection('courses')
                .where('userId', '==', userId)
                .where('isActive', '==', true)
                .orderBy('createdAt', 'desc')
                .get();

            console.log('Fetched', snapshot.docs.length, 'courses');
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
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
                Utils.showSuccess('✓ Course deleted successfully!');

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