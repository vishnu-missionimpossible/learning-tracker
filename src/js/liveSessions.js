/**
 * Live study sessions - "who is working right now?" plus a shared countdown.
 * Collection: sessions/{courseId}_{uid} { courseId, userId, label, startedAt(ms), endsAt(ms) }
 * A session counts as live only while endsAt is in the future, so no clean-up or heartbeat is needed
 * (cheap on the free plan: one tiny write per session, one real-time listener per open goal).
 */

const LiveSessions = {
    unsub: null,
    courseId: null,
    items: [],
    timer: null,
    notified: {},
    MAX_MINUTES: 240,

    subscribe: (courseId) => {
        LiveSessions.stop();
        LiveSessions.courseId = courseId;
        UIModule.denied.live = false;
        LiveSessions.unsub = db.collection('sessions').where('courseId', '==', courseId).onSnapshot(
            (snap) => {
                LiveSessions.items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                AppController.refreshLive();
            },
            (err) => {
                console.warn('Live sessions listener error:', err.message);
                UIModule.denied.live = err.code === 'permission-denied';
            }
        );
        LiveSessions.timer = setInterval(LiveSessions.tick, 1000);
    },

    stop: () => {
        if (LiveSessions.unsub) LiveSessions.unsub();
        clearInterval(LiveSessions.timer);
        LiveSessions.unsub = null;
        LiveSessions.timer = null;
        LiveSessions.items = [];
        LiveSessions.courseId = null;
    },

    docId: (courseId) => courseId + '_' + AuthModule.getCurrentUser().uid,

    live: () => LiveSessions.items.filter(s => Number(s.endsAt) > Date.now())
        .sort((a, b) => a.endsAt - b.endsAt),

    mine: () => LiveSessions.live().find(s => s.userId === AuthModule.getCurrentUser().uid) || null,

    fmt: (ms) => {
        const t = Math.max(0, Math.ceil(ms / 1000));
        const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
        return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0');
    },

    /** Every second: update countdown labels, announce my own finished session */
    tick: () => {
        document.querySelectorAll('[data-ends]').forEach(el => {
            const left = Number(el.getAttribute('data-ends')) - Date.now();
            el.textContent = left > 0 ? LiveSessions.fmt(left) : 'done';
        });
        const me = AuthModule.getCurrentUser();
        if (!me) return;
        let changed = false;
        LiveSessions.items.forEach(s => {
            if (Number(s.endsAt) <= Date.now() && !LiveSessions.notified[s.id + s.endsAt]) {
                LiveSessions.notified[s.id + s.endsAt] = true;
                changed = true;
                if (s.userId === me.uid && Date.now() - s.endsAt < 60000) {
                    Utils.showSuccess('⏰ Session finished! Nice work - log it in the Log tab 🎉');
                    Fun.confetti();
                }
            }
        });
        if (changed) AppController.refreshLive();
    },

    start: async (courseId, label, minutes, startedAt) => {
        const mins = Math.min(LiveSessions.MAX_MINUTES, Math.max(1, Math.floor(Number(minutes) || 0)));
        const now = Math.floor(startedAt || Date.now());
        try {
            await db.collection('sessions').doc(LiveSessions.docId(courseId)).set({
                courseId,
                userId: AuthModule.getCurrentUser().uid,
                label: String(label || '').trim().slice(0, 80),
                startedAt: now,
                endsAt: now + mins * 60000
            });
            return true;
        } catch (e) {
            Utils.showError('Could not start session: ' + Utils.explain(e));
            return false;
        }
    },

    /** Join a friend's countdown: same end time */
    join: async (courseId, other) => {
        const left = Number(other.endsAt) - Date.now();
        if (left < 30000) {
            Utils.showError('That session is almost over');
            return false;
        }
        const now = Math.floor(Date.now());
        try {
            await db.collection('sessions').doc(LiveSessions.docId(courseId)).set({
                courseId,
                userId: AuthModule.getCurrentUser().uid,
                label: String(other.label || '').slice(0, 80),
                startedAt: now,
                endsAt: Math.floor(other.endsAt)
            });
            return true;
        } catch (e) {
            Utils.showError('Could not join: ' + Utils.explain(e));
            return false;
        }
    },

    /** End my session; resolves to the minutes actually spent */
    end: async (courseId) => {
        const mine = LiveSessions.mine();
        const minutes = mine ? Math.max(1, Math.round((Math.min(Date.now(), mine.endsAt) - mine.startedAt) / 60000)) : 0;
        try {
            await db.collection('sessions').doc(LiveSessions.docId(courseId)).delete();
            LiveSessions.items = LiveSessions.items.filter(s => s.userId !== AuthModule.getCurrentUser().uid);
            return minutes;
        } catch (e) {
            Utils.showError(Utils.explain(e));
            return 0;
        }
    }
};

console.log('✓ Live sessions module loaded');
