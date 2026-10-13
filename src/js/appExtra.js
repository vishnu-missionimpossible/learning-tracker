/**
 * App Controller extensions
 * Actions for comments/chat, resource library, flashcards, journal and study buddies.
 * Loaded after app.js and merged into AppController.
 */

Object.assign(AppController, {
    lastCourses: [],

    // =====================================================================
    // Comments & group chat
    // =====================================================================
    /** Re-render everything that shows comments, keeping typed text and focus */
    rerenderThreads: () => {
        const course = UIModule.currentCourse;
        if (!course || !UIModule.currentCourseId) return;
        const values = {};
        let focusId = null;
        document.querySelectorAll('.thread-input').forEach(el => {
            if (el.value) values[el.id] = el.value;
            if (document.activeElement === el) focusId = el.id;
        });

        UIModule.refreshHistory();
        const grid = document.getElementById('resGrid');
        if (grid) grid.innerHTML = ViewsModule.resourceCardsHtml(course);
        const qa = document.getElementById('qaList');
        if (qa) qa.innerHTML = ViewsModule.questionListHtml(course);
        const chat = document.getElementById('courseChat');
        if (chat) {
            chat.innerHTML = ViewsModule.threadHtml('course', course.id, true);
            const list = chat.querySelector('.chat-list');
            if (list) list.scrollTop = list.scrollHeight;
        }

        Object.keys(values).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = values[id];
        });
        if (focusId) {
            const el = document.getElementById(focusId);
            if (el) el.focus();
        }
    },

    onChatChange: () => AppController.rerenderThreads(),

    toggleThread: (type, id) => {
        const key = type + ':' + id;
        UIModule.openThreads[key] = !UIModule.openThreads[key];
        AppController.rerenderThreads();
        if (UIModule.openThreads[key]) {
            const input = document.getElementById(ViewsModule.threadId(type, id));
            if (input) input.focus();
        }
    },

    sendComment: async (type, targetId) => {
        const input = document.getElementById(ViewsModule.threadId(type, targetId));
        if (!input) return;
        const text = input.value;
        if (!text.trim()) return;
        input.value = '';
        const ok = await ChatManager.add(UIModule.currentCourse.id, type, targetId, text);
        if (!ok) input.value = text;
    },

    deleteComment: async (id) => {
        await ChatManager.remove(id);
    },

    // =====================================================================
    // Resource library
    // =====================================================================
    refreshLibrary: () => {
        const tab = document.getElementById('tab-library');
        if (!tab) return;
        // Keep a half-typed form
        const ids = ['resUrl', 'resTitle', 'resType', 'resTags', 'resDesc'];
        const saved = {};
        ids.forEach(id => { const el = document.getElementById(id); if (el) saved[id] = el.value; });
        const wasOpen = tab.querySelector('details.res-form') && tab.querySelector('details.res-form').open;

        tab.innerHTML = ViewsModule.libraryHtml(UIModule.currentCourse);

        if (!UIModule.editingResourceId) {
            ids.forEach(id => { const el = document.getElementById(id); if (el && saved[id] !== undefined) el.value = saved[id]; });
            const d = tab.querySelector('details.res-form');
            if (d && wasOpen) d.open = true;
        }
    },

    autoDetectResource: () => {
        const url = Utils.safeUrl(document.getElementById('resUrl').value);
        const select = document.getElementById('resType');
        if (url && select && !select.value) select.value = ResourceManager.detect(url);
    },

    saveResource: async (courseId) => {
        const form = {
            url: document.getElementById('resUrl').value,
            title: document.getElementById('resTitle').value,
            type: document.getElementById('resType').value,
            tags: document.getElementById('resTags').value,
            description: document.getElementById('resDesc').value
        };
        const editingId = UIModule.editingResourceId;
        const ok = editingId ? await ResourceManager.update(editingId, form) : await ResourceManager.add(courseId, form);
        if (!ok) return;
        UIModule.editingResourceId = null;
        ['resUrl', 'resTitle', 'resType', 'resTags', 'resDesc'].forEach(id => { document.getElementById(id).value = ''; });
        Utils.showSuccess(editingId ? 'Resource updated ✨' : Fun.pick(['Resource shared! Knowledge is better when shared 📚', 'Nice find! Your friends will love it 🎁', 'Added to the library 🏛️']));
        AppController.refreshLibrary();
    },

    editResource: (id) => {
        UIModule.editingResourceId = id;
        AppController.refreshLibrary();
        const el = document.getElementById('resUrl');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },

    cancelResourceEdit: () => {
        UIModule.editingResourceId = null;
        AppController.refreshLibrary();
    },

    deleteResource: async (id) => {
        if (!confirm('Delete this resource for everyone?')) return;
        if (await ResourceManager.remove(id)) AppController.refreshLibrary();
    },

    toggleResLike: async (id) => {
        if ((await ResourceManager.toggleMap(id, 'likes')) !== undefined) AppController.refreshLibrary();
    },

    toggleResDone: async (id) => {
        const on = await ResourceManager.toggleMap(id, 'doneBy');
        if (on !== undefined) {
            AppController.refreshLibrary();
            if (on) Utils.showSuccess(Fun.pick(['Finished! One more brick in the wall 🧱', 'Ticked off! Look at you go ✅']));
        }
    },

    togglePin: async (id) => {
        const r = UIModule.resources.find(x => x.id === id);
        if (r && await ResourceManager.setPinned(id, !r.pinned)) AppController.refreshLibrary();
    },

    applyResFilters: () => {
        const val = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
        const hide = document.getElementById('rfHide');
        ViewsModule.resFilters = {
            q: val('rfQ'), type: val('rfType'), tag: val('rfTag'), sort: val('rfSort') || 'smart',
            hideDone: !!(hide && hide.checked)
        };
        const grid = document.getElementById('resGrid');
        if (grid) grid.innerHTML = ViewsModule.resourceCardsHtml(UIModule.currentCourse);
    },

    filterByTag: (tag) => {
        ViewsModule.resFilters.tag = tag;
        AppController.refreshLibrary();
    },

    resToChecklist: async (id) => {
        const r = UIModule.resources.find(x => x.id === id);
        if (!r) return;
        if (await SettingsModule.addChecklistItem(UIModule.currentCourse.id, r.title)) {
            UIModule.refreshChecklist(UIModule.currentCourse.id);
            Utils.showSuccess('Added to your checklist ✅');
        }
    },

    resToLog: (id) => {
        const r = UIModule.resources.find(x => x.id === id);
        if (!r) return;
        UIModule.switchTab('log');
        document.getElementById('metricTopic').value = r.title.slice(0, 100);
        document.getElementById('metricNotes').value = r.url;
        document.getElementById('logForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
    },

    copyResLink: async (id) => {
        const r = UIModule.resources.find(x => x.id === id);
        if (!r) return;
        try {
            await navigator.clipboard.writeText(r.url);
            Utils.showSuccess('Link copied 📋');
        } catch (e) {
            window.prompt('Copy this link:', r.url);
        }
    },

    // =====================================================================
    // Flashcards
    // =====================================================================
    refreshCards: () => {
        const tab = document.getElementById('tab-cards');
        if (!tab) return;
        const ids = ['fcFront', 'fcBack', 'fcBulk'];
        const saved = {};
        ids.forEach(id => { const el = document.getElementById(id); if (el) saved[id] = el.value; });
        tab.innerHTML = ViewsModule.flashcardsHtml(UIModule.currentCourse);
        ids.forEach(id => { const el = document.getElementById(id); if (el && saved[id]) el.value = saved[id]; });
    },

    addCard: async (courseId) => {
        const front = document.getElementById('fcFront').value;
        const back = document.getElementById('fcBack').value;
        if (await FlashcardManager.add(courseId, front, back)) {
            document.getElementById('fcFront').value = '';
            document.getElementById('fcBack').value = '';
            Utils.showSuccess('Card added 🃏');
            AppController.refreshCards();
        }
    },

    bulkAddCards: async (courseId) => {
        const n = await FlashcardManager.bulkAdd(courseId, document.getElementById('fcBulk').value);
        if (n) {
            document.getElementById('fcBulk').value = '';
            Utils.showSuccess(n + ' cards added 🃏');
            AppController.refreshCards();
        }
    },

    deleteCard: async (id) => {
        if (!confirm('Delete this card?')) return;
        if (await FlashcardManager.remove(id)) AppController.refreshCards();
    },

    entryToCard: (metricId) => {
        const m = UIModule.allMetrics.find(x => x.id === metricId);
        if (!m) return;
        UIModule.switchTab('cards');
        document.getElementById('fcFront').value = m.topic ? 'What did I learn about: ' + m.topic + '?' : '';
        document.getElementById('fcBack').value = m.notes || '';
        document.getElementById('fcFront').scrollIntoView({ behavior: 'smooth', block: 'center' });
    },

    startReview: () => {
        const due = UIModule.flashcards.filter(FlashcardManager.isDue).map(c => c.id);
        for (let i = due.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [due[i], due[j]] = [due[j], due[i]];
        }
        if (!due.length) return;
        UIModule.fc = { queue: due, showBack: false, reviewed: 0 };
        AppController.refreshCards();
    },

    flipCard: () => {
        if (!UIModule.fc || !UIModule.fc.queue.length) return;
        UIModule.fc.showBack = !UIModule.fc.showBack;
        document.getElementById('fcSession').innerHTML = ViewsModule.fcSessionHtml();
    },

    rateCard: async (rating) => {
        const fc = UIModule.fc;
        if (!fc || !fc.showBack || fc.busy) return;
        const card = UIModule.flashcards.find(c => c.id === fc.queue[0]);
        if (!card) return;
        fc.busy = true;
        const ok = await FlashcardManager.review(card, rating);
        fc.busy = false;
        if (!ok) return;
        fc.queue.shift();
        fc.reviewed++;
        if (rating === 'again') fc.queue.push(card.id); // see it again before the session ends
        fc.showBack = false;
        if (!fc.queue.length) Fun.confetti();
        document.getElementById('fcSession').innerHTML = ViewsModule.fcSessionHtml();
    },

    endReview: () => {
        UIModule.fc = null;
        AppController.refreshCards();
    },

    // =====================================================================
    // Journal
    // =====================================================================
    pickMood: (v) => {
        document.getElementById('jMood').value = v;
        document.querySelectorAll('.mood-opt').forEach(b => b.classList.toggle('selected', Number(b.dataset.mood) === v));
    },

    saveReflection: async (courseId, weekStart) => {
        const answers = {};
        ['win', 'hard', 'next', 'fun'].forEach(k => { answers[k] = document.getElementById('j_' + k).value; });
        const ok = await JournalManager.save(courseId, weekStart, document.getElementById('jMood').value, answers);
        if (ok) {
            Utils.showSuccess(Fun.pick(['Reflection saved. Future you will love this 📓', 'Journal updated! Self-awareness +10 🧠']));
            const tab = document.getElementById('tab-journal');
            if (tab) tab.innerHTML = ViewsModule.journalHtml(UIModule.currentCourse);
        }
    },

    // =====================================================================
    // Study buddies
    // =====================================================================
    showBuddies: async () => {
        UIModule.currentCourseId = null;
        ChatManager.stop();
        await ProfileManager.load([AuthModule.getCurrentUser().uid]);
        if (!AppController.lastCourses.length) AppController.lastCourses = await CourseManager.getCourses();
        await BuddyManager.load();
        ViewsModule.renderBuddyScreen();
    },

    buddyReload: async () => {
        await BuddyManager.load();
        ViewsModule.renderBuddyScreen();
    },

    buddyPost: async () => {
        const ok = await BuddyManager.createPost({
            topic: document.getElementById('bpTopic').value,
            level: document.getElementById('bpLevel').value,
            goal: document.getElementById('bpGoal').value,
            availability: document.getElementById('bpAvail').value
        });
        if (ok) {
            Utils.showSuccess('Posted! Buddies can find you now 📣');
            AppController.buddyReload();
        }
    },

    buddyClose: async (postId) => {
        if (await BuddyManager.closePost(postId)) AppController.buddyReload();
    },

    buddyFilter: () => {
        ViewsModule.buddyFilters = {
            q: document.getElementById('bfQ').value,
            level: document.getElementById('bfLevel').value
        };
        const q = ViewsModule.buddyFilters.q;
        ViewsModule.renderBuddyScreen();
        const input = document.getElementById('bfQ');
        if (input) { input.focus(); input.setSelectionRange(q.length, q.length); }
    },

    buddyRequest: async (postId) => {
        const post = BuddyManager.posts.find(p => p.id === postId);
        if (!post) return;
        const msg = document.getElementById('bm_' + Utils.domId(postId)).value;
        if (await BuddyManager.sendRequest(post, msg)) {
            Utils.showSuccess('Request sent! Fingers crossed 🤞');
            AppController.buddyReload();
        }
    },

    buddyRespond: async (reqId, status) => {
        if (await BuddyManager.setStatus(reqId, status)) {
            if (status === 'accepted') Utils.showSuccess('Accepted! Now set up a shared course below 🎉');
            AppController.buddyReload();
        }
    },

    buddyDeleteRequest: async (reqId) => {
        if (!confirm('Remove this request?')) return;
        if (await BuddyManager.deleteRequest(reqId)) AppController.buddyReload();
    },

    buddyCreateCourse: async (reqId) => {
        const req = BuddyManager.incoming.find(r => r.id === reqId);
        if (!req) return;
        try {
            const course = await CourseManager.createCourse({
                courseName: req.topic,
                description: 'Study buddies: you & ' + req.fromName,
                startDate: Analytics.today(),
                endDate: ''
            });
            if (!course) return;
            if (await ShareManager.invite(course.id, req.fromEmail)) {
                await BuddyManager.setStatus(reqId, 'invited');
            }
        } catch (e) {
            console.error('Buddy course error:', e);
        }
    },

    buddyInviteExisting: async (reqId) => {
        const req = BuddyManager.incoming.find(r => r.id === reqId);
        const select = document.getElementById('bs_' + Utils.domId(reqId));
        if (!req || !select) return;
        if (await ShareManager.invite(select.value, req.fromEmail)) {
            await BuddyManager.setStatus(reqId, 'invited');
            AppController.buddyReload();
        }
    }
});

// Keyboard shortcuts for flashcard review (Space flips, 1-4 rate)
document.addEventListener('keydown', (e) => {
    if (!UIModule.fc || !UIModule.fc.queue.length) return;
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
    if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        AppController.flipCard();
    } else if (UIModule.fc.showBack && ['1', '2', '3', '4'].includes(e.key)) {
        AppController.rateCard(['again', 'hard', 'good', 'easy'][Number(e.key) - 1]);
    }
});

console.log('✓ App extensions loaded');
