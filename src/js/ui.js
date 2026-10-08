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
                    <h1><span class="wiggle">📚</span> Learning Tracker</h1>
                    <p>${Fun.pick(Fun.taglines)}</p>
                </div>

                <div id="authError" class="alert alert-error"></div>

                <div id="signupForm" class="auth-form">
                    <h2>Join the Brain Gym 🏋️</h2>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="signupEmail" placeholder="your@email.com">
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" id="signupPassword" placeholder="At least 6 characters">
                    </div>
                    <button class="btn btn-primary" onclick="AppController.signup()">Let's Go! 🚀</button>
                    <p class="form-footer">
                        Already part of the squad?
                        <a href="#" onclick="UIModule.toggleAuthForms()">Sign In</a>
                    </p>
                </div>

                <div id="loginForm" class="auth-form" style="display: none;">
                    <h2>Welcome back, legend 🦸</h2>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="loginEmail" placeholder="your@email.com">
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" id="loginPassword" placeholder="Your password">
                    </div>
                    <button class="btn btn-primary" onclick="AppController.signin()">Back to Learning 🎓</button>
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
                    <h1>🗺️ Start a New Adventure</h1>
                    <button class="btn btn-secondary" onclick="AppController.showCourses()">← Back to Courses</button>
                </div>

                <div class="content">
                    <div class="form-section">
                        <h2>What are we conquering? 🏔️</h2>
                        <div class="form-group">
                            <label>Course Name *</label>
                            <input type="text" id="courseName" placeholder="e.g., Python (snakes not included) 🐍">
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
                        <button class="btn btn-primary" onclick="AppController.createCourse()">Unlock Course 🔓</button>
                    </div>
                </div>
            </div>
        `;
        UIModule.initializeDatePickers();
    },

    /**
     * Render courses list screen
     * @param {Array} courses - Array of courses
     * @param {Array} invitations - Courses I have been invited to
     */
    renderCoursesScreen: async (courses, invitations = []) => {
        const me = AuthModule.getCurrentUser();
        const esc = Utils.esc;

        const invitesHtml = invitations.map(c => `
            <div class="invite-card">
                <div>
                    <strong>👯 ${esc(c.memberEmails && c.memberEmails[c.userId] || 'A friend')}</strong>
                    invited you to learn <strong>${esc(c.courseName)}</strong> together!
                </div>
                <div class="invite-actions">
                    <button class="btn btn-primary btn-sm" onclick="AppController.acceptInvite('${c.id}')">Join the squad 🎉</button>
                    <button class="btn btn-secondary btn-sm" onclick="AppController.declineInvite('${c.id}')">Maybe later</button>
                </div>
            </div>
        `).join('');

        const coursesHtml = courses.map(course => {
            const members = (course.memberIds || []).length;
            const isOwner = course.userId === me.uid;
            return `
            <div class="course-card">
                <div class="course-header">
                    <h3>${esc(course.courseName)}</h3>
                    <span class="badge">🔥 ${Utils.calculateDaysElapsed(course.startDate)} days in</span>
                </div>
                <div class="tag-row">
                    ${members > 1 ? `<span class="tag tag-shared">👯 ${members} learners</span>` : ''}
                    ${!isOwner ? '<span class="tag">Shared with you</span>' : ''}
                </div>
                <p class="course-desc">${esc(course.description) || 'No description'}</p>
                <div class="course-dates">
                    <small>Started: ${Utils.formatDate(course.startDate)}</small>
                    ${course.endDate ? `<small>Ends: ${Utils.formatDate(course.endDate)}</small>` : ''}
                </div>
                <div class="course-actions">
                    <button class="btn btn-primary" onclick="AppController.openCourse('${course.id}')">Continue Quest ⚔️</button>
                    ${isOwner ? `<button class="btn btn-secondary" onclick="AppController.deleteCourse('${course.id}')">Delete</button>` : ''}
                </div>
            </div>`;
        }).join('');

        const reminder = SettingsModule.reminderTime();

        document.getElementById('app-root').innerHTML = `
            <div class="main-container">
                <div class="header">
                    <div>
                        <h1>🎒 My Learning Adventures</h1>
                        <span class="user-email">${Fun.pick(Fun.greetings)} &middot; ${esc(me.email)}</span>
                    </div>
                    <div class="header-actions">
                        <button class="btn btn-primary" onclick="AppController.showCourseSetup()">+ New Adventure ✨</button>
                        <button class="btn btn-secondary" id="installBtn" style="display:none" onclick="AppController.installApp()">📲 Install</button>
                        <button class="btn btn-secondary" onclick="AppController.logout()">Logout</button>
                    </div>
                </div>

                <div class="content">
                    <div class="quote-banner">💡 ${esc(Fun.dailyQuote())}</div>

                    ${invitations.length ? `<div class="invites"><h2>📬 You have invitations!</h2>${invitesHtml}</div>` : ''}

                    ${courses.length === 0 ? `
                        <div class="empty-state">
                            <div class="empty-emoji">🦉</div>
                            <p>It's quiet in here... too quiet. Start your first course and let the learning begin!</p>
                            <button class="btn btn-primary" onclick="AppController.showCourseSetup()">Create First Course 🚀</button>
                        </div>
                    ` : `
                        <div class="courses-grid">
                            ${coursesHtml}
                        </div>
                    `}

                    <div class="settings-strip">
                        <label for="reminderTime">⏰ Daily reminder</label>
                        <input type="time" id="reminderTime" value="${reminder}">
                        <button class="btn btn-secondary btn-sm" onclick="AppController.saveReminder()">Save</button>
                        <small>Reminds you while the app is open or installed. Clear the time to turn it off.</small>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Render dashboard (metrics) screen
     * @param {Object} course - Course object
     * @param {Array} allMetrics - Every member's entries for this course
     * @param {Object} stats - My statistics
     */
    renderDashboardScreen: (course, allMetrics, stats) => {
        const me = AuthModule.getCurrentUser();
        const esc = Utils.esc;
        const isOwner = course.userId === me.uid;
        const memberIds = course.memberIds && course.memberIds.length ? course.memberIds : [course.userId];
        const shared = memberIds.length > 1;
        const emailOf = (uid) => (course.memberEmails && course.memberEmails[uid]) || (uid === course.userId ? 'Course owner' : 'Member');
        const myMetrics = allMetrics.filter(m => m.userId === me.uid);
        const sortedAll = [...allMetrics].sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));

        UIModule.allMetrics = allMetrics;
        UIModule.myMetrics = myMetrics;
        UIModule.currentCourse = course;
        UIModule.editingMetricId = null;

        const streak = Analytics.streaks(myMetrics);
        const mood = Fun.mood(stats.consistency, stats.totalEntries);
        const badges = Analytics.badges(myMetrics);
        const earned = badges.filter(b => b.earned).length;
        const goal = SettingsModule.getGoal(course.id);
        const todayMin = Analytics.minutesOn(myMetrics, Analytics.today());
        const pct = goal ? Math.min(100, Math.round(todayMin / goal * 100)) : 0;
        const R = 42, C = 2 * Math.PI * R;
        const loggedToday = Analytics.hasLoggedToday(myMetrics);

        const heat = Analytics.heatmap(myMetrics, 18);
        const heatHtml = heat.map(col => `<div class="heat-col">${col.map(c =>
            `<div class="heat-cell heat-${c.state}" title="${c.date}${c.state === 'done' ? ' - Done 🎉' : c.state === 'missed' ? ' - Missed' : ''}"></div>`
        ).join('')}</div>`).join('');

        // Leaderboard
        let leaderboardHtml = '';
        if (shared) {
            const rows = Analytics.leaderboard(course, allMetrics);
            const medals = ['🥇', '🥈', '🥉'];
            leaderboardHtml = `
                <div class="form-section">
                    <h2>🏆 Friendly Leaderboard</h2>
                    <table class="metrics-table leaderboard">
                        <thead><tr><th>#</th><th>Learner</th><th>Consistency</th><th>Streak</th><th>Wins</th><th>Minutes</th><th></th></tr></thead>
                        <tbody>
                            ${rows.map((r, i) => `
                                <tr class="${r.uid === me.uid ? 'row-me' : ''}">
                                    <td>${medals[i] || (i + 1)}</td>
                                    <td>${esc(r.email)}${r.uid === me.uid ? ' (you)' : ''}</td>
                                    <td><strong>${r.consistency}%</strong></td>
                                    <td>🔥 ${r.streak}</td>
                                    <td>${r.wins}</td>
                                    <td>${r.minutes}</td>
                                    <td>${r.uid !== me.uid && !r.loggedToday && r.email.includes('@') ?
                                        `<a class="btn btn-sm btn-secondary" href="mailto:${esc(r.email)}?subject=${encodeURIComponent('Learning nudge 👋')}&body=${encodeURIComponent(Fun.pick(Fun.nudges) + '\n\n' + location.href.split('#')[0])}">Nudge 👋</a>` :
                                        (r.loggedToday ? '<span title="Logged today">✅</span>' : '')}</td>
                                </tr>`).join('')}
                        </tbody>
                    </table>
                </div>`;
        }

        // Share panel
        const pending = course.invitedEmails || [];
        const shareHtml = `
            <div class="form-section">
                <h2>👯 Learn Together</h2>
                <p class="muted">${shared ? 'Learners: ' + memberIds.map(u => esc(emailOf(u))).join(', ') : 'Invite a friend (anywhere in the world!) to track this course with you. They just need an account with the same email.'}</p>
                ${isOwner ? `
                    <div class="share-row">
                        <input type="email" id="inviteEmail" placeholder="friend@email.com">
                        <button class="btn btn-primary" onclick="AppController.invite('${course.id}')">Send Invite ✉️</button>
                    </div>` : ''}
                ${pending.length ? `<div class="pending">Waiting for: ${pending.map(e => `<span class="tag">${esc(e)}${isOwner ? ` <a href="#" onclick="AppController.revokeInvite('${course.id}', '${esc(e)}'); return false;" title="Cancel invite">✕</a>` : ''}</span>`).join(' ')}</div>` : ''}
            </div>`;

        const historyRows = sortedAll.map(metric => {
            const mine = metric.userId === me.uid;
            return `
            <tr>
                <td>${Utils.formatDate(metric.date)}</td>
                ${shared ? `<td>${esc(emailOf(metric.userId))}${mine ? ' (you)' : ''}</td>` : ''}
                <td><span class="badge badge-${esc(metric.status.toLowerCase())}">${esc(metric.status)}</span></td>
                <td>${Number(metric.duration) || 0} min</td>
                <td>${esc(metric.topic)}</td>
                <td>${esc(metric.notes)}</td>
                <td class="actions-cell">
                    ${mine ? `
                        <button class="btn btn-sm btn-secondary" onclick="AppController.editMetric('${metric.id}')">Edit</button>
                        <button class="btn btn-sm btn-secondary" onclick="AppController.deleteMetric('${metric.id}')">Delete</button>` : ''}
                </td>
            </tr>`;
        }).join('');

        document.getElementById('app-root').innerHTML = `
            <div class="main-container">
                <div class="header">
                    <div>
                        <h1>${esc(course.courseName)}</h1>
                        <small>Started: ${Utils.formatDate(course.startDate)}${shared ? ' &middot; 👯 ' + memberIds.length + ' learners' : ''}</small>
                    </div>
                    <div class="header-actions">
                        <button class="btn btn-secondary" onclick="AppController.showCourses()">← Back to Courses</button>
                        <button class="btn btn-secondary" onclick="AppController.logout()">Logout</button>
                    </div>
                </div>

                <div class="content">
                    <div class="mood-banner"><span class="mood-emoji">${mood.emoji}</span> ${mood.text}</div>
                    ${!loggedToday ? '<div class="today-banner">📅 Nothing logged for today yet - even 10 minutes counts!</div>' : ''}

                    <div class="stats-grid">
                        <div class="stat-card"><div class="stat-value">${stats.consistency}%</div><div class="stat-label">Consistency 🔥</div></div>
                        <div class="stat-card"><div class="stat-value">${streak.current}</div><div class="stat-label">Day Streak 🔥 (best ${streak.best})</div></div>
                        <div class="stat-card"><div class="stat-value">${stats.completed}</div><div class="stat-label">Wins 🏆</div></div>
                        <div class="stat-card"><div class="stat-value">${stats.totalDays}</div><div class="stat-label">Days on the Journey 🗓️</div></div>
                        <div class="stat-card"><div class="stat-value">${stats.totalMinutes}</div><div class="stat-label">Minutes of Brain Gains ⏱️</div></div>
                    </div>

                    ${leaderboardHtml}

                    <div class="two-col">
                        <div class="form-section goal-card">
                            <h2>🎯 Today's Goal</h2>
                            <div class="goal-body">
                                <svg viewBox="0 0 100 100" class="ring" role="img" aria-label="${pct}% of daily goal">
                                    <circle cx="50" cy="50" r="${R}" class="ring-bg"></circle>
                                    <circle cx="50" cy="50" r="${R}" class="ring-fg" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct / 100)}" transform="rotate(-90 50 50)"></circle>
                                    <text x="50" y="55" text-anchor="middle" class="ring-text">${goal ? pct + '%' : '--'}</text>
                                </svg>
                                <div>
                                    <p><strong>${todayMin}</strong> ${goal ? '/ ' + goal : ''} min today</p>
                                    <div class="goal-set">
                                        <input type="number" id="goalMinutes" min="0" placeholder="Minutes/day" value="${goal || ''}">
                                        <button class="btn btn-secondary btn-sm" onclick="AppController.saveGoal('${course.id}')">Set goal</button>
                                    </div>
                                    ${goal && pct >= 100 ? '<p class="goal-done">Goal smashed! 🎉</p>' : ''}
                                </div>
                            </div>
                        </div>

                        <div class="form-section">
                            <h2>🏅 Badges <small>(${earned}/${badges.length})</small></h2>
                            <div class="badges">
                                ${badges.map(b => `
                                    <div class="badge-item ${b.earned ? 'earned' : 'locked'}" title="${esc(b.desc)}">
                                        <div class="badge-emoji">${b.earned ? b.emoji : '🔒'}</div>
                                        <div class="badge-name">${esc(b.name)}</div>
                                    </div>`).join('')}
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h2>🗓️ Your Learning Heatmap</h2>
                        <div class="heatmap">${heatHtml}</div>
                        <div class="heat-legend"><span class="heat-cell heat-none"></span> none <span class="heat-cell heat-missed"></span> missed <span class="heat-cell heat-done"></span> done</div>
                    </div>

                    <div class="two-col">
                        <div class="form-section">
                            <h2>📈 Consistency Trend</h2>
                            <div class="chart-box"><canvas id="trendChart"></canvas></div>
                        </div>
                        <div class="form-section">
                            <h2>⏱️ Minutes per Week</h2>
                            <div class="chart-box"><canvas id="weeklyChart"></canvas></div>
                        </div>
                    </div>

                    ${shareHtml}

                    <div class="form-section" id="logForm">
                        <h2 id="formTitle">What did your brain do today? 🧠</h2>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Date *</label>
                                <input type="text" id="metricDate" class="datepicker" placeholder="Select date">
                            </div>
                            <div class="form-group">
                                <label>Status *</label>
                                <select id="metricStatus">
                                    <option value="">Select status</option>
                                    <option value="Done">Done 🎉</option>
                                    <option value="Missed">Missed (we forgive you) 🫶</option>
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
                                <input type="text" id="metricTopic" placeholder="e.g., Loops (the good kind of going in circles) 🔁">
                            </div>
                        </div>
                        <div class="form-group full">
                            <label>Notes</label>
                            <textarea id="metricNotes" placeholder="Add any notes" rows="2"></textarea>
                        </div>
                        <button class="btn btn-primary" id="submitMetric" onclick="AppController.addMetric('${course.id}')">Log It! ✅</button>
                        <button class="btn btn-secondary" id="cancelEdit" style="display:none" onclick="AppController.cancelEdit()">Cancel</button>
                    </div>

                    <div class="form-section">
                        <div class="section-head">
                            <h2>Your Hall of Fame 🏛️</h2>
                            ${allMetrics.length ? '<button class="btn btn-secondary btn-sm" onclick="AppController.exportCSV()">📥 Export CSV</button>' : ''}
                        </div>
                        ${allMetrics.length === 0 ? `
                            <p style="text-align: center; color: #999;">Nothing here yet. Your legendary streak starts with one entry! 🌟</p>
                        ` : `
                            <div class="table-scroll">
                            <table class="metrics-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        ${shared ? '<th>Who</th>' : ''}
                                        <th>Status</th>
                                        <th>Duration</th>
                                        <th>Topic</th>
                                        <th>Notes</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>${historyRows}</tbody>
                            </table>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `;
        UIModule.initializeDatePickers();
        UIModule.renderCharts(myMetrics, course);
    },

    /**
     * Render Chart.js charts (skipped gracefully if the library failed to load)
     */
    renderCharts: (myMetrics, course) => {
        if (typeof Chart === 'undefined') return;
        const css = getComputedStyle(document.body);
        const line = css.getPropertyValue('--chart-line').trim() || '#667eea';
        const grid = css.getPropertyValue('--chart-grid').trim() || 'rgba(0,0,0,0.08)';
        const text = css.getPropertyValue('--chart-text').trim() || '#555';

        const scaleBase = {
            ticks: { color: text },
            grid: { color: grid },
            border: { display: false }
        };

        const trend = Analytics.consistencyTrend(myMetrics, course.startDate, 10);
        const trendEl = document.getElementById('trendChart');
        if (trendEl) {
            new Chart(trendEl, {
                type: 'line',
                data: {
                    labels: trend.map(t => t.label),
                    datasets: [{
                        label: 'Consistency %',
                        data: trend.map(t => t.value),
                        borderColor: line,
                        backgroundColor: line + '33',
                        fill: true,
                        tension: 0.3,
                        borderWidth: 2,
                        pointRadius: 4,
                        pointBackgroundColor: line
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { ...scaleBase, min: 0, max: 100, ticks: { color: text, callback: v => v + '%' } },
                        x: { ...scaleBase, grid: { display: false } }
                    }
                }
            });
        }

        const weekly = Analytics.weeklyMinutes(myMetrics, 8);
        const weeklyEl = document.getElementById('weeklyChart');
        if (weeklyEl) {
            new Chart(weeklyEl, {
                type: 'bar',
                data: {
                    labels: weekly.map(w => w.label),
                    datasets: [{
                        label: 'Minutes',
                        data: weekly.map(w => w.minutes),
                        backgroundColor: line,
                        borderRadius: 4,
                        maxBarThickness: 28
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { ...scaleBase, beginAtZero: true },
                        x: { ...scaleBase, grid: { display: false } }
                    }
                }
            });
        }
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
                    maxDate: '2030-12-31',
                    defaultDate: input.id === 'metricDate' ? 'today' : null
                });
            }
        });
    }
};

console.log('✓ UI module loaded');