/**
 * Profile Module
 * Public display name + emoji avatar (collection: profiles/{uid}).
 * Only name and avatar are stored here - never the email.
 */

const ProfileManager = {
    cache: {},

    /** Load profiles for the given user ids (cached) */
    load: async (uids) => {
        const missing = [...new Set(uids || [])].filter(u => u && !(u in ProfileManager.cache));
        await Promise.all(missing.map(async (uid) => {
            try {
                const doc = await db.collection('profiles').doc(uid).get();
                ProfileManager.cache[uid] = doc.exists ? doc.data() : null;
            } catch (e) {
                console.warn('Could not load profile:', e.message);
                ProfileManager.cache[uid] = null;
            }
        }));
    },

    get: (uid) => ProfileManager.cache[uid] || null,

    mine: () => ProfileManager.get(AuthModule.getCurrentUser().uid),

    save: async (displayName, avatar) => {
        const name = (displayName || '').trim().slice(0, 30);
        if (!name) {
            Utils.showError('Please enter a display name');
            return false;
        }
        const uid = AuthModule.getCurrentUser().uid;
        try {
            const data = { displayName: name, avatar: avatar || '🦊', updatedAt: new Date() };
            await db.collection('profiles').doc(uid).set(data);
            ProfileManager.cache[uid] = data;
            Utils.showSuccess(Fun.msg('profile'));
            return true;
        } catch (e) {
            console.error('Profile save error:', e);
            Utils.showError('Could not save profile: ' + Utils.explain(e));
            return false;
        }
    }
};

console.log('✓ Profile module loaded');
