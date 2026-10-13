/**
 * Milestones - a shared checklist for a goal ("Chapter 1", "Run 5k"...).
 * Everyone in the goal sees everyone's progress, but each person only ticks their own.
 * Collection: milestones/{id} { courseId, userId, title, order, doneBy: { uid: 'YYYY-MM-DD' }, createdAt }
 */

const MilestoneManager = {
    items: [],

    getForCourse: async (courseId) => {
        try {
            const snap = await db.collection('milestones').where('courseId', '==', courseId).get();
            UIModule.denied.milestones = false;
            const ms = (t) => (t && t.toMillis ? t.toMillis() : new Date(t || 0).getTime());
            MilestoneManager.items = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (a.order - b.order) || (ms(a.createdAt) - ms(b.createdAt)));
        } catch (e) {
            console.warn('Could not load milestones:', e.message);
            UIModule.denied.milestones = e.code === 'permission-denied';
            MilestoneManager.items = [];
        }
        return MilestoneManager.items;
    },

    add: async (courseId, titles) => {
        const clean = titles.map(t => String(t || '').trim().slice(0, 120)).filter(Boolean).slice(0, 30);
        if (!clean.length) {
            Utils.showError('Type a milestone first');
            return false;
        }
        const uid = AuthModule.getCurrentUser().uid;
        let order = MilestoneManager.items.reduce((m, i) => Math.max(m, Number(i.order) || 0), -1) + 1;
        if (order + clean.length > 500) {
            Utils.showError('That is a lot of milestones - remove a few first');
            return false;
        }
        try {
            await Promise.all(clean.map(title => db.collection('milestones').add({
                courseId, userId: uid, title, order: order++, doneBy: {}, createdAt: new Date()
            })));
            return true;
        } catch (e) {
            Utils.showError('Could not add milestone: ' + Utils.explain(e));
            return false;
        }
    },

    /** Tick / untick MY progress. Returns true when I just finished the last one. */
    toggle: async (id) => {
        const uid = AuthModule.getCurrentUser().uid;
        const item = MilestoneManager.items.find(m => m.id === id);
        if (!item) return null;
        const done = !!(item.doneBy && item.doneBy[uid]);
        try {
            await db.collection('milestones').doc(id).update({
                ['doneBy.' + uid]: done ? firebase.firestore.FieldValue.delete() : Analytics.today()
            });
            item.doneBy = { ...(item.doneBy || {}) };
            if (done) delete item.doneBy[uid];
            else item.doneBy[uid] = Analytics.today();
            return !done && MilestoneManager.items.every(m => m.doneBy && m.doneBy[uid]);
        } catch (e) {
            Utils.showError('Could not update: ' + Utils.explain(e));
            return null;
        }
    },

    remove: async (id) => {
        try {
            await db.collection('milestones').doc(id).delete();
            MilestoneManager.items = MilestoneManager.items.filter(m => m.id !== id);
            return true;
        } catch (e) {
            Utils.showError(Utils.explain(e));
            return false;
        }
    },

    /** { done, total, pct } for one member */
    progress: (uid) => {
        const total = MilestoneManager.items.length;
        const done = MilestoneManager.items.filter(m => m.doneBy && m.doneBy[uid]).length;
        return { done, total, pct: total ? Math.round(done / total * 100) : 0 };
    }
};

console.log('✓ Milestones module loaded');
