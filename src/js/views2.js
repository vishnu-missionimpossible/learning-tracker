/**
 * Views (part 2) - Milestones, Live Room, Q&A and Notes tabs.
 * Pure HTML builders; the actions live in appExtra2.js. Every dynamic value is escaped.
 */

Object.assign(ViewsModule, {

    // =====================================================================
    // Milestones
    // =====================================================================
    milestonesHtml: (course) => {
        const esc = Utils.esc;
        const me = AuthModule.getCurrentUser();
        const isOwner = course.userId === me.uid;
        const memberIds = course.memberIds && course.memberIds.length ? course.memberIds : [course.userId];
        const items = MilestoneManager.items;
        const mine = MilestoneManager.progress(me.uid);
        const shared = memberIds.length > 1;

        const bars = memberIds.map(uid => {
            const p = MilestoneManager.progress(uid);
            return `<div class="ms-member"><span>${esc(UIModule.nameOf(course, uid))}${uid === me.uid ? ' (you)' : ''}</span>
                <div class="progress-line"><div class="progress-fill" style="width:${p.pct}%"></div></div>
                <small>${p.done}/${p.total}</small></div>`;
        }).join('');

        return `
            ${ViewsModule.deniedNotice('milestones')}
            <div class="form-section">
                <div class="section-head">
                    <h2>🧩 Milestones</h2>
                    <small class="muted">Break the goal into steps. ${shared ? 'Everyone sees everyone\'s progress.' : 'Tick them off as you go.'}</small>
                </div>
                ${items.length ? (mine.total && mine.done === mine.total
                    ? '<div class="mood-banner">🏁 You finished every milestone! Time to celebrate (and pick a bigger goal) 🎉</div>' : '') +
                    `<div class="ms-members">${bars}</div>` : '<p class="muted">No milestones yet. Add the first step below - for example "Finish chapter 1" or "Run 3 km without stopping".</p>'}

                <ul class="checklist ms-list">
                    ${items.map(m => {
                        const doneBy = m.doneBy || {};
                        const iDid = !!doneBy[me.uid];
                        const others = memberIds.filter(u => u !== me.uid && doneBy[u]);
                        const canDelete = m.userId === me.uid || isOwner;
                        return `
                        <li class="${iDid ? 'checked' : ''}">
                            <label><input type="checkbox" ${iDid ? 'checked' : ''} onchange="AppController.toggleMilestone(${Utils.js(m.id)})">
                                <span>${esc(m.title)}</span></label>
                            ${shared && others.length ? `<small class="ms-who" title="${esc(others.map(u => UIModule.nameOf(course, u)).join(', '))}">✅ ${others.length} friend${others.length === 1 ? '' : 's'}</small>` : ''}
                            ${iDid ? `<small class="ms-date">${esc(Utils.formatDate(doneBy[me.uid]))}</small>` : ''}
                            ${canDelete ? `<button class="icon-btn" title="Remove" onclick="AppController.deleteMilestone(${Utils.js(m.id)})">✕</button>` : ''}
                        </li>`;
                    }).join('')}
                </ul>

                <div class="share-row">
                    <input type="text" id="msInput" maxlength="120" placeholder="Add a milestone..." onkeydown="if(event.key==='Enter'){AppController.addMilestone(${Utils.js(course.id)})}">
                    <button class="btn btn-primary" onclick="AppController.addMilestone(${Utils.js(course.id)})">Add</button>
                </div>
                <details class="res-form">
                    <summary>📋 Add many at once (one per line)</summary>
                    <textarea id="msBulk" rows="5" placeholder="Week 1 - basics&#10;Week 2 - practice&#10;Week 3 - mini project"></textarea>
                    <button class="btn btn-secondary btn-sm" onclick="AppController.bulkMilestones(${Utils.js(course.id)})">Add all</button>
                </details>
            </div>`;
    },

    // =====================================================================
    // Live room
    // =====================================================================
    liveBannerHtml: () => {
        const me = AuthModule.getCurrentUser();
        const others = LiveSessions.live().filter(s => s.userId !== me.uid);
        if (!others.length) return '';
        const esc = Utils.esc;
        return others.map(s => `
            <div class="today-banner live-banner">🔴 <strong>${esc(ViewsModule.nameOf(s.userId))}</strong> is at it right now${s.label ? ' - ' + esc(s.label) : ''}
                (<span data-ends="${Number(s.endsAt)}">${LiveSessions.fmt(s.endsAt - Date.now())}</span> left)
                <a href="#" onclick="AppController.liveJoin(${Utils.js(s.id)}); return false;">Join them 🤝</a></div>`).join('');
    },

    liveHtml: (course) => {
        const esc = Utils.esc;
        const me = AuthModule.getCurrentUser();
        const live = LiveSessions.live();
        const mine = live.find(s => s.userId === me.uid);
        return `
            ${ViewsModule.deniedNotice('live')}
            <div class="form-section live-card">
                <div class="section-head"><h2>🔴 Live Room</h2><small class="muted">See who is working right now and share a countdown</small></div>
                ${live.length ? `<div class="live-list">${live.map(s => `
                    <div class="live-item ${s.userId === me.uid ? 'me' : ''}">
                        <div><strong>${esc(ViewsModule.nameOf(s.userId))}${s.userId === me.uid ? ' (you)' : ''}</strong>
                            <div class="muted">${esc(s.label || 'Focus session')}</div></div>
                        <div class="live-time" data-ends="${Number(s.endsAt)}">${LiveSessions.fmt(s.endsAt - Date.now())}</div>
                        ${s.userId !== me.uid ? `<button class="btn btn-secondary btn-sm" onclick="AppController.liveJoin(${Utils.js(s.id)})">Join 🤝</button>` : ''}
                    </div>`).join('')}</div>`
                    : '<p class="muted">Nobody is live right now. Be the first - your friends will see you here! 🌟</p>'}
                ${mine ? `
                    <button class="btn btn-secondary" onclick="AppController.liveEnd(${Utils.js(course.id)})">⏹ End my session &amp; log it</button>`
                : `
                    <div class="live-form">
                        <input type="text" id="liveLabel" maxlength="80" placeholder="What are you working on? (optional)">
                        <select id="liveMinutes">
                            <option value="15">15 min</option><option value="25" selected>25 min</option>
                            <option value="45">45 min</option><option value="60">60 min</option>
                            <option value="90">90 min</option><option value="120">2 hours</option>
                        </select>
                        <button class="btn btn-primary" onclick="AppController.liveStart(${Utils.js(course.id)})">🔴 Go live</button>
                    </div>`}
            </div>`;
    },

    // =====================================================================
    // Q&A
    // =====================================================================
    questionsHtml: (course) => {
        const esc = Utils.esc;
        const f = QuestionManager.filter;
        const items = QuestionManager.items;
        const open = items.filter(q => q.status === 'open').length;
        const chip = (id, label) => `<button class="chip-btn ${f === id ? 'on' : ''}" onclick="AppController.filterQuestions(${Utils.js(id)})">${label}</button>`;
        return `
            ${ViewsModule.deniedNotice('questions')}
            <div class="form-section">
                <div class="section-head"><h2>❓ Question Bank</h2>
                    <small class="muted">Stuck? Ask here. Answers and ideas go in the thread under each question.</small></div>
                <div class="form-group full">
                    <input type="text" id="qTitle" maxlength="200" placeholder="Your question, in one line">
                </div>
                <div class="form-group full">
                    <textarea id="qDetails" rows="2" maxlength="1500" placeholder="Details, what you tried, a code snippet... (optional)"></textarea>
                </div>
                <button class="btn btn-primary" onclick="AppController.askQuestion(${Utils.js(course.id)})">Post question 📮</button>
            </div>
            <div class="form-section">
                <div class="tag-row">${chip('all', 'All (' + items.length + ')')} ${chip('open', 'Open (' + open + ')')} ${chip('solved', 'Solved (' + (items.length - open) + ')')}</div>
                <div id="qaList">${ViewsModule.questionListHtml(course)}</div>
            </div>`;
    },

    questionListHtml: (course) => {
        const esc = Utils.esc;
        const me = AuthModule.getCurrentUser();
        const isOwner = course.userId === me.uid;
        const f = QuestionManager.filter;
        const list = QuestionManager.items.filter(q => f === 'all' || q.status === f);
        if (!list.length) return '<p class="muted">Nothing here yet. Great questions are how everyone learns 🌱</p>';
        return list.map(q => {
            const n = ChatManager.count('question', q.id);
            const canManage = q.userId === me.uid || isOwner;
            const key = 'question:' + q.id;
            return `
            <div class="qa-card ${q.status === 'solved' ? 'solved' : ''}">
                <div class="qa-head">
                    <strong>${esc(q.title)}</strong>
                    <span class="tag ${q.status === 'solved' ? 'tag-shared' : ''}">${q.status === 'solved' ? '✅ Solved' : '🟡 Open'}</span>
                </div>
                ${q.details ? `<div class="qa-details">${esc(q.details)}</div>` : ''}
                <small class="muted">Asked by ${esc(ViewsModule.nameOf(q.userId))} &middot; ${Utils.timeAgo(q.createdAt)}</small>
                <div class="qa-actions">
                    <button class="chip-btn ${UIModule.openThreads[key] ? 'on' : ''}" onclick="AppController.toggleThread('question', ${Utils.js(q.id)})">💬 ${n ? n + (n === 1 ? ' answer' : ' answers') : 'Answer'}</button>
                    ${canManage ? `<button class="chip-btn" onclick="AppController.setQuestionStatus(${Utils.js(q.id)}, ${Utils.js(q.status === 'solved' ? 'open' : 'solved')})">${q.status === 'solved' ? '↩ Reopen' : '✅ Mark solved'}</button>
                    <button class="chip-btn" onclick="AppController.deleteQuestion(${Utils.js(q.id)})">🗑</button>` : ''}
                </div>
                ${UIModule.openThreads[key] ? ViewsModule.threadHtml('question', q.id) : ''}
            </div>`;
        }).join('');
    },

    // =====================================================================
    // Notes
    // =====================================================================
    notesHtml: (course) => {
        const esc = Utils.esc;
        const editing = NoteManager.items.find(n => n.id === NoteManager.editingId);
        const tags = [...new Set(NoteManager.items.flatMap(n => n.tags || []))].sort();
        const f = NoteManager.filters;
        return `
            ${ViewsModule.deniedNotice('notes')}
            <div class="form-section">
                <div class="section-head"><h2>🗒️ Notes</h2>
                    <small class="muted">Markdown notes: # headings, **bold**, *italic*, - lists, \`code\`, [links](https://...)</small></div>
                <details class="res-form" ${editing ? 'open' : ''}>
                    <summary>${editing ? '✏️ Editing note' : '➕ New note'}</summary>
                    <div class="form-row">
                        <div class="form-group"><label>Title *</label>
                            <input type="text" id="noteTitle" maxlength="120" value="${esc(editing ? editing.title : '')}" placeholder="e.g., How loops work"></div>
                        <div class="form-group"><label>Tags <small>(comma separated)</small></label>
                            <input type="text" id="noteTags" value="${esc(editing ? (editing.tags || []).join(', ') : '')}" placeholder="python, basics"></div>
                    </div>
                    <div class="form-group full"><label>Note</label>
                        <textarea id="noteBody" rows="7" maxlength="8000" placeholder="Write anything...">${esc(editing ? editing.body : '')}</textarea></div>
                    <label class="inline-check"><input type="checkbox" id="noteShared" ${editing && editing.shared ? 'checked' : ''}> Share with everyone in this goal</label>
                    <div style="margin-top:10px">
                        <button class="btn btn-primary" onclick="AppController.saveNote(${Utils.js(course.id)})">${editing ? 'Save Changes 💾' : 'Save Note 📝'}</button>
                        ${editing ? '<button class="btn btn-secondary" onclick="AppController.cancelNoteEdit()">Cancel</button>' : ''}
                    </div>
                </details>
            </div>
            ${NoteManager.items.length ? `
            <div class="filter-bar">
                <input type="search" id="nfQ" placeholder="🔍 Search notes" value="${esc(f.q)}" oninput="AppController.filterNotes()">
                <select id="nfTag" onchange="AppController.filterNotes()">
                    <option value="">All tags</option>
                    ${tags.map(t => `<option value="${esc(t)}" ${f.tag === t ? 'selected' : ''}>#${esc(t)}</option>`).join('')}
                </select>
                <select id="nfScope" onchange="AppController.filterNotes()">
                    <option value="all" ${f.scope === 'all' ? 'selected' : ''}>All notes</option>
                    <option value="mine" ${f.scope === 'mine' ? 'selected' : ''}>Only mine</option>
                    <option value="shared" ${f.scope === 'shared' ? 'selected' : ''}>Shared by friends</option>
                </select>
            </div>` : ''}
            <div id="noteList">${ViewsModule.noteListHtml(course)}</div>`;
    },

    noteListHtml: (course) => {
        const esc = Utils.esc;
        const me = AuthModule.getCurrentUser();
        const list = NoteManager.visible();
        if (!list.length) return '<div class="form-section"><p class="muted">' + (NoteManager.items.length ? 'No notes match your search 🔍' : 'No notes yet. Capture what you learn - future you will say thanks! 🙏') + '</p></div>';
        return list.map(n => {
            const mine = n.userId === me.uid;
            return `
            <details class="note-card" ${NoteManager.openId === n.id ? 'open' : ''}>
                <summary>
                    <strong>${esc(n.title)}</strong>
                    ${n.shared ? '<span class="tag tag-shared">👯 shared</span>' : (mine ? '<span class="tag">🔒 private</span>' : '')}
                    ${(n.tags || []).map(t => `<span class="tag">#${esc(t)}</span>`).join('')}
                    <small class="muted">${mine ? '' : esc(ViewsModule.nameOf(n.userId)) + ' &middot; '}${Utils.timeAgo(n.updatedAt)}</small>
                </summary>
                <div class="md">${Utils.md(n.body) || '<p class="muted">(empty)</p>'}</div>
                ${mine ? `<div class="qa-actions">
                    <button class="chip-btn" onclick="AppController.editNote(${Utils.js(n.id)})">✏️ Edit</button>
                    <button class="chip-btn" onclick="AppController.deleteNote(${Utils.js(n.id)})">🗑 Delete</button></div>` : ''}
            </details>`;
        }).join('');
    }
});

console.log('✓ Views (part 2) loaded');
