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

        SettingsModule.initTheme();
        AppController.mountThemeToggle();
        AppController.setupPWA();

        // Initialize auth and listen for state changes
        AuthModule.init(async (user) => {
            if (user) {
                console.log('✓ User authenticated:', user.email);
                await SettingsModule.loadGoals();
                SettingsModule.startReminderLoop();
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
            UIModule.currentCourseId = null;
            const [courses, invitations] = await Promise.all([
                CourseManager.getCourses(),
                ShareManager.getInvitations()
            ]);
            // Don't show an invitation for a course I already belong to
            const mine = new Set(courses.map(c => c.id));
            UIModule.renderCoursesScreen(courses, invitations.filter(c => !mine.has(c.id)));
            AppController.refreshInstallButton();
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
            const stats = await MetricsManager.getCourseStats(courseId, course.startDate, metrics);

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
     * Add (or save edits to) a metric entry
     * @param {string} courseId - Course ID
     */
    addMetric: async (courseId) => {
        const date = document.getElementById('metricDate').value;
        const status = document.getElementById('metricStatus').value;
        const duration = parseInt(document.getElementById('metricDuration').value) || 0;
        const topic = document.getElementById('metricTopic').value;
        const notes = document.getElementById('metricNotes').value;

        // Edit mode: save changes to an existing entry
        if (UIModule.editingMetricId) {
            if (!date || !status) {
                Utils.showError('Date and status are required');
                return;
            }
            try {
                await MetricsManager.updateMetric(UIModule.editingMetricId, { date, status, duration, topic, notes });
                UIModule.editingMetricId = null;
                AppController.openCourse(courseId);
            } catch (error) {
                console.error('Error updating metric:', error);
            }
            return;
        }

        const before = new Set(Analytics.badges(UIModule.myMetrics || []).filter(b => b.earned).map(b => b.id));

        try {
            const created = await MetricsManager.addMetric({
                courseId,
                date,
                status,
                duration,
                topic,
                notes
            });
            if (!created) return;

            // Badge unlock check
            const after = Analytics.badges([...(UIModule.myMetrics || []), created]).filter(b => b.earned);
            const fresh = after.filter(b => !before.has(b.id));
            if (fresh.length) {
                setTimeout(() => {
                    Utils.showSuccess('🏅 Badge unlocked: ' + fresh.map(b => b.emoji + ' ' + b.name).join(', '));
                    Fun.confetti();
                }, 1200);
            }

            // Clear form and refresh dashboard
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
     * Load an entry into the form for editing
     */
    editMetric: (metricId) => {
        const metric = (UIModule.allMetrics || []).find(m => m.id === metricId);
        if (!metric || metric.userId !== AuthModule.getCurrentUser().uid) return;
        UIModule.editingMetricId = metricId;
        const dateInput = document.getElementById('metricDate');
        if (dateInput._flatpickr) dateInput._flatpickr.setDate(metric.date, false);
        else dateInput.value = metric.date;
        document.getElementById('metricStatus').value = metric.status;
        document.getElementById('metricDuration').value = metric.duration || '';
        document.getElementById('metricTopic').value = metric.topic || '';
        document.getElementById('metricNotes').value = metric.notes || '';
        document.getElementById('formTitle').textContent = 'Editing entry ✏️';
        document.getElementById('submitMetric').textContent = 'Save Changes 💾';
        document.getElementById('cancelEdit').style.display = 'inline-block';
        document.getElementById('logForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
    },

    cancelEdit: () => {
        if (UIModule.currentCourseId) AppController.openCourse(UIModule.currentCourseId);
    },

    // ---------- Sharing ----------
    invite: async (courseId) => {
        const input = document.getElementById('inviteEmail');
        const ok = await ShareManager.invite(courseId, input.value);
        if (ok) AppController.openCourse(courseId);
    },

    revokeInvite: async (courseId, email) => {
        if (await ShareManager.revoke(courseId, email)) AppController.openCourse(courseId);
    },

    acceptInvite: async (courseId) => {
        if (await ShareManager.accept(courseId)) AppController.openCourse(courseId);
    },

    declineInvite: async (courseId) => {
        if (await ShareManager.decline(courseId)) AppController.showCourses();
    },

    // ---------- Goals, reminders, export ----------
    saveGoal: async (courseId) => {
        const minutes = document.getElementById('goalMinutes').value;
        if (await SettingsModule.setGoal(courseId, minutes)) {
            Utils.showSuccess(Fun.msg('goal'));
            AppController.openCourse(courseId);
        }
    },

    saveReminder: () => {
        SettingsModule.setReminderTime(document.getElementById('reminderTime').value);
    },

    exportCSV: () => {
        const course = UIModule.currentCourse;
        if (!course) return;
        const emailOf = (uid) => (course.memberEmails && course.memberEmails[uid]) || (uid === course.userId ? 'Course owner' : 'Member');
        const sorted = [...UIModule.allMetrics].sort((a, b) => (a.date > b.date ? 1 : -1));
        const name = course.courseName.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'course';
        Analytics.downloadCSV('learning-' + name + '.csv', Analytics.toCSV(course, sorted, emailOf));
        Utils.showSuccess(Fun.msg('csv'));
    },

    // ---------- Theme toggle + PWA ----------
    mountThemeToggle: () => {
        if (document.getElementById('themeToggle')) return;
        const btn = document.createElement('button');
        btn.id = 'themeToggle';
        btn.className = 'theme-toggle';
        btn.title = 'Toggle dark mode';
        btn.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
        btn.onclick = SettingsModule.toggleTheme;
        document.body.appendChild(btn);
    },

    deferredInstall: null,

    setupPWA: () => {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            AppController.deferredInstall = e;
            AppController.refreshInstallButton();
        });
        window.addEventListener('appinstalled', () => {
            AppController.deferredInstall = null;
            AppController.refreshInstallButton();
        });
        if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
            navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW registration failed:', err));
        }
    },

    refreshInstallButton: () => {
        const btn = document.getElementById('installBtn');
        if (btn) btn.style.display = AppController.deferredInstall ? 'inline-block' : 'none';
    },

    installApp: async () => {
        const evt = AppController.deferredInstall;
        if (!evt) return;
        evt.prompt();
        await evt.userChoice;
        AppController.deferredInstall = null;
        AppController.refreshInstallButton();
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