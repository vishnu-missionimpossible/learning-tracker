/**
 * Views Module
 * HTML builders for the Library, Flashcards and Journal tabs, comment threads
 * and the Study Buddy screen. Pure presentation - actions live in appExtra.js.
 */

const ViewsModule = {
    deniedNotice: (feature) => UIModule.denied[feature]
        ? '<div class="today-banner">🔒 This feature needs the latest security rules. Copy <strong>firestore.rules</strong> into Firebase Console → Firestore Database → Rules → Publish, then refresh.</div>'
        : '',

    nameOf: (uid) => UIModule.nameOf(UIModule.currentCourse, uid),

    isShared: () => ((UIModule.currentCourse.memberIds || []).length > 1),

    // =====================================================================
    // Comment threads (real-time)
    // =====================================================================
    threadId: (type, id) => 'ti_' + type + '_' + id,

    threadHtml: (type, targetId, big) => {
        const me = AuthModule.getCurrentUser();
        const course = UIModule.currentCourse;
        const isOwner = course.userId === me.uid;
        const esc = Utils.esc;
        const list = ChatManager.forTarget(type, targetId);
        return `
            <div class="thread ${big ? 'thread-big' : ''}">
                <div class="${big ? 'chat-list' : 'comment-list'}">
                    ${list.length ? list.map(c => `
                        <div class="comment ${c.userId === me.uid ? 'mine' : ''}">
                            <div class="c-head">
                                <strong>${esc(ViewsModule.nameOf(c.userId))}</strong>
                                <small>${Utils.timeAgo(c.createdAt)}</small>
                                ${(c.userId === me.uid || isOwner) ? `<button class="icon-btn" title="Delete" onclick="AppController.deleteComment('${c.id}')">🗑</button>` : ''}
                            </div>
                            <div class="c-text">${esc(c.text)}</div>
                        </div>`).join('') : '<p class="muted">No messages yet. Be the first to say something nice 💬</p>'}
                </div>
                <div class="share-row">
                    <input type="text" class="thread-input" id="${ViewsModule.threadId(type, targetId)}" maxlength="500" placeholder="Write a message..." onkeydown="if(event.key==='Enter'){AppController.sendComment('${type}','${targetId}')}">
                    <button class="btn btn-primary btn-sm" onclick="AppController.sendComment('${type}','${targetId}')">Send</button>
                </div>
            </div>`;
    },

    // =====================================================================
    // Resource Library
    // =====================================================================
    resFilters: { q: '', type: '', tag: '', hideDone: false, sort: 'smart' },

    libraryHtml: (course) => {
        const esc = Utils.esc;
        const me = AuthModule.getCurrentUser();
        const total = UIModule.resources.length;
        const doneMine = UIModule.resources.filter(r => r.doneBy && r.doneBy[me.uid]).length;
        const pct = total ? Math.round(doneMine / total * 100) : 0;
        const allTags = [...new Set(UIModule.resources.flatMap(r => r.tags || []))].sort();
        const editing = UIModule.resources.find(r => r.id === UIModule.editingResourceId);

        return `
            ${ViewsModule.deniedNotice('library')}
            <div class="form-section">
                <div class="section-head">
                    <h2>📚 Resource Library</h2>
                    <small class="muted">Videos, articles, docs and more - shared with everyone in this course</small>
                </div>
                ${total ? `<div class="progress-line"><div class="progress-fill" style="width:${pct}%"></div></div>
                <p class="muted">You finished <strong>${doneMine}</strong> of <strong>${total}</strong> resources (${pct}%)</p>` : ''}

                <details class="res-form" ${editing ? 'open' : ''}>
                    <summary>${editing ? '✏️ Editing resource' : '➕ Add a resource'}</summary>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Link *</label>
                            <input type="text" id="resUrl" placeholder="https://..." value="${esc(editing ? editing.url : '')}" onchange="AppController.autoDetectResource()">
                        </div>
                        <div class="form-group">
                            <label>Title <small>(optional)</small></label>
                            <input type="text" id="resTitle" maxlength="150" placeholder="Defaults to the website name" value="${esc(editing ? editing.title : '')}">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Type</label>
                            <select id="resType">
                                <option value="">Auto-detect</option>
                                ${Object.entries(ResourceManager.types).map(([k, t]) => `<option value="${k}" ${editing && editing.type === k ? 'selected' : ''}>${t.emoji} ${t.label}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Tags <small>(comma separated)</small></label>
                            <input type="text" id="resTags" placeholder="beginner, python, free" value="${esc(editing ? (editing.tags || []).join(', ') : '')}">
                        </div>
                    </div>
                    <div class="form-group full">
                        <label>Why is it useful?</label>
                        <textarea id="resDesc" rows="2" maxlength="400" placeholder="One line to help friends decide if it's worth their time">${esc(editing ? editing.description : '')}</textarea>
                    </div>
                    <button class="btn btn-primary" onclick="AppController.saveResource('${course.id}')">${editing ? 'Save Changes 💾' : 'Share Resource 📤'}</button>
                    ${editing ? '<button class="btn btn-secondary" onclick="AppController.cancelResourceEdit()">Cancel</button>' : ''}
                </details>
            </div>

            ${total ? `
            <div class="filter-bar">
                <input type="search" id="rfQ" placeholder="🔍 Search library" value="${esc(ViewsModule.resFilters.q)}" oninput="AppController.applyResFilters()">
                <select id="rfType" onchange="AppController.applyResFilters()">
                    <option value="">All types</option>
                    ${Object.entries(ResourceManager.types).map(([k, t]) => `<option value="${k}" ${ViewsModule.resFilters.type === k ? 'selected' : ''}>${t.emoji} ${t.label}</option>`).join('')}
                </select>
                <select id="rfTag" onchange="AppController.applyResFilters()">
                    <option value="">All tags</option>
                    ${allTags.map(t => `<option value="${esc(t)}" ${ViewsModule.resFilters.tag === t ? 'selected' : ''}>#${esc(t)}</option>`).join('')}
                </select>
                <select id="rfSort" onchange="AppController.applyResFilters()">
                    <option value="smart" ${ViewsModule.resFilters.sort === 'smart' ? 'selected' : ''}>📌 Pinned &amp; newest</option>
                    <option value="helpful" ${ViewsModule.resFilters.sort === 'helpful' ? 'selected' : ''}>👍 Most helpful</option>
                    <option value="newest" ${ViewsModule.resFilters.sort === 'newest' ? 'selected' : ''}>🆕 Newest</option>
                    <option value="oldest" ${ViewsModule.resFilters.sort === 'oldest' ? 'selected' : ''}>🕰️ Oldest</option>
                </select>
                <label class="inline-check"><input type="checkbox" id="rfHide" ${ViewsModule.resFilters.hideDone ? 'checked' : ''} onchange="AppController.applyResFilters()"> Hide finished</label>
            </div>` : ''}

            <div class="res-grid" id="resGrid">${ViewsModule.resourceCardsHtml(course)}</div>`;
    },

    resourceCardsHtml: (course) => {
        const esc = Utils.esc;
        const me = AuthModule.getCurrentUser();
        const isOwner = course.userId === me.uid;
        const shared = ViewsModule.isShared();
        const memberSet = new Set(course.memberIds || [course.userId]);
        const f = ViewsModule.resFilters;
        const q = (f.q || '').trim().toLowerCase();
        const ms = (t) => (t && t.toMillis ? t.toMillis() : new Date(t || 0).getTime());
        const likes = (r) => Object.keys(r.likes || {}).length;

        let list = UIModule.resources.filter(r => {
            if (f.type && r.type !== f.type) return false;
            if (f.tag && !(r.tags || []).includes(f.tag)) return false;
            if (f.hideDone && r.doneBy && r.doneBy[me.uid]) return false;
            if (q && !((r.title || '') + ' ' + (r.description || '') + ' ' + (r.tags || []).join(' ') + ' ' + ResourceManager.hostname(r.url)).toLowerCase().includes(q)) return false;
            return true;
        });
        list.sort((a, b) => {
            if (f.sort === 'helpful') return likes(b) - likes(a) || ms(b.createdAt) - ms(a.createdAt);
            if (f.sort === 'oldest') return ms(a.createdAt) - ms(b.createdAt);
            if (f.sort === 'newest') return ms(b.createdAt) - ms(a.createdAt);
            return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || ms(b.createdAt) - ms(a.createdAt);
        });

        if (!UIModule.resources.length) {
            return '<div class="empty-state"><div class="empty-emoji">📚</div><p>No resources yet. Share the best video, article or doc you found - your future self (and your friends) will thank you!</p></div>';
        }
        if (!list.length) return '<p class="muted">Nothing matches those filters 🔍</p>';

        return list.map(r => {
            const url = Utils.safeUrl(r.url) || '#';
            const type = ResourceManager.types[r.type] || ResourceManager.types.link;
            const thumb = ResourceManager.thumb(url);
            const fav = ResourceManager.favicon(url);
            const liked = !!(r.likes && r.likes[me.uid]);
            const done = !!(r.doneBy && r.doneBy[me.uid]);
            const doneCount = Object.keys(r.doneBy || {}).filter(u => memberSet.has(u)).length;
            const mine = r.userId === me.uid;
            const canEdit = mine || isOwner;
            const key = 'resource:' + r.id;
            const open = !!UIModule.openThreads[key];
            const media = thumb
                ? `<img src="${esc(thumb)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.classList.add('no-img')">`
                : `<div class="res-fav">${fav ? `<img src="${esc(fav)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}<span>${type.emoji}</span></div>`;
            return `
            <div class="res-card ${r.pinned ? 'pinned' : ''} ${done ? 'is-done' : ''}">
                <a class="res-media" href="${esc(url)}" target="_blank" rel="noopener noreferrer" title="Open">${media}</a>
                <div class="res-body">
                    <div class="res-meta">
                        <span class="tag">${type.emoji} ${type.label}</span>
                        ${r.pinned ? '<span class="tag tag-pin">📌 Pinned</span>' : ''}
                        <small>${esc(ResourceManager.hostname(url))}</small>
                    </div>
                    <a class="res-title" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(r.title)}</a>
                    ${r.description ? `<p class="res-desc">${esc(r.description)}</p>` : ''}
                    ${(r.tags || []).length ? `<div class="res-tags">${r.tags.map(t => `<button class="tag tag-btn" onclick="AppController.filterByTag('${esc(t)}')">#${esc(t)}</button>`).join('')}</div>` : ''}
                    <div class="res-by">${esc(ViewsModule.nameOf(r.userId))} &middot; ${Utils.timeAgo(r.createdAt)}${shared ? ` &middot; ✅ ${doneCount}/${memberSet.size} finished` : ''}</div>
                    <div class="res-actions">
                        <button class="chip-btn ${liked ? 'on' : ''}" title="Helpful" onclick="AppController.toggleResLike('${r.id}')">👍 ${likes(r) || ''}</button>
                        <button class="chip-btn ${done ? 'on' : ''}" onclick="AppController.toggleResDone('${r.id}')">${done ? '✅ Done' : '☐ Mark done'}</button>
                        ${shared ? `<button class="chip-btn ${open ? 'on' : ''}" onclick="AppController.toggleThread('resource','${r.id}')">💬 ${ChatManager.count('resource', r.id) || ''}</button>` : ''}
                        <button class="chip-btn" title="Add to my checklist" onclick="AppController.resToChecklist('${r.id}')">➕ Checklist</button>
                        <button class="chip-btn" title="Log a study session" onclick="AppController.resToLog('${r.id}')">📝 Log</button>
                        <button class="chip-btn" title="Copy link" onclick="AppController.copyResLink('${r.id}')">📋</button>
                        ${isOwner ? `<button class="chip-btn ${r.pinned ? 'on' : ''}" title="${r.pinned ? 'Unpin' : 'Pin to top'}" onclick="AppController.togglePin('${r.id}')">📌</button>` : ''}
                        ${canEdit ? `<button class="chip-btn" title="Edit" onclick="AppController.editResource('${r.id}')">✏️</button>
                        <button class="chip-btn" title="Delete" onclick="AppController.deleteResource('${r.id}')">🗑</button>` : ''}
                    </div>
                    ${open ? ViewsModule.threadHtml('resource', r.id) : ''}
                </div>
            </div>`;
        }).join('');
    },

    // =====================================================================
    // Flashcards
    // =====================================================================
    flashcardsHtml: (course) => {
        const esc = Utils.esc;
        const cards = UIModule.flashcards;
        const due = cards.filter(FlashcardManager.isDue);
        const mastered = cards.filter(c => (c.box || 0) >= 4).length;
        const sorted = [...cards].sort((a, b) => (a.due < b.due ? -1 : 1));
        return `
            ${ViewsModule.deniedNotice('flashcards')}
            <div class="form-section">
                <h2>🃏 Flashcards <small class="muted">(spaced repetition)</small></h2>
                <div class="fc-stats">
                    <div><div class="week-num">${due.length}</div><div class="week-lbl">Due today</div></div>
                    <div><div class="week-num">${cards.length}</div><div class="week-lbl">Total cards</div></div>
                    <div><div class="week-num">${mastered}</div><div class="week-lbl">Mastered 🎓</div></div>
                </div>
                <div id="fcSession">${ViewsModule.fcSessionHtml()}</div>
                ${!UIModule.fc ? `<button class="btn btn-primary" ${due.length ? '' : 'disabled'} onclick="AppController.startReview()">${due.length ? 'Start review (' + due.length + ') 🚀' : 'Nothing due - nice! 🎉'}</button>` : ''}
                <p class="muted" style="margin-top:10px">Cards you remember move to longer gaps (1, 3, 7, 16, 35 days); forgotten ones come back sooner. Private to you. In review: <kbd>Space</kbd> flips, <kbd>1</kbd>-<kbd>4</kbd> rates.</p>
            </div>

            <div class="form-section">
                <h2>➕ Add Cards</h2>
                <div class="form-row">
                    <div class="form-group"><label>Front (question)</label><textarea id="fcFront" rows="2" maxlength="300" placeholder="What does a for loop do?"></textarea></div>
                    <div class="form-group"><label>Back (answer)</label><textarea id="fcBack" rows="2" maxlength="1000" placeholder="Repeats a block for each item"></textarea></div>
                </div>
                <button class="btn btn-primary" onclick="AppController.addCard('${course.id}')">Add Card</button>
                <details class="res-form" style="margin-top:14px">
                    <summary>📥 Bulk add (one per line: question :: answer)</summary>
                    <textarea id="fcBulk" rows="5" placeholder="What is a variable? :: A named place to store data&#10;What is a list? :: An ordered collection"></textarea>
                    <button class="btn btn-secondary" style="margin-top:8px" onclick="AppController.bulkAddCards('${course.id}')">Add All</button>
                </details>
            </div>

            ${cards.length ? `
            <div class="form-section">
                <h2>All Cards</h2>
                <div class="table-scroll">
                <table class="metrics-table">
                    <thead><tr><th>Front</th><th>Back</th><th>Box</th><th>Next review</th><th></th></tr></thead>
                    <tbody>
                        ${sorted.map(c => `
                            <tr>
                                <td>${esc(c.front)}</td>
                                <td>${esc(c.back)}</td>
                                <td>${'●'.repeat(c.box || 0) || '○'}</td>
                                <td>${FlashcardManager.isDue(c) ? '<strong>Due</strong>' : Utils.formatDate(c.due)}</td>
                                <td><button class="icon-btn" title="Delete" onclick="AppController.deleteCard('${c.id}')">🗑</button></td>
                            </tr>`).join('')}
                    </tbody>
                </table>
                </div>
            </div>` : ''}`;
    },

    fcSessionHtml: () => {
        const fc = UIModule.fc;
        if (!fc) return '';
        const esc = Utils.esc;
        const card = UIModule.flashcards.find(c => c.id === fc.queue[0]);
        if (!card) {
            return `<div class="fc-done">🎉 Session complete! You reviewed ${fc.reviewed} card${fc.reviewed === 1 ? '' : 's'}.
                <div><button class="btn btn-secondary" style="margin-top:10px" onclick="AppController.endReview()">Close</button></div></div>`;
        }
        const left = fc.queue.length;
        const rate = (r, label, key) => {
            const n = FlashcardManager.schedule(card, r);
            return `<button class="btn fc-${r}" onclick="AppController.rateCard('${r}')">${label}<small>${FlashcardManager.label(n.days)} &middot; ${key}</small></button>`;
        };
        return `
            <div class="fc-card ${fc.showBack ? 'flipped' : ''}" onclick="AppController.flipCard()">
                <div class="fc-count">${left} left</div>
                <div class="fc-side">${fc.showBack ? 'Answer' : 'Question'}</div>
                <div class="fc-text">${esc(fc.showBack ? card.back : card.front)}</div>
                ${fc.showBack ? '' : '<div class="fc-hint">tap to reveal</div>'}
            </div>
            ${fc.showBack ? `<div class="fc-rate">${rate('again', 'Again', '1')}${rate('hard', 'Hard', '2')}${rate('good', 'Good', '3')}${rate('easy', 'Easy', '4')}</div>` : ''}
            <button class="btn btn-secondary btn-sm" onclick="AppController.endReview()">End session</button>`;
    },

    // =====================================================================
    // Journal
    // =====================================================================
    journalHtml: (course) => {
        const esc = Utils.esc;
        const week = Analytics.weekStart(Analytics.today());
        const existing = UIModule.reflections.find(r => r.weekStart === week);
        const a = (existing && existing.answers) || {};
        const mood = existing ? existing.mood : 0;
        const review = Analytics.weekReview(UIModule.myMetrics);
        const weekLabel = (ws) => 'Week of ' + Analytics.parse(ws).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const past = UIModule.reflections.filter(r => r.weekStart !== week);
        const moodEmoji = (v) => (JournalManager.moods.find(m => m.v === v) || {}).emoji || '';

        return `
            ${ViewsModule.deniedNotice('journal')}
            <div class="form-section">
                <h2>📓 ${weekLabel(week)} - Reflection</h2>
                <p class="muted">This week so far: <strong>${review.doneDays}</strong> Done days &middot; <strong>${review.minutes}</strong> minutes. A few honest sentences now = a learning journal you'll love later. Private to you.</p>
                <label>How did this week feel?</label>
                <div class="mood-picker" id="moodPicker">
                    ${JournalManager.moods.map(m => `<button type="button" class="mood-opt ${mood === m.v ? 'selected' : ''}" data-mood="${m.v}" onclick="AppController.pickMood(${m.v})"><span>${m.emoji}</span><small>${m.label}</small></button>`).join('')}
                </div>
                <input type="hidden" id="jMood" value="${mood}">
                ${JournalManager.prompts.map(p => `
                    <div class="form-group full">
                        <label>${p.label}</label>
                        <textarea id="j_${p.key}" rows="2" maxlength="600">${esc(a[p.key] || '')}</textarea>
                    </div>`).join('')}
                <div class="form-group full">
                    <label>✨ Bonus: ${JournalManager.funPromptFor(week)}</label>
                    <textarea id="j_fun" rows="2" maxlength="600">${esc(a.fun || '')}</textarea>
                </div>
                <button class="btn btn-primary" onclick="AppController.saveReflection('${course.id}', '${week}')">${existing ? 'Update Reflection 💾' : 'Save Reflection 📝'}</button>
            </div>

            <div class="form-section">
                <h2>🗂️ Past Reflections</h2>
                ${past.length ? past.map(r => `
                    <details class="journal-entry">
                        <summary>${moodEmoji(r.mood)} ${weekLabel(r.weekStart)}</summary>
                        ${JournalManager.prompts.concat([{ key: 'fun', label: 'Bonus prompt' }]).map(p => (r.answers && r.answers[p.key]) ? `<p><strong>${p.label}</strong><br>${esc(r.answers[p.key])}</p>` : '').join('')}
                    </details>`).join('') : '<p class="muted">Your first reflection will appear here next week 🌱</p>'}
            </div>`;
    },

    // =====================================================================
    // Study Buddy screen
    // =====================================================================
    buddyFilters: { q: '', level: '' },

    renderBuddyScreen: () => {
        const me = AuthModule.getCurrentUser();
        const esc = Utils.esc;
        const profile = ProfileManager.mine();
        const mine = BuddyManager.myPosts();
        const f = ViewsModule.buddyFilters;
        const q = (f.q || '').trim().toLowerCase();
        const sentTo = {};
        BuddyManager.outgoing.forEach(r => { sentTo[r.postId] = r; });
        const owned = (AppController.lastCourses || []).filter(c => c.userId === me.uid);

        const board = BuddyManager.posts.filter(p => p.userId !== me.uid
            && (!f.level || p.level === f.level)
            && (!q || (p.topic + ' ' + p.goal).toLowerCase().includes(q)));

        const statusChip = (s) => ({
            pending: '⏳ Waiting for a reply', accepted: '🎉 Accepted!', invited: '📬 Course invite sent - check your invitations', declined: 'Not this time'
        }[s] || s);

        document.getElementById('app-root').innerHTML = `
            <div class="main-container">
                <div class="header">
                    <div>
                        <h1>🤝 Find a Study Buddy</h1>
                        <span class="user-email">Learning is better together - match with someone who wants to learn the same thing</span>
                    </div>
                    <div class="header-actions">
                        <button class="btn btn-secondary" onclick="AppController.showCourses()">← Back to Courses</button>
                    </div>
                </div>
                <div class="content">
                    ${BuddyManager.denied ? '<div class="today-banner">🔒 Needs the latest security rules: publish <strong>firestore.rules</strong> in Firebase Console → Firestore Database → Rules, then refresh.</div>' : ''}
                    <div class="quote-banner">🔐 Privacy: your post shows only your display name, avatar and what you wrote. Your email is shared only with the person you send a request to - and only if you send one.</div>
                    ${!profile ? '<div class="today-banner">👋 Set up your profile first so buddies see a name instead of nothing. <a href="#" onclick="UIModule.showProfileModal(); return false;">Set up profile</a></div>' : ''}

                    ${BuddyManager.incoming.length ? `
                    <div class="form-section">
                        <h2>📥 Requests for you</h2>
                        ${BuddyManager.incoming.map(r => `
                            <div class="buddy-card">
                                <div><strong>${esc(r.fromAvatar || '🙂')} ${esc(r.fromName)}</strong> wants to learn <strong>${esc(r.topic)}</strong> with you
                                    ${r.message ? `<p class="muted">"${esc(r.message)}"</p>` : ''}
                                    <small class="muted">${statusChip(r.status)} &middot; ${Utils.timeAgo(r.createdAt)}</small></div>
                                <div class="buddy-actions">
                                    ${r.status === 'pending' ? `
                                        <button class="btn btn-primary btn-sm" onclick="AppController.buddyRespond('${r.id}', 'accepted')">Accept ✅</button>
                                        <button class="btn btn-secondary btn-sm" onclick="AppController.buddyRespond('${r.id}', 'declined')">Decline</button>` : ''}
                                    ${r.status === 'accepted' ? `
                                        <button class="btn btn-primary btn-sm" onclick="AppController.buddyCreateCourse('${r.id}')">Create shared course &amp; invite 🚀</button>
                                        ${owned.length ? `<select id="bs_${r.id}" class="inline-select">${owned.map(c => `<option value="${c.id}">${esc(c.courseName)}</option>`).join('')}</select>
                                        <button class="btn btn-secondary btn-sm" onclick="AppController.buddyInviteExisting('${r.id}')">Invite to this course</button>` : ''}` : ''}
                                    <button class="icon-btn" title="Delete" onclick="AppController.buddyDeleteRequest('${r.id}')">🗑</button>
                                </div>
                            </div>`).join('')}
                    </div>` : ''}

                    ${BuddyManager.outgoing.length ? `
                    <div class="form-section">
                        <h2>📤 Your requests</h2>
                        ${BuddyManager.outgoing.map(r => `
                            <div class="buddy-card">
                                <div>For <strong>${esc(r.topic)}</strong> &middot; ${statusChip(r.status)}
                                    <small class="muted"> &middot; ${Utils.timeAgo(r.createdAt)}</small></div>
                                <div class="buddy-actions"><button class="icon-btn" title="Cancel / remove" onclick="AppController.buddyDeleteRequest('${r.id}')">🗑</button></div>
                            </div>`).join('')}
                    </div>` : ''}

                    <div class="form-section">
                        <h2>📣 Post what you want to learn</h2>
                        <div class="form-row">
                            <div class="form-group"><label>Topic *</label><input type="text" id="bpTopic" maxlength="60" placeholder="e.g., Python, Spanish, Guitar"></div>
                            <div class="form-group"><label>Your level</label>
                                <select id="bpLevel">${Object.entries(BuddyManager.levels).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>Goal</label><input type="text" id="bpGoal" maxlength="200" placeholder="e.g., Build a small app in 8 weeks"></div>
                            <div class="form-group"><label>When are you free?</label><input type="text" id="bpAvail" maxlength="80" placeholder="e.g., Evenings, weekends"></div>
                        </div>
                        <button class="btn btn-primary" onclick="AppController.buddyPost()">Post 📣</button>
                        ${mine.length ? `<div class="pending">Your open posts: ${mine.map(p => `<span class="tag">${esc(p.topic)} <a href="#" title="Close post" onclick="AppController.buddyClose('${p.id}'); return false;">✕</a></span>`).join(' ')}</div>` : ''}
                    </div>

                    <div class="form-section">
                        <h2>🔎 Find a buddy</h2>
                        <div class="filter-bar">
                            <input type="search" id="bfQ" placeholder="🔍 Search topics" value="${esc(f.q)}" oninput="AppController.buddyFilter()">
                            <select id="bfLevel" onchange="AppController.buddyFilter()">
                                <option value="">Any level</option>
                                ${Object.entries(BuddyManager.levels).map(([k, v]) => `<option value="${k}" ${f.level === k ? 'selected' : ''}>${v}</option>`).join('')}
                            </select>
                        </div>
                        <div class="res-grid" id="buddyBoard">
                            ${board.length ? board.map(p => {
                                const sent = sentTo[p.id];
                                return `
                                <div class="buddy-post">
                                    <div class="buddy-head"><span class="buddy-avatar">${esc(p.avatar || '🙂')}</span>
                                        <div><strong>${esc(p.displayName)}</strong><br><small class="muted">${Utils.timeAgo(p.createdAt)}</small></div></div>
                                    <h3>${esc(p.topic)}</h3>
                                    <div class="res-meta"><span class="tag">${BuddyManager.levels[p.level] || ''}</span>${p.timezone ? `<span class="tag">🌍 ${esc(p.timezone)}</span>` : ''}</div>
                                    ${p.goal ? `<p class="res-desc">🎯 ${esc(p.goal)}</p>` : ''}
                                    ${p.availability ? `<p class="res-desc">🕒 ${esc(p.availability)}</p>` : ''}
                                    ${sent ? `<div class="tag">${statusChip(sent.status)}</div>` : `
                                    <details class="res-form">
                                        <summary>Say hi 👋</summary>
                                        <textarea id="bm_${p.id}" rows="2" maxlength="300" placeholder="Hi! I'm learning this too - want to team up?"></textarea>
                                        <small class="muted">Sending shares your email with ${esc(p.displayName)}.</small><br>
                                        <button class="btn btn-primary btn-sm" onclick="AppController.buddyRequest('${p.id}')">Send request</button>
                                    </details>`}
                                </div>`;
                            }).join('') : '<p class="muted">No open posts match yet. Be the first - post what you want to learn above! 🌱</p>'}
                        </div>
                    </div>
                </div>
            </div>`;
    }
};

console.log('✓ Views module loaded');
