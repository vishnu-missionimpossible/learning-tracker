/**
 * Home + Profile screens
 *  - Home: today's check-in across ALL goals, overall stats, "start something new" goal chooser.
 *  - Profile: avatar / name / bio, account & verification, lifetime stats, preferences, data export.
 * Pure rendering; actions live in appExtra2.js.
 */

const HomeModule = {

    /** Top navigation shown on the main screens */
    navHtml: (active) => {
        const item = (id, label, fn) =>
            `<button class="nav-btn ${active === id ? 'active' : ''}" onclick="${fn}">${label}</button>`;
        return `<nav class="topnav">
            ${item('home', '🏠 Home', 'AppController.showHome()')}
            ${item('goals', '🎯 My Goals', 'AppController.showCourses()')}
            ${item('buddies', '🤝 Buddies', 'AppController.showBuddies()')}
            ${item('profile', '👤 Profile', 'AppController.showProfile()')}
        </nav>`;
    },

    /** Verification / profile / install banners shared by the main screens */
    bannersHtml: () => {
        const me = AuthModule.getCurrentUser();
        const esc = Utils.esc;
        const profile = ProfileManager.mine();
        return `
            ${!me.emailVerified ? `<div class="today-banner">📧 Please verify your email (<strong>${esc(me.email)}</strong>). Verification is needed to accept invitations and use Study Buddies.
                <a href="#" onclick="AppController.resendVerification(); return false;">Resend email</a> &middot;
                <a href="#" onclick="AppController.refreshVerification(); return false;">I've verified - refresh</a></div>` : ''}
            ${!profile ? `<div class="today-banner">👋 Pick a display name and avatar so friends see more than your email. <a href="#" onclick="AppController.showProfile(); return false;">Set up profile</a></div>` : ''}`;
    },

    // =====================================================================
    // Home
    // =====================================================================
    renderHome: (courses, invitations, mine) => {
        const me = AuthModule.getCurrentUser();
        const esc = Utils.esc;
        const profile = ProfileManager.mine();
        const myName = profile && profile.displayName ? (profile.avatar || '🙂') + ' ' + profile.displayName : me.email;
        const today = Analytics.today();

        // Only my own entries for goals that still exist
        const live = new Set(courses.map(c => c.id));
        const entries = mine.filter(m => live.has(m.courseId));
        const streak = Analytics.streakInfo(entries);
        const wkStart = Analytics.weekStart(today);
        const weekDays = new Set(entries.filter(m => m.status === 'Done' && m.date >= wkStart && m.date <= today).map(m => m.date)).size;
        const monthKey = today.slice(0, 7);
        const monthMin = entries.filter(m => m.status === 'Done' && m.date.slice(0, 7) === monthKey)
            .reduce((s, m) => s + (Number(m.duration) || 0), 0);
        const loggedIds = new Set(entries.filter(m => m.date === today).map(m => m.courseId));
        const pending = courses.filter(c => !loggedIds.has(c.id)).length;

        const invitesHtml = invitations.map(c => `
            <div class="invite-card">
                <div><strong>👯 ${esc(c.memberEmails && c.memberEmails[c.userId] || 'A friend')}</strong>
                    invited you to <strong>${esc(c.courseName)}</strong> together!</div>
                <div class="invite-actions">
                    <button class="btn btn-primary btn-sm" onclick="AppController.acceptInvite(${Utils.js(c.id)})">Join the squad 🎉</button>
                    <button class="btn btn-secondary btn-sm" onclick="AppController.declineInvite(${Utils.js(c.id)})">Maybe later</button>
                </div>
            </div>`).join('');

        const todayRows = courses.map(c => {
            const cat = Categories.get(c);
            const mineToday = entries.filter(m => m.courseId === c.id && m.date === today);
            const done = mineToday.some(m => m.status === 'Done');
            const missed = !done && mineToday.length > 0;
            const s = Analytics.streakInfo(entries.filter(m => m.courseId === c.id)).current;
            return `
            <div class="today-row ${done ? 'is-done' : ''}">
                <div class="today-main" onclick="AppController.openCourse(${Utils.js(c.id)})">
                    <span class="today-emoji">${cat.emoji}</span>
                    <div><strong>${esc(c.courseName)}</strong>
                        <div class="muted">${esc(cat.name)}${s ? ' &middot; 🔥 ' + s + '-day streak' : ''}</div></div>
                </div>
                <div class="today-act">
                    ${done ? '<span class="tag tag-shared">✅ Done today</span>'
                        : missed ? '<span class="tag">Skipped today</span>' : ''}
                    ${done ? '' : `<button class="btn btn-primary btn-sm" onclick="AppController.quickLog(${Utils.js(c.id)})">Log today</button>`}
                </div>
            </div>`;
        }).join('');

        const heat = Analytics.heatmap(entries, 18);
        const heatHtml = heat.map(col => `<div class="heat-col">${col.map(c =>
            `<div class="heat-cell heat-${c.state}" title="${c.date}${c.state === 'done' ? ' - active 🎉' : c.state === 'frozen' ? ' - streak freeze 🧊' : ''}"></div>`).join('')}</div>`).join('');

        const chooser = Categories.order.map(key => {
            const cat = Categories.list[key];
            return `
            <button class="cat-card" onclick="AppController.showCourseSetup(${Utils.js(key)})">
                <span class="cat-emoji">${cat.emoji}</span>
                <strong>${esc(cat.name)}</strong>
                <small>${esc(cat.blurb)}</small>
            </button>`;
        }).join('');

        document.getElementById('app-root').innerHTML = `
            <div class="main-container">
                <div class="header">
                    <div>
                        <h1>🏠 Home</h1>
                        <span class="user-email">${esc(Fun.pick(Fun.greetings))} &middot; ${esc(myName)}</span>
                    </div>
                    <div class="header-actions">
                        <button class="btn btn-secondary" id="installBtn" style="display:none" onclick="AppController.installApp()">📲 Install</button>
                        <button class="btn btn-secondary" onclick="AppController.logout()">Logout</button>
                    </div>
                </div>
                ${HomeModule.navHtml('home')}

                <div class="content">
                    <div class="quote-banner">💡 ${esc(Fun.dailyQuote())}</div>
                    ${HomeModule.bannersHtml()}
                    ${invitations.length ? `<div class="invites"><h2>📬 You have invitations!</h2>${invitesHtml}</div>` : ''}

                    <div class="stats-grid home-stats">
                        <div class="stat-card"><div class="stat-value">${streak.current}</div><div class="stat-label">Day streak 🔥<br><small>best ${streak.best}</small></div></div>
                        <div class="stat-card"><div class="stat-value">${weekDays}/7</div><div class="stat-label">Active days this week 📅</div></div>
                        <div class="stat-card"><div class="stat-value">${monthMin}</div><div class="stat-label">Minutes this month ⏱️</div></div>
                        <div class="stat-card"><div class="stat-value">${courses.length}</div><div class="stat-label">Active goals 🎯</div></div>
                    </div>

                    <div class="form-section">
                        <div class="section-head">
                            <h2>✅ Today's check-in</h2>
                            ${courses.length ? `<small class="muted">${pending ? pending + ' left for today' : 'All logged - amazing! 🎉'}</small>` : ''}
                        </div>
                        ${courses.length ? `<div class="today-list">${todayRows}</div>`
                            : '<p class="muted">You have no goals yet. Pick a type below to get started - gym, a hobby, a course, a daily habit... 👇</p>'}
                    </div>

                    <div class="form-section">
                        <div class="section-head"><h2>✨ Start something new</h2>
                            <small class="muted">What do you want to be consistent at?</small></div>
                        <div class="cat-grid">${chooser}</div>
                    </div>

                    ${entries.length ? `
                    <div class="form-section">
                        <div class="section-head">
                            <h2>🗓️ Everything you do</h2>
                            <button class="btn btn-secondary btn-sm" onclick="AppController.openAllReport()">📅 Monthly report</button>
                        </div>
                        <div class="heatmap">${heatHtml}</div>
                        <div class="heat-legend"><span class="heat-cell heat-none"></span> none <span class="heat-cell heat-missed"></span> missed <span class="heat-cell heat-frozen"></span> freeze 🧊 <span class="heat-cell heat-done"></span> active</div>
                    </div>` : ''}
                </div>
            </div>`;
        AppController.refreshInstallButton();
    },

    // =====================================================================
    // Profile
    // =====================================================================
    renderProfile: (courses, mine) => {
        const me = AuthModule.getCurrentUser();
        const esc = Utils.esc;
        const p = ProfileManager.mine() || {};
        const current = p.avatar || Fun.avatars[0];
        const live = new Set(courses.map(c => c.id));
        const entries = mine.filter(m => live.has(m.courseId));
        const streak = Analytics.streakInfo(entries);
        const doneDays = Analytics.doneDates(entries).length;
        const minutes = entries.filter(m => m.status === 'Done').reduce((s, m) => s + (Number(m.duration) || 0), 0);
        const badges = Analytics.badges(entries);
        const earned = badges.filter(b => b.earned).length;
        const created = me.metadata && me.metadata.creationTime ? new Date(me.metadata.creationTime) : null;
        const reminder = SettingsModule.reminderTime();

        // Per-category totals
        const byCat = {};
        courses.forEach(c => {
            const k = Categories.key(c);
            byCat[k] = byCat[k] || { goals: 0, days: new Set(), minutes: 0 };
            byCat[k].goals++;
            entries.filter(m => m.courseId === c.id && m.status === 'Done').forEach(m => {
                byCat[k].days.add(m.date);
                byCat[k].minutes += Number(m.duration) || 0;
            });
        });
        const catRows = Object.entries(byCat).map(([k, v]) => `
            <tr><td>${Categories.list[k].emoji} ${esc(Categories.list[k].name)}</td><td>${v.goals}</td><td>${v.days.size}</td><td>${v.minutes}</td></tr>`).join('');

        document.getElementById('app-root').innerHTML = `
            <div class="main-container">
                <div class="header">
                    <div><h1>👤 Profile</h1><span class="user-email">${esc(me.email)}</span></div>
                    <div class="header-actions">
                        <button class="btn btn-secondary" onclick="AppController.logout()">Logout</button>
                    </div>
                </div>
                ${HomeModule.navHtml('profile')}

                <div class="content">
                    ${HomeModule.bannersHtml()}

                    <div class="two-col">
                        <div class="form-section">
                            <h2>✏️ About you</h2>
                            <p class="muted">Friends in shared goals see your name, avatar and bio - never your email.</p>
                            <div class="profile-preview"><span class="profile-avatar" id="profilePreview">${esc(current)}</span></div>
                            <div class="form-group">
                                <label>Display name</label>
                                <input type="text" id="profileName" maxlength="30" placeholder="e.g., Vishnu" value="${esc(p.displayName || '')}">
                            </div>
                            <div class="form-group">
                                <label>Bio <small>(optional)</small></label>
                                <textarea id="profileBio" rows="2" maxlength="160" placeholder="A line about you or your goals">${esc(p.bio || '')}</textarea>
                            </div>
                            <label>Pick an avatar</label>
                            <div class="avatar-grid" id="avatarGrid">
                                ${Fun.avatars.map(a => `<button type="button" class="avatar-opt ${a === current ? 'selected' : ''}" data-avatar="${esc(a)}" onclick="UIModule.pickAvatar(${Utils.js(a)})">${a}</button>`).join('')}
                            </div>
                            <input type="hidden" id="profileAvatar" value="${esc(current)}">
                            <button class="btn btn-primary" style="margin-top:14px" onclick="AppController.saveProfile()">Save profile</button>
                        </div>

                        <div class="form-section">
                            <h2>🏅 Lifetime stats</h2>
                            <div class="week-grid">
                                <div><div class="week-num">${doneDays}</div><div class="week-lbl">Active days</div></div>
                                <div><div class="week-num">${minutes}</div><div class="week-lbl">Minutes</div></div>
                                <div><div class="week-num">${streak.best}</div><div class="week-lbl">Best streak</div></div>
                                <div><div class="week-num">${courses.length}</div><div class="week-lbl">Goals</div></div>
                            </div>
                            <h3 style="margin-top:16px">Badges <small>(${earned}/${badges.length})</small></h3>
                            <div class="badges">
                                ${badges.map(b => `<div class="badge-item ${b.earned ? 'earned' : 'locked'}" title="${esc(b.desc)}">
                                    <div class="badge-emoji">${b.earned ? b.emoji : '🔒'}</div><div class="badge-name">${esc(b.name)}</div></div>`).join('')}
                            </div>
                            ${created ? `<p class="muted" style="margin-top:12px">Member since ${esc(created.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))}</p>` : ''}
                        </div>
                    </div>

                    ${catRows ? `
                    <div class="form-section">
                        <h2>🎯 By goal type</h2>
                        <div class="table-scroll"><table class="metrics-table">
                            <thead><tr><th>Type</th><th>Goals</th><th>Active days</th><th>Minutes</th></tr></thead>
                            <tbody>${catRows}</tbody></table></div>
                    </div>` : ''}

                    <div class="two-col">
                        <div class="form-section">
                            <h2>⚙️ Preferences</h2>
                            <div class="settings-strip">
                                <label for="reminderTime">⏰ Daily reminder</label>
                                <input type="time" id="reminderTime" value="${esc(reminder)}">
                                <button class="btn btn-secondary btn-sm" onclick="AppController.saveReminder()">Save</button>
                                <small>Reminds you while the app is open or installed. Clear the time to turn it off.</small>
                            </div>
                            <div class="pref-row">
                                <button class="btn btn-secondary btn-sm" onclick="SettingsModule.toggleTheme()">🌗 Switch light / dark</button>
                                <button class="btn btn-secondary btn-sm" id="installBtn" style="display:none" onclick="AppController.installApp()">📲 Install app</button>
                            </div>
                        </div>

                        <div class="form-section">
                            <h2>🔐 Account &amp; data</h2>
                            <p>Email: <strong>${esc(me.email)}</strong> ${me.emailVerified ? '<span class="tag tag-shared">✅ verified</span>' : '<span class="tag">⚠️ not verified</span>'}</p>
                            <div class="pref-row">
                                <button class="btn btn-secondary btn-sm" onclick="AppController.sendResetToMe()">🔑 Email me a password reset</button>
                                <button class="btn btn-secondary btn-sm" onclick="AppController.openAllReport()">📅 Monthly report</button>
                                <button class="btn btn-secondary btn-sm" onclick="AppController.downloadMyData()">📥 Download my data</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
        AppController.refreshInstallButton();
    },

    // =====================================================================
    // Quick log modal (from Home)
    // =====================================================================
    quickLogModal: (course) => {
        const esc = Utils.esc;
        const cat = Categories.get(course);
        const old = document.getElementById('quickLogModal');
        if (old) old.remove();
        const overlay = document.createElement('div');
        overlay.id = 'quickLogModal';
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-box">
                <h2>${cat.emoji} ${esc(course.courseName)}</h2>
                <p class="muted">Log today in a few seconds.</p>
                <div class="form-group"><label>Status</label>
                    <select id="qlStatus"><option value="Done">Done 🎉</option><option value="Missed">Missed (we forgive you) 🫶</option></select></div>
                <div class="form-row">
                    <div class="form-group"><label>Minutes</label><input type="number" id="qlDuration" min="0" max="1440" placeholder="0"></div>
                    ${cat.valueLabel ? `<div class="form-group"><label>${esc(cat.valueLabel)}</label>
                        <div class="value-row"><input type="number" id="qlValue" min="0" step="any" placeholder="0">
                        <select id="qlUnit">${cat.units.map(u => `<option value="${esc(u)}">${esc(u)}</option>`).join('')}</select></div></div>` : ''}
                </div>
                <div class="form-group"><label>${esc(cat.topicLabel)}</label><input type="text" id="qlTopic" maxlength="200" placeholder="${esc(cat.topicPh)}"></div>
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
