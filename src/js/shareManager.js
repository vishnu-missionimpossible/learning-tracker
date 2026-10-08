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
