/**
 * Study Buddy Module
 * - buddyPosts:    public "looking for a study buddy" posts (no email stored)
 * - buddyRequests: private requests between two people; the requester's email is only
 *                  readable by the post owner, and only because the requester sent it.
 * Request document id: {postId}_{requesterUid}  (one request per person per post)
 */

const BuddyManager = {
    levels: { beginner: '🌱 Beginner', intermediate: '🌿 Intermediate', advanced: '🌳 Advanced' },

    posts: [],
    incoming: [],
    outgoing: [],
    denied: false,

    load: async () => {
        const uid = AuthModule.getCurrentUser().uid;
        const ms = (t) => (t && t.toMillis ? t.toMillis() : new Date(t || 0).getTime());
        try {
            const [postsSnap, inSnap, outSnap] = await Promise.all([
                db.collection('buddyPosts').where('open', '==', true).limit(100).get(),
                db.collection('buddyRequests').where('toUid', '==', uid).get(),
                db.collection('buddyRequests').where('fromUid', '==', uid).get()
            ]);
            const map = (s) => s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => ms(b.createdAt) - ms(a.createdAt));
            BuddyManager.posts = map(postsSnap);
            BuddyManager.incoming = map(inSnap);
            BuddyManager.outgoing = map(outSnap);
            BuddyManager.denied = false;
        } catch (e) {
            console.warn('Could not load study buddies:', e.message);
            BuddyManager.denied = e.code === 'permission-denied';
            BuddyManager.posts = [];
            BuddyManager.incoming = [];
            BuddyManager.outgoing = [];
        }
    },

    myPosts: () => BuddyManager.posts.filter(p => p.userId === AuthModule.getCurrentUser().uid),

    createPost: async (form) => {
        const me = AuthModule.getCurrentUser();
        const profile = ProfileManager.mine();
        if (!profile || !profile.displayName) {
            Utils.showError('Set up your profile (name + avatar) first - buddies see that instead of your email');
            return false;
        }
        const topic = (form.topic || '').trim().slice(0, 60);
        if (!topic) {
            Utils.showError('What do you want to learn?');
            return false;
        }
        if (BuddyManager.myPosts().length >= 3) {
            Utils.showError('You can have up to 3 open posts. Close one first.');
            return false;
        }
        const post = {
            userId: me.uid,
            displayName: profile.displayName,
            avatar: profile.avatar || '🦊',
            topic,
            level: BuddyManager.levels[form.level] ? form.level : 'beginner',
            goal: (form.goal || '').trim().slice(0, 200),
            availability: (form.availability || '').trim().slice(0, 80),
            timezone: (Intl.DateTimeFormat().resolvedOptions().timeZone || '').slice(0, 40),
            open: true,
            createdAt: new Date()
        };
        try {
            await db.collection('buddyPosts').add(post);
            return true;
        } catch (e) {
            Utils.showError('Could not post: ' + Utils.explain(e));
            return false;
        }
    },

    closePost: async (postId) => {
        try {
            await db.collection('buddyPosts').doc(postId).delete();
            return true;
        } catch (e) {
            Utils.showError(Utils.explain(e));
            return false;
        }
    },

    sendRequest: async (post, message) => {
        const me = AuthModule.getCurrentUser();
        const profile = ProfileManager.mine();
        if (!AuthModule.isEmailVerified()) {
            Utils.showError('Please verify your email first (see the banner on the courses page)');
            return false;
        }
        if (!profile || !profile.displayName) {
            Utils.showError('Set up your profile first so they know who you are');
            return false;
        }
        const id = post.id + '_' + me.uid;
        try {
            await db.collection('buddyRequests').doc(id).set({
                postId: post.id,
                topic: post.topic,
                toUid: post.userId,
                fromUid: me.uid,
                fromName: profile.displayName,
                fromAvatar: profile.avatar || '🦊',
                fromEmail: (me.email || '').toLowerCase(),
                message: (message || '').trim().slice(0, 300),
                status: 'pending',
                createdAt: new Date()
            });
            return true;
        } catch (e) {
            Utils.showError('Could not send request: ' + Utils.explain(e));
            return false;
        }
    },

    setStatus: async (reqId, status) => {
        try {
            await db.collection('buddyRequests').doc(reqId).update({ status, updatedAt: new Date() });
            return true;
        } catch (e) {
            Utils.showError(Utils.explain(e));
            return false;
        }
    },

    deleteRequest: async (reqId) => {
        try {
            await db.collection('buddyRequests').doc(reqId).delete();
            return true;
        } catch (e) {
            Utils.showError(Utils.explain(e));
            return false;
        }
    }
};

console.log('✓ Buddy module loaded');
