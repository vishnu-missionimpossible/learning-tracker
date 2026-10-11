/**
 * Journal Module - weekly reflection prompts
 * Private per user, course and week (collection: reflections).
 * Document id: {uid}_{courseId}_{weekStart}
 */

const JournalManager = {
    prompts: [
        { key: 'win', label: 'What was your biggest win this week? 🏆' },
        { key: 'hard', label: 'What was hard or confusing? 🤯' },
        { key: 'next', label: 'What will you focus on next week? 🎯' }
    ],

    funPrompts: [
        'If this week of learning were a movie, what would its title be? 🎬',
        'Which concept would you explain to a 5-year-old, and how? 🧸',
        'What did you learn that surprised you? 😲',
        'What would you tell yourself on day one of this course? 💌',
        'Which small habit helped you most this week? 🌱',
        'What is one question you still want answered? ❓',
        'Who or what inspired you to keep going this week? ✨',
        'If you could re-do one study session, what would you change? 🔄'
    ],

    moods: [
        { v: 1, emoji: '😫', label: 'Tough' },
        { v: 2, emoji: '😕', label: 'Meh' },
        { v: 3, emoji: '🙂', label: 'Okay' },
        { v: 4, emoji: '😄', label: 'Good' },
        { v: 5, emoji: '🤩', label: 'Amazing' }
    ],

    /** A rotating fun prompt, same all week */
    funPromptFor: (weekStart) => {
        const n = Math.floor(Analytics.parse(weekStart).getTime() / (7 * 86400000));
        return JournalManager.funPrompts[n % JournalManager.funPrompts.length];
    },

    docId: (courseId, weekStart) => AuthModule.getCurrentUser().uid + '_' + courseId + '_' + weekStart,

    getForCourse: async (courseId) => {
        try {
            const uid = AuthModule.getCurrentUser().uid;
            const snap = await db.collection('reflections')
                .where('userId', '==', uid)
                .where('courseId', '==', courseId)
                .get();
            UIModule.denied.journal = false;
            return snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1));
        } catch (e) {
            console.warn('Could not load reflections:', e.message);
            UIModule.denied.journal = e.code === 'permission-denied';
            return [];
        }
    },

    save: async (courseId, weekStart, mood, answers) => {
        const clean = {};
        ['win', 'hard', 'next', 'fun'].forEach(k => { clean[k] = (answers[k] || '').trim().slice(0, 600); });
        if (!mood && !Object.values(clean).some(Boolean)) {
            Utils.showError('Write at least one answer or pick a mood');
            return false;
        }
        const id = JournalManager.docId(courseId, weekStart);
        const existing = UIModule.reflections.find(r => r.id === id);
        const doc = {
            userId: AuthModule.getCurrentUser().uid,
            courseId,
            weekStart,
            mood: Number(mood) || 0,
            answers: clean,
            createdAt: existing ? existing.createdAt : new Date(),
            updatedAt: new Date()
        };
        try {
            await db.collection('reflections').doc(id).set(doc);
            UIModule.reflections = [{ id, ...doc }, ...UIModule.reflections.filter(r => r.id !== id)]
                .sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1));
            return true;
        } catch (e) {
            Utils.showError('Could not save reflection: ' + Utils.explain(e));
            return false;
        }
    }
};

console.log('✓ Journal module loaded');
