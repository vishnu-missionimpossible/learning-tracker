/**
 * Question bank - questions you got stuck on; friends answer in the thread (comments, targetType 'question').
 * Collection: questions/{id} { courseId, userId, title, details, status:'open'|'solved', createdAt, updatedAt }
 */

const QuestionManager = {
    items: [],
    filter: 'all',

    getForCourse: async (courseId) => {
        try {
            const snap = await db.collection('questions').where('courseId', '==', courseId).get();
            UIModule.denied.questions = false;
            const ms = (t) => (t && t.toMillis ? t.toMillis() : new Date(t || 0).getTime());
            QuestionManager.items = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => ms(b.createdAt) - ms(a.createdAt));
        } catch (e) {
            console.warn('Could not load questions:', e.message);
            UIModule.denied.questions = e.code === 'permission-denied';
            QuestionManager.items = [];
        }
        return QuestionManager.items;
    },

    add: async (courseId, title, details) => {
        const t = String(title || '').trim().slice(0, 200);
        if (!t) {
            Utils.showError('Write your question first');
            return false;
        }
        try {
            const doc = {
                courseId,
                userId: AuthModule.getCurrentUser().uid,
                title: t,
                details: String(details || '').trim().slice(0, 1500),
                status: 'open',
                createdAt: new Date(),
                updatedAt: new Date()
            };
            const ref = await db.collection('questions').add(doc);
            QuestionManager.items.unshift({ id: ref.id, ...doc });
            return true;
        } catch (e) {
            Utils.showError('Could not post: ' + Utils.explain(e));
            return false;
        }
    },

    setStatus: async (id, status) => {
        const q = QuestionManager.items.find(x => x.id === id);
        if (!q) return false;
        try {
            await db.collection('questions').doc(id).update({ status, updatedAt: new Date() });
            q.status = status;
            return true;
        } catch (e) {
            Utils.showError(Utils.explain(e));
            return false;
        }
    },

    remove: async (id) => {
        try {
            await db.collection('questions').doc(id).delete();
            QuestionManager.items = QuestionManager.items.filter(q => q.id !== id);
            return true;
        } catch (e) {
            Utils.showError(Utils.explain(e));
            return false;
        }
    }
};

console.log('✓ Q&A module loaded');
