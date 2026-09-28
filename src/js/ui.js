/**
 * UI Module
 * Handles rendering of all screens and UI interactions
 */

const UIModule = {
    currentPage: 'auth',
    currentCourseId: null,

    /**
     * Render authentication screen
     */
    renderAuthScreen: () => {
        document.getElementById('app-root').innerHTML = `
            <div class="auth-container">
                <div class="auth-header">
                    <h1>📚 Learning Tracker</h1>
                    <p>Track your learning journey by courses</p>
                </div>

                <div id="authError" class="alert alert-error"></div>

                <div id="signupForm" class="auth-form">
                    <h2>Create Account</h2>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="signupEmail" placeholder="your@email.com">
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" id="signupPassword" placeholder="At least 6 characters">
                    </div>
                    <button class="btn btn-primary" onclick="AppController.signup()">Sign Up</button>
                    <p class="form-footer">
                        Already have account?
                        <a href="#" onclick="UIModule.toggleAuthForms()">Sign In</a>
                    </p>
                </div>

                <div id="loginForm" class="auth-form" style="display: none;">
                    <h2>Sign In</h2>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="loginEmail" placeholder="your@email.com">
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" id="loginPassword" placeholder="Your password">
                    </div>
                    <button class="btn btn-primary" onclick="AppController.signin()">Sign In</button>
                    <p class="form-footer">
                        New user?
                        <a href="#" onclick="UIModule.toggleAuthForms()">Create Account</a>
                    </p>
                </div>
            </div>
        `;
    },

    /**
     * Toggle between sign up and sign in forms
     */
    toggleAuthForms: () => {
        const signupForm = document.getElementById('signupForm');
        const loginForm = document.getElementById('loginForm');
        signupForm.style.display = signupForm.style.display === 'none' ? 'block' : 'none';
        loginForm.style.display = loginForm.style.display === 'none' ? 'block' : 'none';
    },

    /**
     * Render course setup screen (create new course)
     */
    renderCourseSetupScreen: () => {
        document.getElementById('app-root').innerHTML = `
            <div class="main-container">
                <div class="header">
                    <h1>📚 Create New Course</h1>
                    <button class="btn btn-secondary" onclick="AppController.showCourses()">← Back to Courses</button>
                </div>

                <div class="content">
                    <div class="form-section">
                        <h2>Course Details</h2>
                        <div class="form-group">
                            <label>Course Name *</label>
                            <input type="text" id="courseName" placeholder="e.g., Python Development">
                        </div>
                        <div class="form-group">
                            <label>Description</label>
                            <textarea id="courseDescription" placeholder="Brief description of the course" rows="3"></textarea>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Start Date *</label>
                                <input type="text" id="startDate" class="datepicker" placeholder="Select date">
                            </div>
                            <div class="form-group">
                                <label>End Date (Optional)</label>
                                <input type="text" id="endDate" class="datepicker" placeholder="Select date">
                            </div>
                        </div>
                        <button class="btn btn-primary" onclick="AppController.createCourse()">Create Course</button>
                    </div>
                </div>
            </div>
        `;
        UIModule.initializeDatePickers();
    },

    /**
     * Render courses list screen
     * @param {Array} courses - Array of courses
     */
    renderCoursesScreen: async (courses) => {
        const coursesHtml = courses.map(course => `
            <div class="course-card">
                <div class="course-header">
                    <h3>${course.courseName}</h3>
                    <span class="badge">${Utils.calculateDaysElapsed(course.startDate)} days</span>
                </div>
                <p class="course-desc">${course.description || 'No description'}</p>
                <div class="course-dates">
                    <small>Started: ${Utils.formatDate(course.startDate)}</small>
                    ${course.endDate ? `<small>Ends: ${Utils.formatDate(course.endDate)}</small>` : ''}
                </div>
                <div class="course-actions">
                    <button class="btn btn-primary" onclick="AppController.openCourse('${course.id}')">Open Course</button>
                    <button class="btn btn-secondary" onclick="AppController.deleteCourse('${course.id}')">Delete</button>
                </div>
            </div>
        `).join('');

        document.getElementById('app-root').innerHTML = `
            <div class="main-container">
                <div class="header">
                    <div>
                        <h1>📚 My Learning Courses</h1>
                        <span class="user-email">${AuthModule.getCurrentUser().email}</span>
                    </div>
                    <div class="header-actions">
                        <button class="btn btn-primary" onclick="AppController.showCourseSetup()">+ New Course</button>
                        <button class="btn btn-secondary" onclick="AppController.logout()">Logout</button>
                    </div>
                </div>

                <div class="content">
                    ${courses.length === 0 ? `
                        <div class="empty-state">
                            <p>No courses yet. Create your first course to start tracking!</p>
                            <button class="btn btn-primary" onclick="AppController.showCourseSetup()">Create First Course</button>
                        </div>
                    ` : `
                        <div class="courses-grid">
                            ${coursesHtml}
                        </div>
                    `}
                </div>
            </div>
        `;
    },

    /**
     * Render dashboard (metrics) screen
     * @param {Object} course - Course object
     * @param {Array} metrics - Array of metrics
     * @param {Object} stats - Statistics object
     */
    renderDashboardScreen: (course, metrics, stats) => {
        const metricsHtml = metrics.map(metric => `
            <tr>
                <td>${Utils.formatDate(metric.date)}</td>
                <td><span class="badge badge-${metric.status.toLowerCase()}">${metric.status}</span></td>
                <td>${metric.duration} min</td>
                <td>${metric.topic}</td>
                <td>${metric.notes}</td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="AppController.deleteMetric('${metric.id}')">Delete</button>
                </td>
            </tr>
        `).join('');

        document.getElementById('app-root').innerHTML = `
            <div class="main-container">
                <div class="header">
                    <div>
                        <h1>${course.courseName}</h1>
                        <small>Started: ${Utils.formatDate(course.startDate)}</small>
                    </div>
                    <div class="header-actions">
                        <button class="btn btn-secondary" onclick="AppController.showCourses()">← Back to Courses</button>
                        <button class="btn btn-secondary" onclick="AppController.logout()">Logout</button>
                    </div>
                </div>

                <div class="content">
                    <!-- Statistics Cards -->
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-value">${stats.consistency}%</div>
                            <div class="stat-label">Consistency</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${stats.completed}</div>
                            <div class="stat-label">Completed Days</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${stats.totalDays}</div>
                            <div class="stat-label">Total Days</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${stats.totalMinutes}</div>
                            <div class="stat-label">Total Minutes</div>
                        </div>
                    </div>

                    <!-- Add Metric Form -->
                    <div class="form-section">
                        <h2>Log Learning Activity</h2>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Date *</label>
                                <input type="text" id="metricDate" class="datepicker" placeholder="Select date">
                            </div>
                            <div class="form-group">
                                <label>Status *</label>
                                <select id="metricStatus">
                                    <option value="">Select status</option>
                                    <option value="Done">Done</option>
                                    <option value="Missed">Missed</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Duration (minutes)</label>
                                <input type="number" id="metricDuration" placeholder="0" min="0">
                            </div>
                            <div class="form-group">
                                <label>Topic</label>
                                <input type="text" id="metricTopic" placeholder="e.g., Functions & Loops">
                            </div>
                        </div>
                        <div class="form-group full">
                            <label>Notes</label>
                            <textarea id="metricNotes" placeholder="Add any notes" rows="2"></textarea>
                        </div>
                        <button class="btn btn-primary" onclick="AppController.addMetric('${course.id}')">Add Entry</button>
                    </div>

                    <!-- Metrics Table -->
                    <div class="form-section">
                        <h2>Learning History</h2>
                        ${metrics.length === 0 ? `
                            <p style="text-align: center; color: #999;">No entries yet. Start logging your learning!</p>
                        ` : `
                            <table class="metrics-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Status</th>
                                        <th>Duration</th>
                                        <th>Topic</th>
                                        <th>Notes</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${metricsHtml}
                                </tbody>
                            </table>
                        `}
                    </div>
                </div>
            </div>
        `;
        UIModule.initializeDatePickers();
    },

    /**
     * Initialize date pickers
     */
    initializeDatePickers: () => {
        const dateInputs = document.querySelectorAll('.datepicker');
        dateInputs.forEach(input => {
            if (!input._flatpickr) {
                flatpickr(input, {
                    mode: 'single',
                    dateFormat: 'Y-m-d',
                    minDate: '2020-01-01',
                    maxDate: '2030-12-31'
                });
            }
        });
    }
};

console.log('✓ UI module loaded');