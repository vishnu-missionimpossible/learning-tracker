/**
 * Main Application Controller
 * Orchestrates all modules and handles routing
 */

const AppController = {
    /**
     * Initialize application
     */
    init: () => {
        console.log('🚀 Initializing Learning Tracker App');

        // Initialize auth and listen for state changes
        AuthModule.init((user) => {
            if (user) {
                console.log('✓ User authenticated:', user.email);
                AppController.showCourses();
            } else {
                console.log('✗ User not authenticated');
                UIModule.renderAuthScreen();
            }
        });
    },

    /**
     * Sign up new user
     */
    signup: async () => {
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;

        try {
            await AuthModule.signup(email, password);
            document.getElementById('signupEmail').value = '';
            document.getElementById('signupPassword').value = '';
        } catch (error) {
            console.error('Signup error:', error);
        }
    },

    /**
     * Sign in existing user
     */
    signin: async () => {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            await AuthModule.signin(email, password);
            document.getElementById('loginEmail').value = '';
            document.getElementById('loginPassword').value = '';
        } catch (error) {
            console.error('Signin error:', error);
        }
    },

    /**
     * Log out user
     */
    logout: async () => {
        await AuthModule.logout();
    },

    /**
     * Show courses list screen
     */
    showCourses: async () => {
        try {
            const courses = await CourseManager.getCourses();
            UIModule.renderCoursesScreen(courses);
        } catch (error) {
            console.error('Error loading courses:', error);
            Utils.showError('Error loading courses');
        }
    },

    /**
     * Show course creation screen
     */
    showCourseSetup: () => {
        UIModule.renderCourseSetupScreen();
    },

    /**
     * Create new course
     */
    createCourse: async () => {
        const courseName = document.getElementById('courseName').value;
        const description = document.getElementById('courseDescription').value;
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;

        try {
            await CourseManager.createCourse({
                courseName,
                description,
                startDate,
                endDate
            });

            // Reset form and go back to courses
            setTimeout(() => {
                AppController.showCourses();
            }, 500);
        } catch (error) {
            console.error('Error creating course:', error);
        }
    },

    /**
     * Open course dashboard
     * @param {string} courseId - Course ID
     */
    openCourse: async (courseId) => {
        try {
            const course = await CourseManager.getCourse(courseId);
            const metrics = await MetricsManager.getCourseMetrics(courseId);
            const stats = await MetricsManager.getCourseStats(courseId, course.startDate);

            UIModule.currentCourseId = courseId;
            UIModule.renderDashboardScreen(course, metrics, stats);
        } catch (error) {
            console.error('Error opening course:', error);
            Utils.showError('Error loading course');
        }
    },

    /**
     * Delete course
     * @param {string} courseId - Course ID
     */
    deleteCourse: async (courseId) => {
        try {
            await CourseManager.deleteCourse(courseId);
            setTimeout(() => {
                AppController.showCourses();
            }, 500);
        } catch (error) {
            console.error('Error deleting course:', error);
        }
    },

    /**
     * Add metric entry
     * @param {string} courseId - Course ID
     */
    addMetric: async (courseId) => {
        const date = document.getElementById('metricDate').value;
        const status = document.getElementById('metricStatus').value;
        const duration = parseInt(document.getElementById('metricDuration').value) || 0;
        const topic = document.getElementById('metricTopic').value;
        const notes = document.getElementById('metricNotes').value;

        try {
            await MetricsManager.addMetric({
                courseId,
                date,
                status,
                duration,
                topic,
                notes
            });

            // Clear form and refresh dashboard
            document.getElementById('metricDate').value = '';
            document.getElementById('metricStatus').value = '';
            document.getElementById('metricDuration').value = '';
            document.getElementById('metricTopic').value = '';
            document.getElementById('metricNotes').value = '';

            setTimeout(() => {
                AppController.openCourse(courseId);
            }, 500);
        } catch (error) {
            console.error('Error adding metric:', error);
        }
    },

    /**
     * Delete metric
     * @param {string} metricId - Metric ID
     */
    deleteMetric: async (metricId) => {
        try {
            await MetricsManager.deleteMetric(metricId);
            setTimeout(() => {
                AppController.openCourse(UIModule.currentCourseId);
            }, 500);
        } catch (error) {
            console.error('Error deleting metric:', error);
        }
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', AppController.init);

console.log('✓ App controller loaded');