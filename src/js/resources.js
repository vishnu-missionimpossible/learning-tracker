/**
 * Resource Library Module
 * Shared, per-course collection of learning resources (collection: resources).
 * Members can add links, vote "helpful", mark as done, comment, pin (owner) and more.
 */

const ResourceManager = {
    types: {
        video: { emoji: '🎬', label: 'Video' },
        article: { emoji: '📰', label: 'Article' },
        course: { emoji: '🎓', label: 'Course' },
        doc: { emoji: '📄', label: 'Docs / PDF' },
        book: { emoji: '📖', label: 'Book' },
        code: { emoji: '💻', label: 'Code / Repo' },
        tool: { emoji: '🛠️', label: 'Tool' },
        link: { emoji: '🔗', label: 'Link' }
    },

    hostname: (url) => {
        try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return ''; }
    },

    /** Guess the resource type from the URL */
    detect: (url) => {
        const host = ResourceManager.hostname(url);
        const path = (() => { try { return new URL(url).pathname.toLowerCase(); } catch (e) { return ''; } })();
        if (/youtube\.com|youtu\.be|vimeo\.com|twitch\.tv|loom\.com/.test(host)) return 'video';
        if (/github\.com|gitlab\.com|codepen\.io|replit\.com|stackblitz\.com|codesandbox\.io|jsfiddle\.net|leetcode\.com|hackerrank\.com/.test(host)) return 'code';
        if (/coursera\.org|udemy\.com|edx\.org|khanacademy\.org|udacity\.com|pluralsight\.com|freecodecamp\.org|codecademy\.com/.test(host)) return 'course';
        if (path.endsWith('.pdf') || /^docs\.|developer\.mozilla|readthedocs|wikipedia\.org|w3schools/.test(host)) return 'doc';
        if (/medium\.com|dev\.to|substack\.com|hashnode|blog|towardsdatascience/.test(host)) return 'article';
        if (/goodreads\.com|amazon\./.test(host)) return 'book';
        return 'link';
    },

    youtubeId: (url) => {
        try {
            const u = new URL(url);
            if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('/')[0] || null;
            if (u.hostname.includes('youtube.com')) {
                if (u.searchParams.get('v')) return u.searchParams.get('v');
                const m = u.pathname.match(/\/(embed|shorts)\/([\w-]{6,})/);
                return m ? m[2] : null;
            }
        } catch (e) { /* ignore */ }
        return null;
    },

    /** Thumbnail for YouTube links, else null */
    thumb: (url) => {
        const id = ResourceManager.youtubeId(url);
        return id && /^[\w-]{6,}$/.test(id) ? 'https://img.youtube.com/vi/' + id + '/mqdefault.jpg' : null;
    },

    favicon: (url) => {
        const host = ResourceManager.hostname(url);
        return host ? 'https://www.google.com/s2/favicons?sz=64&domain=' + encodeURIComponent(host) : null;
    },

    parseTags: (text) => {
        const tags = (text || '').split(/[,#\n]+/).map(t => t.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 24)).filter(Boolean);
        return [...new Set(tags)].slice(0, 6);
    },

    getForCourse: async (courseId) => {
        try {
            const snap = await db.collection('resources').where('courseId', '==', courseId).get();
            UIModule.denied.library = false;
            return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (e) {
            console.warn('Could not load resources:', e.message);
            UIModule.denied.library = e.code === 'permission-denied';
            return [];
        }
    },

    /** Validate form data and build the document fields */
    buildFields: (form) => {
        const url = Utils.safeUrl(form.url);
        if (!url) throw new Error('Please enter a valid http(s) link');
        const title = (form.title || '').trim() || ResourceManager.hostname(url) || url;
        const type = ResourceManager.types[form.type] ? form.type : ResourceManager.detect(url);
        return {
            url: url.slice(0, 1500),
            title: title.slice(0, 150),
            description: (form.description || '').trim().slice(0, 400),
            type,
            tags: ResourceManager.parseTags(form.tags)
        };
    },

    add: async (courseId, form) => {
        try {
            const fields = ResourceManager.buildFields(form);
            const dupe = UIModule.resources.find(r => r.url === fields.url);
            if (dupe) throw new Error('Someone already shared that link: "' + dupe.title + '"');
            const doc = {
                ...fields,
                courseId,
                userId: AuthModule.getCurrentUser().uid,
                pinned: false,
                likes: {},
                doneBy: {},
                createdAt: new Date(),
                updatedAt: new Date()
            };
            const ref = await db.collection('resources').add(doc);
            UIModule.resources.unshift({ id: ref.id, ...doc });
            return true;
        } catch (e) {
            console.error('Add resource error:', e);
            Utils.showError(Utils.explain(e));
            return false;
        }
    },

    update: async (id, form) => {
        try {
            const fields = ResourceManager.buildFields(form);
            await db.collection('resources').doc(id).update({ ...fields, updatedAt: new Date() });
            const r = UIModule.resources.find(x => x.id === id);
            if (r) Object.assign(r, fields);
            return true;
        } catch (e) {
            Utils.showError(Utils.explain(e));
            return false;
        }
    },

    remove: async (id) => {
        try {
            await db.collection('resources').doc(id).delete();
            UIModule.resources = UIModule.resources.filter(r => r.id !== id);
            return true;
        } catch (e) {
            Utils.showError(Utils.explain(e));
            return false;
        }
    },

    /** Toggle my entry in a map field ('likes' or 'doneBy') */
    toggleMap: async (id, field) => {
        try {
            const uid = AuthModule.getCurrentUser().uid;
            const r = UIModule.resources.find(x => x.id === id);
            const on = !(r && r[field] && r[field][uid]);
            await db.collection('resources').doc(id).update({
                [field + '.' + uid]: on ? true : firebase.firestore.FieldValue.delete()
            });
            if (r) {
                r[field] = { ...(r[field] || {}) };
                if (on) r[field][uid] = true; else delete r[field][uid];
            }
            return on;
        } catch (e) {
            Utils.showError(Utils.explain(e));
            return undefined;
        }
    },

    setPinned: async (id, pinned) => {
        try {
            await db.collection('resources').doc(id).update({ pinned, updatedAt: new Date() });
            const r = UIModule.resources.find(x => x.id === id);
            if (r) r.pinned = pinned;
            return true;
        } catch (e) {
            Utils.showError(Utils.explain(e));
            return false;
        }
    }
};

console.log('✓ Resource module loaded');
