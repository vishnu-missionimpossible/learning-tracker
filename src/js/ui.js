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
                        <input type="email" id="signupEmail" placeholder="your@email.com" autocomplete="email" maxlength="254">
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" id="signupPassword" placeholder="8+ characters, letters and numbers" autocomplete="new-password" maxlength="128" oninput="UIModule.checkPasswordMatch()">
                    </div>
                    <div class="form-group">
                        <label>Confirm Password</label>
                        <input type="password" id="signupConfirm" placeholder="Type it again" autocomplete="new-password" maxlength="128" oninput="UIModule.checkPasswordMatch()" onkeydown="if(event.key==='Enter'){AppController.signup()}">
                        <small id="pwMatchHint" class="pw-hint"></small>
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
                        <input type="email" id="loginEmail" placeholder="your@email.com" autocomplete="email" maxlength="254">
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" id="loginPassword" placeholder="Your password" autocomplete="current-password" maxlength="128" onkeydown="if(event.key==='Enter'){AppController.signin()}">
                    </div>
                    <button class="btn btn-primary" onclick="AppController.signin()">Back to Learning 🎓</button>
                    <p class="form-footer">
                        <a href="#" onclick="UIModule.showResetForm(); return false;">Forgot password? 🤔</a>
                    </p>
                    <p class="form-footer">
                        New user?
                        <a href="#" onclick="UIModule.toggleAuthForms()">Create Account</a>
                    </p>
                </div>

                <div id="resetForm" class="auth-form" style="display: none;">
                    <h2>Reset your password 🔑</h2>
                    <p class="muted">Enter your email and we'll send you a link to choose a new password.</p>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="resetEmail" placeholder="your@email.com" autocomplete="email" maxlength="254">
                    </div>
                    <button class="btn btn-primary" onclick="AppController.resetPassword()">Send Reset Link 📬</button>
                    <p class="form-footer">
                        <a href="#" onclick="UIModule.showLoginForm(); return false;">← Back to Sign In</a>
                    </p>
                </div>

                <p class="form-footer install-link-wrap">
                    <a href="#" id="installBtn" style="display:none" onclick="AppController.installApp(); return false;">📲 Install this app</a>
                </p>
            </div>
        `;
        AppController.refreshInstallButton();
    },

    /** Live hint under the confirm-password box */
    checkPasswordMatch: () => {
        const pw = document.getElementById('signupPassword').value;
        const confirm = document.getElementById('signupConfirm').value;
        const hint = document.getElementById('pwMatchHint');
        if (!hint) return;
        const issue = pw ? Utils.passwordIssue(pw) : '';
        if (issue) {
            hint.textContent = '⚠️ ' + issue;
            hint.className = 'pw-hint bad';
        } else if (confirm) {
            const ok = pw === confirm;
            hint.textContent = ok ? '✅ Passwords match' : '❌ Passwords do not match';
            hint.className = 'pw-hint ' + (ok ? 'good' : 'bad');
        } else {
            hint.textContent = '';
        }
    },

    showResetForm: () => {
        document.getElementById('signupForm').style.display = 'none';
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('resetForm').style.display = 'block';
        const login = document.getElementById('loginEmail');
        if (login && login.value) document.getElementById('resetEmail').value = login.value;
    },

    showLoginForm: () => {
        document.getElementById('signupForm').style.display = 'none';
        document.getElementById('resetForm').style.display = 'none';
        document.getElementById('loginForm').style.display = 'block';
    },

    /**
     * Toggle between sign up and sign in forms
     */
    toggleAuthForms: () => {
        const signupForm = document.getElementById('signupForm');
        const loginForm = document.getElementById('loginForm');
        document.getElementById('resetForm').style.display = 'none';
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
                            <input type="text" id="courseName" maxlength="100" placeholder="e.g., Python (snakes not included) 🐍">
                        </div>
                        <div class="form-group">
                            <label>Description</label>
                            <textarea id="courseDescription" maxlength="500" placeholder="Brief description of the course" rows="3"></textarea>
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
     * Friendly label for a member: profile name (+avatar), else email, else a placeholder
     */
    nameOf: (course, uid) => {
        const p = ProfileManager.get(uid);
        if (p && p.displayName) return (p.avatar || '🙂') + ' ' + p.displayName;
        const email = course.memberEmails && course.memberEmails[uid];
        if (email) return email;
        return uid === course.userId ? 'Course owner' : 'Former member';
    },

    activeTab: 'progress',
    denied: {},
    resources: [],
    flashcards: [],
    reflections: [],
    openThreads: {},
    fc: null,
    editingResourceId: null,
    filters: { q: '', status: '', member: '', topic: '', from: '', to: '' },
    charts: [],

    switchTab: (tab) => {
        UIModule.activeTab = tab;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + tab));
        UIModule.charts.forEach(c => c.resize());
    },

    /** Challenge card */
    challengeHtml: (course, allMetrics, isOwner) => {
        const esc = Utils.esc;
        const prog = Analytics.challengeProgress(course, allMetrics);
        if (!prog) {
            return `
                <div class="form-section">
                    <h2>🏁 Challenge</h2>
                    <p class="muted">Set a goal for the whole squad (or just yourself): log a number of Done days within a time window.</p>
                    ${isOwner ? `
                        <div class="challenge-form">
                            <input type="text" id="chTitle" placeholder="e.g., Study sprint" maxlength="80">
                            <input type="number" id="chTarget" min="1" max="365" placeholder="Done days" value="5">
                            <input type="number" id="chDays" min="1" max="365" placeholder="Within days" value="7">
                            <button class="btn btn-primary" onclick="AppController.startChallenge(${Utils.js(course.id)})">Start Challenge 🏁</button>
                        </div>` : '<p class="muted">The course owner can start a challenge.</p>'}
                </div>`;
        }
        const ch = {
            title: prog.ch.title,
            target: Math.max(1, Number(prog.ch.target) || 1),
            startDate: String(prog.ch.startDate || ''),
            endDate: String(prog.ch.endDate || '')
        };
        const status = prog.ended
            ? (prog.winners.length ? '🏆 Winner' + (prog.winners.length > 1 ? 's' : '') + ': ' + prog.winners.map(w => esc(UIModule.nameOf(course, w.uid))).join(', ') : 'Ended - nobody logged days. Next time! 😅')
            : `⏳ ${prog.daysLeft} day${prog.daysLeft === 1 ? '' : 's'} left`;
        return `
            <div class="form-section">
                <h2>🏁 ${esc(ch.title)}</h2>
                <p class="muted">Log <strong>${ch.target}</strong> Done days between ${Utils.formatDate(ch.startDate)} and ${Utils.formatDate(ch.endDate)} &middot; ${status}</p>
                ${prog.rows.map(r => `
                    <div class="chal-row">
                        <div class="chal-name">${esc(UIModule.nameOf(course, r.uid))}${r.reached ? ' ✅' : ''}</div>
                        <div class="chal-bar"><div class="chal-fill ${r.reached ? 'done' : ''}" style="width:${Number(r.pct) || 0}%"></div></div>
                        <div class="chal-count">${r.days}/${ch.target}</div>
                    </div>`).join('')}
                ${isOwner ? `<button class="btn btn-secondary btn-sm" style="margin-top:12px" onclick="AppController.endChallenge(${Utils.js(course.id)})">${prog.ended ? 'Clear challenge' : 'End challenge'}</button>` : ''}
            </div>`;
    },

    /** Checklist card body (also re-rendered on its own) */
    checklistHtml: (courseId) => {
        const esc = Utils.esc;
        const items = SettingsModule.getChecklist(courseId);
        const done = items.filter(i => i.done).length;
        const pct = items.length ? Math.round(done / items.length * 100) : 0;
        return `
            ${items.length ? `<div class="progress-line"><div class="progress-fill" style="width:${pct}%"></div></div>
            <p class="muted">${done}/${items.length} topics done (${pct}%)${pct === 100 ? ' 🎉 Course topics conquered!' : ''}</p>` : '<p class="muted">Break the course into topics and tick them off as you go. Only you can see this list.</p>'}
            <ul class="checklist">
                ${items.map(i => `
                    <li class="${i.done ? 'checked' : ''}">
                        <label><input type="checkbox" ${i.done ? 'checked' : ''} onchange="AppController.toggleChecklist(${Utils.js(courseId)}, ${Utils.js(i.id)})"> <span>${esc(i.title)}</span></label>
                        <button class="icon-btn" title="Remove" onclick="AppController.removeChecklist(${Utils.js(courseId)}, ${Utils.js(i.id)})">✕</button>
                    </li>`).join('')}
            </ul>
            <div class="share-row">
                <input type="text" id="checklistInput" placeholder="Add a topic, e.g., Functions" maxlength="120" onkeydown="if(event.key==='Enter'){AppController.addChecklist(${Utils.js(courseId)})}">
                <button class="btn btn-secondary" onclick="AppController.addChecklist(${Utils.js(courseId)})">Add</button>
            </div>`;
    },

    refreshChecklist: (courseId) => {
        const box = document.getElementById('checklistBox');
        if (box) box.innerHTML = UIModule.checklistHtml(courseId);
    },

    /** History rows for the current filters */
    historyRowsHtml: () => {
        const me = AuthModule.getCurrentUser();
        const esc = Utils.esc;
        const course = UIModule.currentCourse;
        const shared = ((course.memberIds || []).length > 1);
        const list = UIModule.filteredMetrics();

        if (!list.length) {
            return `<tr><td colspan="8" style="text-align:center;color:#999;">No entries match your filters 🔍</td></tr>`;
        }
        return list.map(metric => {
            const mine = metric.userId === me.uid;
            const reactions = metric.reactions || {};
            const counts = {};
            Object.values(reactions).forEach(e => { counts[e] = (counts[e] || 0) + 1; });
            const myReaction = reactions[me.uid];
            const cheers = shared ? `
                <div class="cheers">
                    ${Fun.reactionEmojis.map(e => {
                        const n = counts[e] || 0;
                        if (mine) return n ? `<span class="cheer">${e}${n}</span>` : '';
                        return `<button class="cheer cheer-btn ${myReaction === e ? 'on' : ''}" onclick="AppController.react(${Utils.js(metric.id)}, ${Utils.js(e)})" title="React">${e}${n ? n : ''}</button>`;
                    }).join('')}
                </div>` : '';
            return `
            <tr>
                <td>${Utils.formatDate(metric.date)}</td>
                ${shared ? `<td>${esc(UIModule.nameOf(course, metric.userId))}${mine ? ' (you)' : ''}</td>` : ''}
                <td><span class="badge badge-${esc((metric.status || '').toLowerCase())}">${esc(metric.status)}</span></td>
                <td>${Number(metric.duration) || 0} min</td>
                <td>${esc(metric.topic)}</td>
                <td>${esc(metric.notes)}</td>
                ${shared ? `<td>${cheers}</td>` : ''}
                <td class="actions-cell">
                    ${shared ? `<button class="chip-btn ${UIModule.openThreads['entry:' + metric.id] ? 'on' : ''}" title="Comments" onclick="AppController.toggleThread('entry',${Utils.js(metric.id)})">💬 ${ChatManager.count('entry', metric.id) || ''}</button>` : ''}
                    ${mine ? `
                        <button class="chip-btn" title="Make a flashcard from this entry" onclick="AppController.entryToCard(${Utils.js(metric.id)})">🃏</button>
                        <button class="btn btn-sm btn-secondary" onclick="AppController.editMetric(${Utils.js(metric.id)})">Edit</button>
                        <button class="btn btn-sm btn-secondary" onclick="AppController.deleteMetric(${Utils.js(metric.id)})">Delete</button>` : ''}
                </td>
            </tr>
            ${shared && UIModule.openThreads['entry:' + metric.id] ? `<tr class="thread-row"><td colspan="9">${ViewsModule.threadHtml('entry', metric.id)}</td></tr>` : ''}`;
        }).join('');
    },

    filteredMetrics: () => {
        const sorted = [...UIModule.allMetrics].sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
        return Analytics.filterMetrics(sorted, UIModule.filters);
    },

    refreshHistory: () => {
        const body = document.getElementById('historyBody');
        if (body) body.innerHTML = UIModule.historyRowsHtml();
        const count = document.getElementById('historyCount');
        if (count) count.textContent = UIModule.filteredMetrics().length + ' of ' + UIModule.allMetrics.length + ' entries';
    },

    /** Profile modal */
    showProfileModal: () => {
        if (document.getElementById('profileModal')) return;
        const p = ProfileManager.mine() || {};
        const current = p.avatar || Fun.avatars[0];
        const overlay = document.createElement('div');
        overlay.id = 'profileModal';
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-box">
                <h2>👤 Your Profile</h2>
                <p class="muted">Friends in shared courses see this instead of your email.</p>
                <div class="form-group">
                    <label>Display name</label>
                    <input type="text" id="profileName" maxlength="30" placeholder="e.g., Vishnu" value="${Utils.esc(p.displayName || '')}">
                </div>
                <label>Pick an avatar</label>
                <div class="avatar-grid" id="avatarGrid">
                    ${Fun.avatars.map(a => `<button type="button" class="avatar-opt ${a === current ? 'selected' : ''}" data-avatar="${Utils.esc(a)}" onclick="UIModule.pickAvatar(${Utils.js(a)})">${a}</button>`).join('')}
                </div>
                <input type="hidden" id="profileAvatar" value="${Utils.esc(current)}">
                <div class="modal-actions">
                    <button class="btn btn-primary" onclick="AppController.saveProfile()">Save</button>
                    <button class="btn btn-secondary" onclick="document.getElementById('profileModal').remove()">Cancel</button>
                </div>
            </div>`;
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
        document.body.appendChild(overlay);
    },

    pickAvatar: (a) => {
        document.getElementById('profileAvatar').value = a;
        document.querySelectorAll('.avatar-opt').forEach(b => b.classList.toggle('selected', b.dataset.avatar === a));
    },

    /**
     * Render courses list screen
     * @param {Array} courses - Array of courses
     * @param {Array} invitations - Courses I have been invited to
     */
    renderCoursesScreen: async (courses, invitations = []) => {
        const me = AuthModule.getCurrentUser();
        const esc = Utils.esc;
        const profile = ProfileManager.mine();
        const myName = profile && profile.displayName ? (profile.avatar || '🙂') + ' ' + profile.displayName : me.email;

        const invitesHtml = invitations.map(c => `
            <div class="invite-card">
                <div>
                    <strong>👯 ${esc(c.memberEmails && c.memberEmails[c.userId] || 'A friend')}</strong>
                    invited you to learn <strong>${esc(c.courseName)}</strong> together!
                </div>
                <div class="invite-actions">
                    <button class="btn btn-primary btn-sm" onclick="AppController.acceptInvite(${Utils.js(c.id)})">Join the squad 🎉</button>
                    <button class="btn btn-secondary btn-sm" onclick="AppController.declineInvite(${Utils.js(c.id)})">Maybe later</button>
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
                    ${course.challenge ? '<span class="tag tag-challenge">🏁 Challenge on</span>' : ''}
                </div>
                <p class="course-desc">${esc(course.description) || 'No description'}</p>
                <div class="course-dates">
                    <small>Started: ${Utils.formatDate(course.startDate)}</small>
                    ${course.endDate ? `<small>Ends: ${Utils.formatDate(course.endDate)}</small>` : ''}
                </div>
                <div class="course-actions">
                    <button class="btn btn-primary" onclick="AppController.openCourse(${Utils.js(course.id)})">Continue Quest ⚔️</button>
                    ${isOwner ? `<button class="btn btn-secondary" onclick="AppController.deleteCourse(${Utils.js(course.id)})">Delete</button>` : ''}
                </div>
            </div>`;
        }).join('');

        const reminder = SettingsModule.reminderTime();

        document.getElementById('app-root').innerHTML = `
            <div class="main-container">
                <div class="header">
                    <div>
                        <h1>🎒 My Learning Adventures</h1>
                        <span class="user-email">${Fun.pick(Fun.greetings)} &middot; ${esc(myName)}</span>
                    </div>
                    <div class="header-actions">
                        <button class="btn btn-primary" onclick="AppController.showCourseSetup()">+ New Adventure ✨</button>
                        <button class="btn btn-secondary" onclick="AppController.showBuddies()">🤝 Study Buddies</button>
                        <button class="btn btn-secondary" onclick="UIModule.showProfileModal()">👤 Profile</button>
                        <button class="btn btn-secondary" id="installBtn" style="display:none" onclick="AppController.installApp()">📲 Install</button>
                        <button class="btn btn-secondary" onclick="AppController.logout()">Logout</button>
                    </div>
                </div>

                <div class="content">
                    <div class="quote-banner">💡 ${esc(Fun.dailyQuote())}</div>

                    ${!me.emailVerified ? `<div class="today-banner">📧 Please verify your email (<strong>${esc(me.email)}</strong>). Verification is needed to accept course invitations and use Study Buddies.
                        <a href="#" onclick="AppController.resendVerification(); return false;">Resend email</a> &middot;
                        <a href="#" onclick="AppController.refreshVerification(); return false;">I've verified - refresh</a></div>` : ''}

                    ${!profile ? `<div class="today-banner">👋 Pick a display name and avatar so friends see more than your email. <a href="#" onclick="UIModule.showProfileModal(); return false;">Set up profile</a></div>` : ''}

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
                        <input type="time" id="reminderTime" value="${esc(reminder)}">
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
        const nameOf = (uid) => UIModule.nameOf(course, uid);
        const myMetrics = allMetrics.filter(m => m.userId === me.uid);

        UIModule.allMetrics = allMetrics;
        UIModule.myMetrics = myMetrics;
        UIModule.currentCourse = course;
        UIModule.editingMetricId = null;
        UIModule.filters = { q: '', status: '', member: '', topic: '', from: '', to: '' };

        const streak = Analytics.streakInfo(myMetrics);
        const mood = Fun.mood(stats.consistency, stats.totalEntries);
        const badges = Analytics.badges(myMetrics);
        const earned = badges.filter(b => b.earned).length;
        const goal = SettingsModule.getGoal(course.id);
        const todayMin = Analytics.minutesOn(myMetrics, Analytics.today());
        const pct = goal ? Math.min(100, Math.round(todayMin / goal * 100)) : 0;
        const R = 42, C = 2 * Math.PI * R;
        const loggedToday = Analytics.hasLoggedToday(myMetrics);
        const week = Analytics.weekReview(myMetrics);
        const weekStartKey = Analytics.weekStart(Analytics.today());
        const dow = new Date().getDay(); // Fri=5, Sat=6, Sun=0
        const reflectDue = (dow === 5 || dow === 6 || dow === 0) &&
            !UIModule.reflections.some(r => r.weekStart === weekStartKey);

        // Course timeline (only when there is an end date)
        let timelineHtml = '';
        if (course.endDate && course.endDate > course.startDate) {
            const total = Analytics.daysBetween(course.startDate, course.endDate) + 1;
            const elapsed = Math.min(total, Math.max(0, Analytics.daysBetween(course.startDate, Analytics.today()) + 1));
            const tp = Math.round(elapsed / total * 100);
            timelineHtml = `<div class="progress-line"><div class="progress-fill time" style="width:${tp}%"></div></div>
                <p class="muted">Course timeline: day ${elapsed} of ${total} (${tp}%)</p>`;
        }

        const heat = Analytics.heatmap(myMetrics, 18);
        const heatHtml = heat.map(col => `<div class="heat-col">${col.map(c =>
            `<div class="heat-cell heat-${c.state}" title="${c.date}${c.state === 'done' ? ' - Done 🎉' : c.state === 'missed' ? ' - Missed' : c.state === 'frozen' ? ' - Streak freeze 🧊' : ''}"></div>`
        ).join('')}</div>`).join('');

        // Leaderboard
        let leaderboardHtml = '';
        if (shared) {
            const rows = Analytics.leaderboard(course, allMetrics);
            const medals = ['🥇', '🥈', '🥉'];
            leaderboardHtml = `
                <div class="form-section">
                    <h2>🏆 Friendly Leaderboard</h2>
                    <div class="table-scroll">
                    <table class="metrics-table leaderboard">
                        <thead><tr><th>#</th><th>Learner</th><th>Consistency</th><th>Streak</th><th>Wins</th><th>Minutes</th><th></th></tr></thead>
                        <tbody>
                            ${rows.map((r, i) => {
                                const email = course.memberEmails && course.memberEmails[r.uid];
                                return `
                                <tr class="${r.uid === me.uid ? 'row-me' : ''}">
                                    <td>${medals[i] || (i + 1)}</td>
                                    <td>${esc(nameOf(r.uid))}${r.uid === me.uid ? ' (you)' : ''}</td>
                                    <td><strong>${r.consistency}%</strong></td>
                                    <td>🔥 ${r.streak}</td>
                                    <td>${r.wins}</td>
                                    <td>${r.minutes}</td>
                                    <td>${r.uid !== me.uid && !r.loggedToday && email ?
                                        `<a class="btn btn-sm btn-secondary" href="mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent('Learning nudge 👋')}&body=${encodeURIComponent(Fun.pick(Fun.nudges) + '\n\n' + location.href.split('#')[0])}">Nudge 👋</a>` :
                                        (r.loggedToday ? '<span title="Logged today">✅</span>' : '')}</td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                    </div>
                </div>`;
        }

        // Share / members panel
        const pending = course.invitedEmails || [];
        const shareHtml = `
            <div class="form-section">
                <h2>👯 Learn Together</h2>
                ${shared ? `
                    <div class="member-list">
                        ${memberIds.map(uid => `
                            <div class="member-chip">
                                <span>${esc(nameOf(uid))}${uid === course.userId ? ' 👑' : ''}${uid === me.uid ? ' (you)' : ''}</span>
                                ${isOwner && uid !== me.uid ? `<button class="icon-btn" title="Remove member" onclick="AppController.removeMember(${Utils.js(course.id)}, ${Utils.js(uid)})">✕</button>` : ''}
                            </div>`).join('')}
                    </div>` : '<p class="muted">Invite a friend (anywhere in the world!) to track this course with you. They just need an account with the same email.</p>'}
                ${isOwner ? `
                    <div class="share-row">
                        <input type="email" id="inviteEmail" placeholder="friend@email.com">
                        <button class="btn btn-primary" onclick="AppController.invite(${Utils.js(course.id)})">Send Invite ✉️</button>
                    </div>` : ''}
                ${pending.length ? `<div class="pending">Waiting for: ${pending.map(e => `<span class="tag">${esc(e)}${isOwner ? ` <a href="#" onclick="AppController.revokeInvite(${Utils.js(course.id)}, ${Utils.js(e)}); return false;" title="Cancel invite">✕</a>` : ''}</span>`).join(' ')}</div>` : ''}
                ${!isOwner ? `<button class="btn btn-secondary btn-sm" style="margin-top:14px" onclick="AppController.leaveCourse(${Utils.js(course.id)})">Leave this course 🚪</button>` : ''}
            </div>`;

        // History filter options
        const topicOptions = [...new Set(allMetrics.map(m => (m.topic || '').trim()).filter(Boolean))].sort();
        const filterBar = `
            <div class="filter-bar">
                <input type="search" id="fQ" placeholder="🔍 Search topic or notes" oninput="AppController.applyFilters()">
                <select id="fStatus" onchange="AppController.applyFilters()">
                    <option value="">All statuses</option><option value="Done">Done</option><option value="Missed">Missed</option>
                </select>
                <select id="fTopic" onchange="AppController.applyFilters()">
                    <option value="">All topics</option>
                    ${topicOptions.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('')}
                </select>
                ${shared ? `<select id="fMember" onchange="AppController.applyFilters()">
                    <option value="">Everyone</option>
                    ${memberIds.map(u => `<option value="${esc(u)}">${esc(nameOf(u))}</option>`).join('')}
                    ${[...new Set(allMetrics.map(m => m.userId))].filter(u => !memberIds.includes(u)).map(u => `<option value="${esc(u)}">Former member</option>`).join('')}
                </select>` : ''}
                <input type="date" id="fFrom" title="From" onchange="AppController.applyFilters()">
                <input type="date" id="fTo" title="To" onchange="AppController.applyFilters()">
                <button class="btn btn-secondary btn-sm" onclick="AppController.clearFilters()">Clear</button>
            </div>`;

        const tab = UIModule.activeTab;
        const panel = (id) => `tab-panel ${tab === id ? 'active' : ''}`;
        const tabBtn = (id, label) => `<button class="tab-btn ${tab === id ? 'active' : ''}" data-tab="${id}" onclick="UIModule.switchTab(${Utils.js(id)})">${label}</button>`;

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

                <div class="tabs">
                    ${tabBtn('progress', '📊 Progress')}
                    ${tabBtn('together', '👯 Together')}
                    ${tabBtn('library', '📚 Library')}
                    ${tabBtn('cards', '🃏 Flashcards')}
                    ${tabBtn('journal', '📓 Journal')}
                    ${tabBtn('log', '📝 Log &amp; History')}
                </div>

                <div class="content">
                    <!-- ============ PROGRESS ============ -->
                    <div class="${panel('progress')}" id="tab-progress">
                        <div class="mood-banner"><span class="mood-emoji">${mood.emoji}</span> ${mood.text}</div>
                        ${!loggedToday ? '<div class="today-banner">📅 Nothing logged for today yet - even 10 minutes counts!</div>' : ''}
                        ${reflectDue ? '<div class="today-banner">📓 Weekend reflection time! <a href="#" onclick="UIModule.switchTab(\'journal\'); return false;">Write this week\'s reflection</a></div>' : ''}

                        <div class="stats-grid">
                            <div class="stat-card"><div class="stat-value">${stats.consistency}%</div><div class="stat-label">Consistency 🔥</div></div>
                            <div class="stat-card"><div class="stat-value">${streak.current}</div><div class="stat-label">Day Streak 🔥 (best ${streak.best})<br><small>🧊 Freeze ${streak.freezeUsedThisWeek ? 'used this week' : 'ready'}</small></div></div>
                            <div class="stat-card"><div class="stat-value">${stats.completed}</div><div class="stat-label">Wins 🏆</div></div>
                            <div class="stat-card"><div class="stat-value">${stats.totalDays}</div><div class="stat-label">Days on the Journey 🗓️</div></div>
                            <div class="stat-card"><div class="stat-value">${stats.totalMinutes}</div><div class="stat-label">Minutes of Brain Gains ⏱️</div></div>
                        </div>

                        <div class="form-section week-card">
                            <h2>📋 Your Week in Review</h2>
                            <div class="week-grid">
                                <div><div class="week-num">${week.doneDays}</div><div class="week-lbl">Done days</div></div>
                                <div><div class="week-num">${week.minutes}</div><div class="week-lbl">Minutes${week.lastMinutes ? ' (last week ' + week.lastMinutes + ')' : ''}</div></div>
                                <div><div class="week-num">${week.bestDay ? Utils.formatDate(week.bestDay.date).replace(/, \d{4}$/, '') : '-'}</div><div class="week-lbl">Best day${week.bestDay ? ' (' + week.bestDay.minutes + ' min)' : ''}</div></div>
                                <div><div class="week-num week-topic">${week.topTopic ? esc(week.topTopic) : '-'}</div><div class="week-lbl">Top topic</div></div>
                            </div>
                            <p class="verdict">${Fun.weekVerdict(week)}</p>
                        </div>

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
                                            <input type="number" id="goalMinutes" min="0" placeholder="Minutes/day" value="${Number(goal) || ''}">
                                            <button class="btn btn-secondary btn-sm" onclick="AppController.saveGoal(${Utils.js(course.id)})">Set goal</button>
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
                            <h2>✅ Learning Checklist</h2>
                            ${timelineHtml}
                            <div id="checklistBox">${UIModule.checklistHtml(course.id)}</div>
                        </div>

                        <div class="form-section">
                            <h2>🗓️ Your Learning Heatmap</h2>
                            <div class="heatmap">${heatHtml}</div>
                            <div class="heat-legend"><span class="heat-cell heat-none"></span> none <span class="heat-cell heat-missed"></span> missed <span class="heat-cell heat-frozen"></span> freeze 🧊 <span class="heat-cell heat-done"></span> done</div>
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
                    </div>

                    <!-- ============ TOGETHER ============ -->
                    <div class="${panel('together')}" id="tab-together">
                        ${leaderboardHtml}
                        ${shared ? `<div class="form-section"><h2>💬 Group Chat</h2>${ViewsModule.deniedNotice('chat')}<div id="courseChat">${ViewsModule.threadHtml('course', course.id, true)}</div></div>` : ''}
                        ${UIModule.challengeHtml(course, allMetrics, isOwner)}
                        ${shareHtml}
                    </div>

                    <!-- ============ LIBRARY ============ -->
                    <div class="${panel('library')}" id="tab-library">${ViewsModule.libraryHtml(course)}</div>

                    <!-- ============ FLASHCARDS ============ -->
                    <div class="${panel('cards')}" id="tab-cards">${ViewsModule.flashcardsHtml(course)}</div>

                    <!-- ============ JOURNAL ============ -->
                    <div class="${panel('journal')}" id="tab-journal">${ViewsModule.journalHtml(course)}</div>

                    <!-- ============ LOG & HISTORY ============ -->
                    <div class="${panel('log')}" id="tab-log">
                        <div class="form-section timer-card" id="timerCard">
                            <h2>⏱️ Focus Timer</h2>
                            <div class="timer-row">
                                <div class="timer-display" id="timerDisplay">00:00</div>
                                <div class="timer-controls">
                                    <select id="timerMode" onchange="TimerModule.setMode(this.value)">
                                        <option value="0">Stopwatch</option>
                                        <option value="25">Pomodoro 25 min</option>
                                        <option value="45">Focus 45 min</option>
                                        <option value="60">Deep work 60 min</option>
                                    </select>
                                    <button class="btn btn-primary btn-sm" id="timerToggle" onclick="TimerModule.toggle()">▶ Start</button>
                                    <button class="btn btn-secondary btn-sm" onclick="TimerModule.reset()">Reset</button>
                                    <button class="btn btn-secondary btn-sm" id="timerUse" onclick="AppController.useTimer()" disabled>Use this time ✅</button>
                                </div>
                            </div>
                        </div>

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
                                    <input type="number" id="metricDuration" placeholder="0" min="0" max="1440">
                                </div>
                                <div class="form-group">
                                    <label>Topic</label>
                                    <input type="text" id="metricTopic" maxlength="200" placeholder="e.g., Loops (the good kind of going in circles) 🔁">
                                </div>
                            </div>
                            <div class="form-group full">
                                <label>Notes</label>
                                <textarea id="metricNotes" maxlength="2000" placeholder="Add any notes" rows="2"></textarea>
                            </div>
                            <button class="btn btn-primary" id="submitMetric" onclick="AppController.addMetric(${Utils.js(course.id)})">Log It! ✅</button>
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
                                ${filterBar}
                                <p class="muted" id="historyCount"></p>
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
                                            ${shared ? '<th>Cheers</th>' : ''}
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody id="historyBody"></tbody>
                                </table>
                                </div>
                            `}
                        </div>
                    </div>
                </div>
            </div>
        `;
        UIModule.initializeDatePickers();
        UIModule.renderCharts(myMetrics, course);
        UIModule.refreshHistory();
        TimerModule.mount(course.id);
    },

    /**
     * Render Chart.js charts (skipped gracefully if the library failed to load)
     */
    renderCharts: (myMetrics, course) => {
        UIModule.charts = [];
        if (typeof Chart === 'undefined') return;
        const mk = (el, cfg) => UIModule.charts.push(new Chart(el, cfg));
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
            mk(trendEl, {
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
            mk(weeklyEl, {
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

        // Course form: end date can never be before the start date
        const startEl = document.getElementById('startDate');
        const endEl = document.getElementById('endDate');
        if (startEl && endEl && startEl._flatpickr && endEl._flatpickr && !startEl._linked) {
            startEl._linked = true;
            const sync = () => {
                const start = startEl.value;
                endEl._flatpickr.set('minDate', start || '2020-01-01');
                if (start && endEl.value && endEl.value < start) endEl._flatpickr.clear();
            };
            startEl._flatpickr.config.onChange.push(sync);
            sync();
        }
    }
};

console.log('✓ UI module loaded');