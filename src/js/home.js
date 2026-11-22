/**
 * Home screen: every tracker in one place - today's check-in with goal progress, one-tap logging,
 * overall stats and a template picker for starting something new.
 */

const HomeModule = {

    render: (courses, invitations, mine) => {
        const me = AuthModule.getCurrentUser();
        const esc = Utils.esc;
        const profile = ProfileManager.mine();
        const myName = profile && profile.displayName ? (profile.avatar || '🙂') + ' ' + profile.displayName : me.email;
        const today = Analytics.today();

        const live = new Set(courses.map(c => c.id));
        const entries = mine.filter(m => live.has(m.courseId));
        const streak = Analytics.streakInfo(entries);
        const wk = Analytics.weekStart(today);
        const weekDays = new Set(entries.filter(m => m.status === 'Done' && m.date >= wk && m.date <= today).map(m => m.date)).size;

        const rows = courses.map(c => {
            const tpl = Trackers.tpl(c);
            const mineHere = entries.filter(m => m.courseId === c.id);
            return { c, tpl, mineHere, prog: Trackers.goalProgress(c, mineHere), loggedToday: mineHere.some(m => m.date === today), streak: Analytics.streakInfo(mineHere).current };
        });
        const withGoal = rows.filter(r => r.prog);
        const goalsMet = withGoal.filter(r => r.prog.met).length;
        const pending = rows.filter(r => !r.loggedToday).length;

        const invitesHtml = invitations.map(c => `
            <div class="invite-card">
                <div><strong>👯 ${esc(c.memberEmails && c.memberEmails[c.userId] || 'A friend')}</strong>
                    invited you to <strong>${esc(c.courseName)}</strong> together!</div>
                <div class="invite-actions">
                    <button class="btn btn-primary btn-sm" onclick="AppController.acceptInvite(${Utils.js(c.id)})">Join the squad 🎉</button>
                    <button class="btn btn-secondary btn-sm" onclick="AppController.declineInvite(${Utils.js(c.id)})">Maybe later</button>
                </div>
            </div>`).join('');

        const todayRows = rows.map(({ c, tpl, prog, loggedToday, streak: s }) => {
            const members = (c.memberIds || []).length;
            const isOwner = c.userId === me.uid;
            return `
            <div class="today-row ${loggedToday ? 'is-done' : ''}">
                <div class="today-main" onclick="AppController.openCourse(${Utils.js(c.id)})">
                    <span class="today-emoji">${tpl.emoji}</span>
                    <div class="today-info">
                        <strong>${esc(c.courseName)}</strong>
                        <div class="muted">${esc(tpl.name)}${s ? ' &middot; 🔥 ' + s + '-day streak' : ''}${members > 1 ? ' &middot; 👯 ' + members : ''}</div>
                        ${prog ? `<div class="mini-goal ${prog.met ? 'met' : ''} ${prog.over ? 'over' : ''}">
                            <div class="progress-line"><div class="progress-fill ${prog.over ? 'danger' : ''}" style="width:${Number(prog.pct) || 0}%"></div></div>
                            <small>${esc(prog.text)}${prog.met ? ' 🎉' : ''}</small></div>` : ''}
                    </div>
                </div>
                <div class="today-act">
                    ${loggedToday ? '<span class="tag tag-shared">✅ Logged today</span>'
                        : `<button class="btn btn-primary btn-sm" onclick="AppController.quickLog(${Utils.js(c.id)})">Log today</button>`}
                    <button class="btn btn-secondary btn-sm" onclick="AppController.openCourse(${Utils.js(c.id)})">Open</button>
                    ${isOwner ? `<button class="icon-btn" title="Delete" onclick="AppController.deleteCourse(${Utils.js(c.id)})">🗑</button>` : ''}
                </div>
            </div>`;
        }).join('');

        const chooser = Trackers.order.map(key => {
            const t = Trackers.templates[key];
            return `<button class="cat-card" onclick="AppController.showCourseSetup(${Utils.js(key)})">
                <span class="cat-emoji">${t.emoji}</span><strong>${esc(t.name)}</strong><small>${esc(t.blurb)}</small></button>`;
        }).join('');

        const heat = Analytics.heatmap(entries, 18);
        const heatHtml = heat.map(col => `<div class="heat-col">${col.map(c =>
            `<div class="heat-cell heat-${c.state}" title="${c.date}${c.state === 'done' ? ' - active 🎉' : c.state === 'frozen' ? ' - streak freeze 🧊' : ''}"></div>`).join('')}</div>`).join('');

        document.getElementById('app-root').innerHTML = `
            <div class="main-container">
                <div class="header">
                    <div>
                        <h1>🏠 Home</h1>
                        <span class="user-email">${esc(Fun.pick(Fun.greetings))} &middot; ${esc(myName)}</span>
                    </div>
                    <div class="header-actions">
                        <button class="btn btn-secondary" onclick="AppController.showBuddies()">🤝 Study Buddies</button>
                        <button class="btn btn-secondary" onclick="UIModule.showProfileModal()">👤 Profile</button>
                        <button class="btn btn-secondary" id="installBtn" style="display:none" onclick="AppController.installApp()">📲 Install</button>
                        <button class="btn btn-secondary" onclick="AppController.logout()">Logout</button>
                    </div>
                </div>

                <div class="content">
                    <div class="quote-banner">💡 ${esc(Fun.dailyQuote())}</div>
                    ${!me.emailVerified ? `<div class="today-banner">📧 Please verify your email (<strong>${esc(me.email)}</strong>). Verification is needed to accept invitations and use Study Buddies.
                        <a href="#" onclick="AppController.resendVerification(); return false;">Resend email</a> &middot;
                        <a href="#" onclick="AppController.refreshVerification(); return false;">I've verified - refresh</a></div>` : ''}
                    ${!profile ? `<div class="today-banner">👋 Pick a display name and avatar so friends see more than your email. <a href="#" onclick="UIModule.showProfileModal(); return false;">Set up profile</a></div>` : ''}
                    ${invitations.length ? `<div class="invites"><h2>📬 You have invitations!</h2>${invitesHtml}</div>` : ''}

                    <div class="stats-grid home-stats">
                        <div class="stat-card"><div class="stat-value">${streak.current}</div><div class="stat-label">Day streak 🔥<br><small>best ${streak.best}</small></div></div>
                        <div class="stat-card"><div class="stat-value">${weekDays}/7</div><div class="stat-label">Active days this week 📅</div></div>
                        <div class="stat-card"><div class="stat-value">${courses.length}</div><div class="stat-label">Trackers 🎯</div></div>
                        <div class="stat-card"><div class="stat-value">${withGoal.length ? goalsMet + '/' + withGoal.length : '-'}</div><div class="stat-label">Goals on track ✅</div></div>
                    </div>

                    <div class="form-section">
                        <div class="section-head">
                            <h2>✅ Today</h2>
                            ${courses.length ? `<small class="muted">${pending ? pending + ' left to log' : 'All logged - amazing! 🎉'}</small>` : ''}
                        </div>
                        ${courses.length ? `<div class="today-list">${todayRows}</div>`
                            : '<p class="muted">Nothing tracked yet. Pick something below - a course, the gym, your weight, meals, sleep, a habit... 👇</p>'}
                    </div>

                    <div class="form-section">
                        <div class="section-head"><h2>✨ Start a tracker</h2>
                            <small class="muted">Pick a template, then change anything you like</small></div>
                        <div class="cat-grid">${chooser}</div>
                    </div>

                    ${entries.length ? `
                    <div class="form-section">
                        <h2>🗓️ Everything you do</h2>
                        <div class="heatmap">${heatHtml}</div>
                        <div class="heat-legend"><span class="heat-cell heat-none"></span> none <span class="heat-cell heat-missed"></span> missed <span class="heat-cell heat-frozen"></span> freeze 🧊 <span class="heat-cell heat-done"></span> active</div>
                    </div>` : ''}

                    <div class="settings-strip">
                        <label for="reminderTime">⏰ Daily reminder</label>
                        <input type="time" id="reminderTime" value="${esc(SettingsModule.reminderTime())}">
                        <button class="btn btn-secondary btn-sm" onclick="AppController.saveReminder()">Save</button>
                        <small>Reminds you while the app is open or installed. Clear the time to turn it off.</small>
                    </div>
                </div>
            </div>`;
        AppController.refreshInstallButton();
    },

    quickLogModal: (course) => {
        const esc = Utils.esc;
        const tpl = Trackers.tpl(course);
        const old = document.getElementById('quickLogModal');
        if (old) old.remove();
        const overlay = document.createElement('div');
        overlay.id = 'quickLogModal';
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-box">
                <h2>${tpl.emoji} ${esc(course.courseName)}</h2>
                <p class="muted">Log today in a few seconds.</p>
                ${tpl.showStatus ? `<div class="form-group"><label>Status</label>
                    <select id="qlStatus"><option value="Done">Done 🎉</option><option value="Missed">Missed (we forgive you) 🫶</option></select></div>` : ''}
                ${tpl.showDuration ? `<div class="form-group"><label>Minutes</label><input type="number" id="qlDuration" min="0" max="1440" placeholder="0"></div>` : ''}
                ${tpl.showTopic ? `<div class="form-group"><label>${esc(tpl.topicLabel || 'Topic')}</label><input type="text" id="qlTopic" maxlength="200" placeholder="${esc(tpl.topicPh || '')}"></div>` : ''}
                ${TrackerUI.formFieldsHtml(course, {}, 'q_')}
                <div class="form-group"><label>Notes</label><textarea id="qlNotes" rows="2" maxlength="2000"></textarea></div>
                <div class="modal-actions">
                    <button class="btn btn-primary" onclick="AppController.submitQuickLog(${Utils.js(course.id)})">Log it ✅</button>
                    <button class="btn btn-secondary" onclick="document.getElementById('quickLogModal').remove()">Cancel</button>
                </div>
            </div>`;
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
        document.body.appendChild(overlay);
    }
};

console.log('✓ Home module loaded');
