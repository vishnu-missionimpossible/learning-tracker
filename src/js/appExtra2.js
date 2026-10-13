/**
 * App Controller extensions (part 2)
 * Home, Profile, quick log, goal filter, monthly report, milestones, live room, Q&A and notes.
 * Loaded after appExtra.js and merged into AppController.
 */

Object.assign(AppController, {
    lastInvites: [],
    myEntries: [],

    // =====================================================================
    // Home & Profile
    // =====================================================================
    /** Load goals + my entries (+ invitations) for the main screens */
    loadOverview: async (withInvites) => {
        const uid = AuthModule.getCurrentUser().uid;
        UIModule.currentCourseId = null;
        UIModule.activeTab = 'progress';
        ChatManager.stop();
        LiveSessions.stop();
        TimerModule.courseId = null;
        await ProfileManager.load([uid]);
        const [courses, invitations, mine] = await Promise.all([
            CourseManager.getCourses(),
            withInvites ? ShareManager.getInvitations() : Promise.resolve([]),
            MetricsManager.getMine()
        ]);
        const mineIds = new Set(courses.map(c => c.id));
        AppController.lastCourses = courses;
        AppController.myEntries = mine;
        AppController.lastInvites = invitations.filter(c => !mineIds.has(c.id));
        return { courses, invitations: AppController.lastInvites, mine };
    },

    showHome: async () => {
        try {
            const { courses, invitations, mine } = await AppController.loadOverview(true);
            HomeModule.renderHome(courses, invitations, mine);
        } catch (error) {
            console.error('Error loading home:', error);
            Utils.showError('Error loading home');
        }
    },

    showProfile: async () => {
        try {
            const { courses, mine } = await AppController.loadOverview(false);
            HomeModule.renderProfile(courses, mine);
        } catch (error) {
            console.error('Error loading profile:', error);
            Utils.showError('Error loading profile');
        }
    },

    setGoalFilter: (cat) => {
        UIModule.goalFilter = cat;
        UIModule.renderCoursesScreen(AppController.lastCourses, AppController.lastInvites);
    },

    sendResetToMe: async () => {
        const email = AuthModule.getCurrentUser().email;
        await AuthModule.resetPassword(email);
    },

    downloadMyData: () => {
        const me = AuthModule.getCurrentUser();
        const live = new Set(AppController.lastCourses.map(c => c.id));
        const data = {
            exportedAt: new Date().toISOString(),
            profile: ProfileManager.mine() ? { displayName: ProfileManager.mine().displayName, avatar: ProfileManager.mine().avatar, bio: ProfileManager.mine().bio || '' } : null,
            goals: AppController.lastCourses.map(c => ({
                id: c.id, name: c.courseName, category: Categories.key(c), description: c.description,
                startDate: c.startDate, endDate: c.endDate || null, owner: c.userId === me.uid
            })),
            entries: AppController.myEntries.filter(m => live.has(m.courseId)).map(m => ({
                goalId: m.courseId, date: m.date, status: m.status, minutes: m.duration,
                topic: m.topic, notes: m.notes, value: m.value || null, unit: m.unit || null
            }))
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'my-learning-tracker-data.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        Utils.showSuccess('Your data has been downloaded 📥');
    },

    // =====================================================================
    // Quick log (from Home)
    // =====================================================================
    quickLog: (courseId) => {
        const course = AppController.lastCourses.find(c => c.id === courseId);
        if (course) HomeModule.quickLogModal(course);
    },

    submitQuickLog: async (courseId) => {
        const course = AppController.lastCourses.find(c => c.id === courseId);
        if (!course) return;
        const val = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
        try {
            const created = await MetricsManager.addMetric({
                courseId,
                date: Analytics.today(),
                status: val('qlStatus') || 'Done',
                duration: val('qlDuration'),
                topic: val('qlTopic'),
                notes: val('qlNotes'),
                value: val('qlValue'),
                unit: val('qlUnit'),
                goal: course,
                stay: true
            });
            if (!created) return;
            const modal = document.getElementById('quickLogModal');
            if (modal) modal.remove();
            AppController.showHome();
        } catch (error) {
            console.error('Quick log error:', error);
        }
    },

    // =====================================================================
    // Monthly report card
    // =====================================================================
    openAllReport: async () => {
        if (!AppController.myEntries.length) {
            AppController.myEntries = await MetricsManager.getMine();
        }
        const live = new Set(AppController.lastCourses.map(c => c.id));
        ReportModule.open({
            type: 'all',
            metrics: AppController.myEntries.filter(m => live.has(m.courseId)),
            goals: AppController.lastCourses
        });
    },

    openGoalReport: () => {
        const course = UIModule.currentCourse;
        if (!course) return;
        ReportModule.open({ type: 'goal', course, metrics: UIModule.myMetrics || [] });
    },

    reportMonth: (value) => {
        if (/^\d{4}-\d{2}$/.test(value)) {
            ReportModule.month = value;
            ReportModule.render();
        }
    },

    printReport: () => {
        document.body.classList.add('printing-report');
        const done = () => document.body.classList.remove('printing-report');
        window.onafterprint = done;
        window.print();
        setTimeout(done, 1500);
    },

    closeReport: () => {
        const el = document.getElementById('reportModal');
        if (el) el.remove();
    },

    // =====================================================================
    // Milestones
    // =====================================================================
    refreshMilestones: () => {
        const course = UIModule.currentCourse;
        const el = document.getElementById('tab-milestones');
        if (course && el) el.innerHTML = ViewsModule.milestonesHtml(course);
    },

    addMilestone: async (courseId) => {
        const input = document.getElementById('msInput');
        if (!input) return;
        if (await MilestoneManager.add(courseId, [input.value])) {
            await MilestoneManager.getForCourse(courseId);
            AppController.refreshMilestones();
            const again = document.getElementById('msInput');
            if (again) again.focus();
        }
    },

    bulkMilestones: async (courseId) => {
        const box = document.getElementById('msBulk');
        if (!box) return;
        if (await MilestoneManager.add(courseId, box.value.split('\n'))) {
            await MilestoneManager.getForCourse(courseId);
            AppController.refreshMilestones();
        }
    },

    toggleMilestone: async (id) => {
        const finishedAll = await MilestoneManager.toggle(id);
        if (finishedAll === null) {
            AppController.refreshMilestones();
            return;
        }
        if (finishedAll) {
            Fun.confetti();
            Utils.showSuccess('🏁 Every milestone complete - legendary! 🎉');
        }
        AppController.refreshMilestones();
    },

    deleteMilestone: async (id) => {
        if (!confirm('Remove this milestone?')) return;
        if (await MilestoneManager.remove(id)) AppController.refreshMilestones();
    },

    // =====================================================================
    // Live room
    // =====================================================================
    refreshLive: () => {
        const course = UIModule.currentCourse;
        if (!course || LiveSessions.courseId !== course.id) return;
        const banner = document.getElementById('liveBanner');
        if (banner) banner.innerHTML = ViewsModule.liveBannerHtml();
        const box = document.getElementById('liveBox');
        if (box) {
            const label = document.getElementById('liveLabel');
            const mins = document.getElementById('liveMinutes');
            const keep = { label: label ? label.value : '', mins: mins ? mins.value : '' };
            const hadFocus = label && document.activeElement === label;
            box.innerHTML = ViewsModule.liveHtml(course);
            const l2 = document.getElementById('liveLabel');
            const m2 = document.getElementById('liveMinutes');
            if (l2) { l2.value = keep.label; if (hadFocus) l2.focus(); }
            if (m2 && keep.mins) m2.value = keep.mins;
        }
    },

    liveStart: async (courseId) => {
        const label = (document.getElementById('liveLabel') || {}).value || '';
        const minutes = (document.getElementById('liveMinutes') || {}).value || 25;
        if (await LiveSessions.start(courseId, label, minutes)) {
            Utils.showSuccess('You are live! 🔴 Friends can see you and join in.');
        }
    },

    liveJoin: async (sessionId) => {
        const other = LiveSessions.items.find(s => s.id === sessionId);
        if (!other || !UIModule.currentCourse) return;
        if (await LiveSessions.join(UIModule.currentCourse.id, other)) {
            Utils.showSuccess('Joined! Same countdown, let\'s go 🤝');
        }
    },

    liveEnd: async (courseId) => {
        const minutes = await LiveSessions.end(courseId);
        AppController.refreshLive();
        if (minutes > 0) {
            UIModule.switchTab('log');
            const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
            set('metricStatus', 'Done');
            set('metricDuration', minutes);
            const log = document.getElementById('logForm');
            if (log) log.scrollIntoView({ behavior: 'smooth', block: 'center' });
            Utils.showSuccess('Session ended - ' + minutes + ' min filled in. Add a note and hit Log! ✅');
        }
    },

    // =====================================================================
    // Q&A
    // =====================================================================
    refreshQuestions: () => {
        const course = UIModule.currentCourse;
        const el = document.getElementById('tab-questions');
        if (course && el) el.innerHTML = ViewsModule.questionsHtml(course);
    },

    askQuestion: async (courseId) => {
        const title = (document.getElementById('qTitle') || {}).value;
        const details = (document.getElementById('qDetails') || {}).value;
        if (await QuestionManager.add(courseId, title, details)) {
            Utils.showSuccess('Question posted - friends will see it 📮');
            AppController.refreshQuestions();
        }
    },

    filterQuestions: (f) => {
        QuestionManager.filter = ['all', 'open', 'solved'].includes(f) ? f : 'all';
        AppController.refreshQuestions();
    },

    setQuestionStatus: async (id, status) => {
        if (await QuestionManager.setStatus(id, status === 'solved' ? 'solved' : 'open')) {
            if (status === 'solved') Fun.confetti();
            AppController.refreshQuestions();
        }
    },

    deleteQuestion: async (id) => {
        if (!confirm('Delete this question?')) return;
        if (await QuestionManager.remove(id)) AppController.refreshQuestions();
    },

    // =====================================================================
    // Notes
    // =====================================================================
    refreshNotes: () => {
        const course = UIModule.currentCourse;
        const el = document.getElementById('tab-notes');
        if (course && el) el.innerHTML = ViewsModule.notesHtml(course);
    },

    saveNote: async (courseId) => {
        const val = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
        const shared = !!(document.getElementById('noteShared') || {}).checked;
        if (await NoteManager.save(courseId, { title: val('noteTitle'), body: val('noteBody'), tags: val('noteTags'), shared })) {
            Utils.showSuccess('Note saved 📝');
            AppController.refreshNotes();
        }
    },

    editNote: (id) => {
        const note = NoteManager.items.find(n => n.id === id);
        if (!note || note.userId !== AuthModule.getCurrentUser().uid) return;
        NoteManager.editingId = id;
        AppController.refreshNotes();
        const t = document.getElementById('noteTitle');
        if (t) t.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },

    cancelNoteEdit: () => {
        NoteManager.editingId = null;
        AppController.refreshNotes();
    },

    deleteNote: async (id) => {
        if (!confirm('Delete this note?')) return;
        if (await NoteManager.remove(id)) AppController.refreshNotes();
    },

    filterNotes: () => {
        const val = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
        NoteManager.filters = { q: val('nfQ'), tag: val('nfTag'), scope: val('nfScope') || 'all' };
        const list = document.getElementById('noteList');
        if (list && UIModule.currentCourse) list.innerHTML = ViewsModule.noteListHtml(UIModule.currentCourse);
    }
});

console.log('✓ App controller extensions (part 2) loaded');
