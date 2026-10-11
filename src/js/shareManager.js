/**
 * Share Manager Module
 * Invite friends to a course by email, accept/decline invitations.
 * Data lives on the course document: memberIds, memberEmails, invitedEmails.
 */

const ShareManager = {
    /** Owner invites a friend by email */
    invite: async (courseId, email) => {
        const clean = (email || '').trim().toLowerCase();
        if (!Utils.isValidEmail(clean)) {
            Utils.showError('Please enter a valid email');
            return false;
        }
        const me = AuthModule.getCurrentUser();
        if (clean === (me.email || '').toLowerCase()) {
            Utils.showError("That's you! Invite a friend instead 😄");
            return false;
        }
        try {
            await db.collection('courses').doc(courseId).update({
                invitedEmails: firebase.firestore.FieldValue.arrayUnion(clean),
                memberIds: firebase.firestore.FieldValue.arrayUnion(me.uid),
                updatedAt: new Date()
            });
            Utils.showSuccess(Fun.msg('invite'));
            return true;
        } catch (error) {
            console.error('Invite error:', error);
            Utils.showError('Could not send invite: ' + error.message);
            return false;
        }
    },

    /** Owner cancels a pending invite */
    revoke: async (courseId, email) => {
        try {
            await db.collection('courses').doc(courseId).update({
                invitedEmails: firebase.firestore.FieldValue.arrayRemove(email),
                updatedAt: new Date()
            });
            return true;
        } catch (error) {
            Utils.showError('Error: ' + error.message);
            return false;
        }
    },

    /** Courses I have been invited to but not yet joined */
    getInvitations: async () => {
        try {
            const email = (AuthModule.getCurrentUser().email || '').toLowerCase();
            const snap = await db.collection('courses').where('invitedEmails', 'array-contains', email).get();
            return snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(c => c.isActive !== false);
        } catch (error) {
            console.warn('Could not load invitations (check Firestore rules):', error.message);
            return [];
        }
    },

    accept: async (courseId) => {
        try {
            const me = AuthModule.getCurrentUser();
            const email = (me.email || '').toLowerCase();
            await db.collection('courses').doc(courseId).update({
                memberIds: firebase.firestore.FieldValue.arrayUnion(me.uid),
                ['memberEmails.' + me.uid]: email,
                invitedEmails: firebase.firestore.FieldValue.arrayRemove(email),
                updatedAt: new Date()
            });
            Utils.showSuccess(Fun.msg('joined'));
            Fun.confetti();
            return true;
        } catch (error) {
            console.error('Accept error:', error);
            Utils.showError('Could not join: ' + error.message);
            return false;
        }
    },

    /** Owner starts a challenge: everyone logs `target` Done days within `days` days from today */
    startChallenge: async (courseId, title, target, days) => {
        const t = Math.min(Math.max(parseInt(target) || 0, 1), 365);
        const d = Math.min(Math.max(parseInt(days) || 0, 1), 365);
        if (t > d) {
            Utils.showError('Target days cannot be more than the challenge length');
            return false;
        }
        const startDate = Analytics.today();
        try {
            await db.collection('courses').doc(courseId).update({
                challenge: {
                    title: (title || '').trim().slice(0, 80) || ('Log ' + t + ' days in ' + d),
                    target: t,
                    startDate,
                    endDate: Analytics.addDays(startDate, d - 1)
                },
                updatedAt: new Date()
            });
            Utils.showSuccess(Fun.msg('challenge'));
            Fun.confetti();
            return true;
        } catch (error) {
            Utils.showError('Could not start challenge: ' + error.message);
            return false;
        }
    },

    endChallenge: async (courseId) => {
        try {
            await db.collection('courses').doc(courseId).update({
                challenge: firebase.firestore.FieldValue.delete(),
                updatedAt: new Date()
            });
            Utils.showSuccess(Fun.msg('challengeEnd'));
            return true;
        } catch (error) {
            Utils.showError('Error: ' + error.message);
            return false;
        }
    },

    /** A member leaves a shared course (the owner cannot - they delete the course instead) */
    leave: async (courseId) => {
        try {
            const me = AuthModule.getCurrentUser();
            await db.collection('courses').doc(courseId).update({
                memberIds: firebase.firestore.FieldValue.arrayRemove(me.uid),
                ['memberEmails.' + me.uid]: firebase.firestore.FieldValue.delete(),
                updatedAt: new Date()
            });
            Utils.showSuccess(Fun.msg('left'));
            return true;
        } catch (error) {
            Utils.showError('Could not leave: ' + error.message);
            return false;
        }
    },

    /** Owner removes a member (their past entries stay in the history) */
    removeMember: async (courseId, uid) => {
        try {
            await db.collection('courses').doc(courseId).update({
                memberIds: firebase.firestore.FieldValue.arrayRemove(uid),
                ['memberEmails.' + uid]: firebase.firestore.FieldValue.delete(),
                updatedAt: new Date()
            });
            Utils.showSuccess(Fun.msg('removed'));
            return true;
        } catch (error) {
            Utils.showError('Could not remove member: ' + error.message);
            return false;
        }
    },

    decline: async (courseId) => {
        try {
            const email = (AuthModule.getCurrentUser().email || '').toLowerCase();
            await db.collection('courses').doc(courseId).update({
                invitedEmails: firebase.firestore.FieldValue.arrayRemove(email),
                updatedAt: new Date()
            });
            return true;
        } catch (error) {
            Utils.showError('Error: ' + error.message);
            return false;
        }
    }
};

console.log('✓ Share manager module loaded');
