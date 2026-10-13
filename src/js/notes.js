/**
 * Notes library - searchable markdown notes per goal. Text only (no file uploads, so it stays free).
 * Private by default; the author can share a note with everyone in the goal.
 * Collection: notes/{id} { courseId, userId, title, body, tags[], shared, createdAt, updatedAt }
 */

const NoteManager = {
    items: [],
    filters: { q: '', tag: '', scope: 'all' },
    editingId: null,
    openId: null,

    getForCourse: async (courseId) => {
        const uid = AuthModule.getCurrentUser().uid;
        try {
            const [mine, shared] = await Promise.all([
                db.collection('notes').where('userId', '==', uid).where('courseId', '==', courseId).get(),
                db.collection('notes').where('courseId', '==', courseId).where('shared', '==', true).get()
                    .catch(() => ({ docs: [] }))
            ]);
            UIModule.denied.notes = false;
            const map = {};
            [...mine.docs, ...shared.docs].forEach(d => { map[d.id] = { id: d.id, ...d.data() }; });
            const ms = (t) => (t && t.toMillis ? t.toMillis() : new Date(t || 0).getTime());
            NoteManager.items = Object.values(map).sort((a, b) => ms(b.updatedAt) - ms(a.updatedAt));
        } catch (e) {
            console.warn('Could not load notes:', e.message);
            UIModule.denied.notes = e.code === 'permission-denied';
            NoteManager.items = [];
        }
        return NoteManager.items;
    },

    parseTags: (text) => [...new Set(String(text || '').split(',')
        .map(t => t.trim().toLowerCase().replace(/^#/, '').replace(/[^a-z0-9 _-]/g, '').slice(0, 24))
        .filter(Boolean))].slice(0, 6),

    save: async (courseId, form) => {
        const title = String(form.title || '').trim().slice(0, 120);
        if (!title) {
            Utils.showError('Give your note a title');
            return false;
        }
        const fields = {
            title,
            body: String(form.body || '').slice(0, 8000),
            tags: NoteManager.parseTags(form.tags),
            shared: !!form.shared
        };
        try {
            if (NoteManager.editingId) {
                await db.collection('notes').doc(NoteManager.editingId).update({ ...fields, updatedAt: new Date() });
            } else {
                await db.collection('notes').add({
                    ...fields, courseId, userId: AuthModule.getCurrentUser().uid,
                    createdAt: new Date(), updatedAt: new Date()
                });
            }
            NoteManager.editingId = null;
            await NoteManager.getForCourse(courseId);
            return true;
        } catch (e) {
            Utils.showError('Could not save note: ' + Utils.explain(e));
            return false;
        }
    },

    remove: async (id) => {
        try {
            await db.collection('notes').doc(id).delete();
            NoteManager.items = NoteManager.items.filter(n => n.id !== id);
            return true;
        } catch (e) {
            Utils.showError(Utils.explain(e));
            return false;
        }
    },

    visible: () => {
        const me = AuthModule.getCurrentUser().uid;
        const f = NoteManager.filters;
        const q = f.q.trim().toLowerCase();
        return NoteManager.items.filter(n => {
            if (f.scope === 'mine' && n.userId !== me) return false;
            if (f.scope === 'shared' && !(n.shared && n.userId !== me)) return false;
            if (f.tag && !(n.tags || []).includes(f.tag)) return false;
            if (q && !((n.title || '') + ' ' + (n.body || '') + ' ' + (n.tags || []).join(' ')).toLowerCase().includes(q)) return false;
            return true;
        });
    }
};

console.log('✓ Notes module loaded');
