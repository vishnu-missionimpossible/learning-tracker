/**
 * Flashcards Module (spaced repetition, Leitner boxes)
 * Private per user and course (collection: flashcards).
 */

const FlashcardManager = {
    // Days until next review for boxes 0..5
    INTERVALS: [0, 1, 3, 7, 16, 35],

    /** Next state after rating: 'again' | 'hard' | 'good' | 'easy' */
    schedule: (card, rating) => {
        const box = Number(card.box) || 0;
        let nextBox, days;
        if (rating === 'again') {
            nextBox = 1;
            days = 0;
        } else if (rating === 'hard') {
            nextBox = Math.max(1, box);
            days = Math.max(1, Math.ceil(FlashcardManager.INTERVALS[nextBox] / 2));
        } else if (rating === 'good') {
            nextBox = Math.min(5, box + 1);
            days = FlashcardManager.INTERVALS[nextBox];
        } else {
            nextBox = Math.min(5, box + 2);
            days = FlashcardManager.INTERVALS[nextBox];
        }
        return { box: nextBox, due: Analytics.addDays(Analytics.today(), days), days };
    },

    label: (days) => (days === 0 ? '<1d' : days + 'd'),

    isDue: (card) => (card.due || '') <= Analytics.today(),

    getForCourse: async (courseId) => {
        try {
            const uid = AuthModule.getCurrentUser().uid;
            const snap = await db.collection('flashcards')
                .where('userId', '==', uid)
                .where('courseId', '==', courseId)
                .get();
            UIModule.denied.flashcards = false;
            return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (e) {
            console.warn('Could not load flashcards:', e.message);
            UIModule.denied.flashcards = e.code === 'permission-denied';
            return [];
        }
    },

    newCard: (courseId, front, back) => ({
        userId: AuthModule.getCurrentUser().uid,
        courseId,
        front: front.trim().slice(0, 300),
        back: back.trim().slice(0, 1000),
        box: 0,
        due: Analytics.today(),
        reps: 0,
        lapses: 0,
        createdAt: new Date(),
        lastReviewed: null
    }),

    add: async (courseId, front, back) => {
        if (!front.trim() || !back.trim()) {
            Utils.showError('Both sides of the card need some text');
            return false;
        }
        try {
            const card = FlashcardManager.newCard(courseId, front, back);
            const ref = await db.collection('flashcards').add(card);
            UIModule.flashcards.unshift({ id: ref.id, ...card });
            return true;
        } catch (e) {
            Utils.showError('Could not save card: ' + Utils.explain(e));
            return false;
        }
    },

    /** Bulk add: one card per line as "front :: back" (or "front | back") */
    bulkAdd: async (courseId, text) => {
        const cards = [];
        (text || '').split('\n').forEach(line => {
            const m = line.split(/\s*(?:::|\|)\s*/);
            if (m.length >= 2 && m[0].trim() && m.slice(1).join(' | ').trim()) {
                cards.push(FlashcardManager.newCard(courseId, m[0], m.slice(1).join(' | ')));
            }
        });
        if (!cards.length) {
            Utils.showError('Use one card per line like:  question :: answer');
            return 0;
        }
        if (cards.length > 100) {
            Utils.showError('Max 100 cards at a time');
            return 0;
        }
        try {
            const batch = db.batch();
            const created = cards.map(c => {
                const ref = db.collection('flashcards').doc();
                batch.set(ref, c);
                return { id: ref.id, ...c };
            });
            await batch.commit();
            UIModule.flashcards.unshift(...created);
            return created.length;
        } catch (e) {
            Utils.showError('Could not save cards: ' + Utils.explain(e));
            return 0;
        }
    },

    review: async (card, rating) => {
        const next = FlashcardManager.schedule(card, rating);
        const update = {
            box: next.box,
            due: next.due,
            reps: (card.reps || 0) + 1,
            lapses: (card.lapses || 0) + (rating === 'again' ? 1 : 0),
            lastReviewed: new Date()
        };
        try {
            await db.collection('flashcards').doc(card.id).update(update);
            Object.assign(card, update);
            return true;
        } catch (e) {
            Utils.showError('Could not save review: ' + Utils.explain(e));
            return false;
        }
    },

    remove: async (id) => {
        try {
            await db.collection('flashcards').doc(id).delete();
            UIModule.flashcards = UIModule.flashcards.filter(c => c.id !== id);
            return true;
        } catch (e) {
            Utils.showError(Utils.explain(e));
            return false;
        }
    }
};

console.log('✓ Flashcard module loaded');
