/**
 * Settings Module
 * - Theme (dark mode) and reminder prefs: stored in this browser (localStorage)
 * - Daily goals: stored per user in Firestore (users/{uid}.goals) so they follow you across devices
 */

const SettingsModule = {
    goals: {},
    checklists: {},

    // ---------- Safe localStorage ----------
    read: (key, fallback) => {
        try {
            const v = localStorage.getItem(key);
            return v === null ? fallback : v;
        } catch (e) { return fallback; }
    },
    write: (key, value) => {
        try { localStorage.setItem(key, value); } catch (e) { /* ignore */ }
    },

    // ---------- Theme ----------
    initTheme: () => {
        const saved = SettingsModule.read('lt-theme', null);
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        SettingsModule.applyTheme(saved || (prefersDark ? 'dark' : 'light'));
    },
    applyTheme: (theme) => {
        document.body.classList.toggle('dark', theme === 'dark');
        SettingsModule.write('lt-theme', theme);
        const btn = document.getElementById('themeToggle');
        if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    },
    toggleTheme: () => {
        const next = document.body.classList.contains('dark') ? 'light' : 'dark';
        SettingsModule.applyTheme(next);
        // Charts take their colours from CSS at render time
        if (UIModule.currentCourseId) AppController.openCourse(UIModule.currentCourseId);
    },
    isDark: () => document.body.classList.contains('dark'),

    // ---------- Daily goals (Firestore) ----------
    loadGoals: async () => {
        try {
            const uid = AuthModule.getCurrentUser().uid;
            const doc = await db.collection('users').doc(uid).get();
            const data = doc.exists ? doc.data() : {};
            SettingsModule.goals = data.goals || {};
            SettingsModule.checklists = data.checklists || {};
        } catch (e) {
            console.warn('Could not load goals:', e.message);
            SettingsModule.goals = {};
            SettingsModule.checklists = {};
        }
    },
    getGoal: (courseId) => Number(SettingsModule.goals[courseId]) || 0,
    setGoal: async (courseId, minutes) => {
        const uid = AuthModule.getCurrentUser().uid;
        const value = Math.max(0, parseInt(minutes) || 0);
        try {
            await db.collection('users').doc(uid).set({ goals: { [courseId]: value } }, { merge: true });
            SettingsModule.goals[courseId] = value;
            return true;
        } catch (e) {
            Utils.showError('Could not save goal: ' + e.message);
            return false;
        }
    },

    // ---------- Private learning checklist per course (Firestore: users/{uid}.checklists) ----------
    getChecklist: (courseId) => SettingsModule.checklists[courseId] || [],

    saveChecklist: async (courseId, items) => {
        const uid = AuthModule.getCurrentUser().uid;
        try {
            await db.collection('users').doc(uid).set({ checklists: { [courseId]: items } }, { merge: true });
            SettingsModule.checklists[courseId] = items;
            return true;
        } catch (e) {
            Utils.showError('Could not save checklist: ' + e.message);
            return false;
        }
    },

    addChecklistItem: async (courseId, title) => {
        const clean = (title || '').trim().slice(0, 120);
        if (!clean) return false;
        const items = [...SettingsModule.getChecklist(courseId),
            { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), title: clean, done: false }];
        if (items.length > 60) {
            Utils.showError('That is a lot of topics! Keep it to 60 or fewer.');
            return false;
        }
        return SettingsModule.saveChecklist(courseId, items);
    },

    toggleChecklistItem: async (courseId, itemId) => {
        const items = SettingsModule.getChecklist(courseId).map(i => i.id === itemId ? { ...i, done: !i.done } : i);
        return SettingsModule.saveChecklist(courseId, items);
    },

    removeChecklistItem: async (courseId, itemId) => {
        const items = SettingsModule.getChecklist(courseId).filter(i => i.id !== itemId);
        return SettingsModule.saveChecklist(courseId, items);
    },

    // ---------- Reminders (browser notifications while the app is open) ----------
    reminderTime: () => SettingsModule.read('lt-reminder-time', ''),
    setReminderTime: async (time) => {
        SettingsModule.write('lt-reminder-time', time || '');
        if (!time) {
            Utils.showSuccess('Reminder turned off 🔕');
            return;
        }
        if (!('Notification' in window)) {
            Utils.showError('This browser does not support notifications');
            return;
        }
        let permission = Notification.permission;
        if (permission === 'default') permission = await Notification.requestPermission();
        if (permission === 'granted') {
            Utils.showSuccess('Reminder set for ' + time + ' ⏰ (keep the app open or installed)');
        } else {
            Utils.showError('Notifications are blocked - allow them in your browser settings');
        }
    },
    startReminderLoop: () => {
        if (SettingsModule._timer) return;
        SettingsModule._timer = setInterval(() => {
            const time = SettingsModule.reminderTime();
            if (!time || !('Notification' in window) || Notification.permission !== 'granted') return;
            const now = new Date();
            const hhmm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
            const todayKey = Analytics.today();
            if (hhmm >= time && SettingsModule.read('lt-reminded', '') !== todayKey) {
                // Skip if already logged today in the open course
                if (UIModule.myMetrics && Analytics.hasLoggedToday(UIModule.myMetrics)) return;
                SettingsModule.write('lt-reminded', todayKey);
                new Notification('Learning Tracker 🧠', {
                    body: Fun.pick(Fun.reminders),
                    icon: 'icons/icon-192.png'
                });
            }
        }, 30000);
    }
};

console.log('✓ Settings module loaded');
