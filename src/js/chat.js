/**
 * Chat / Comments Module
 * Real-time comments for a course (collection: comments).
 * targetType: 'course' (group chat) | 'entry' (a log entry) | 'resource' (a library item)
 */

const ChatManager = {
    unsub: null,
    courseId: null,
    comments: [],

    /** Start (or restart) the live listener for a course */
    subscribe: (courseId, onChange) => {
        ChatManager.stop();
        ChatManager.courseId = courseId;
        ChatManager.comments = [];
        UIModule.denied.chat = false;
        ChatManager.unsub = db.collection('comments').where('courseId', '==', courseId).onSnapshot(
            (snap) => {
                const ms = (t) => (t && t.toMillis ? t.toMillis() : new Date(t || 0).getTime());
                ChatManager.comments = snap.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .sort((a, b) => ms(a.createdAt) - ms(b.createdAt));
                if (onChange) onChange();
            },
            (err) => {
                console.warn('Comments listener error:', err.message);
                UIModule.denied.chat = err.code === 'permission-denied';
            }
        );
    },

    stop: () => {
        if (ChatManager.unsub) ChatManager.unsub();
        ChatManager.unsub = null;
        ChatManager.comments = [];
    },

    forTarget: (type, id) => ChatManager.comments.filter(c => c.targetType === type && c.targetId === id),

    count: (type, id) => ChatManager.forTarget(type, id).length,

    add: async (courseId, type, targetId, text) => {
        const clean = (text || '').trim().slice(0, 500);
        if (!clean) return false;
        try {
            await db.collection('comments').add({
                courseId,
                targetType: type,
                targetId,
                userId: AuthModule.getCurrentUser().uid,
                text: clean,
                createdAt: new Date()
            });
            return true;
        } catch (e) {
            Utils.showError('Could not send: ' + Utils.explain(e));
            return false;
        }
    },

    remove: async (id) => {
        try {
            await db.collection('comments').doc(id).delete();
            return true;
        } catch (e) {
            Utils.showError(Utils.explain(e));
            return false;
        }
    }
};

console.log('✓ Chat module loaded');
