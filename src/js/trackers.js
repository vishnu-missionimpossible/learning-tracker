/**
 * Trackers - one engine for ANY activity (study, gym, weight, food, water, sleep, habits, mood, hobbies, custom).
 *
 * A tracker is a document in the existing "courses" collection (so sharing, invitations, leaderboard,
 * challenges and security rules keep working) with three optional extras:
 *   category : which template it came from (missing = 'study' = every pre-existing course)
 *   fields   : up to 8 custom fields {id:'f1'..'f10', label, type, unit, options, agg, archived}
 *   goal     : one target {kind:'frequency'|'daily'|'weekly'|'reach', field, op, value}
 * Entries (the "metrics" collection) keep date / status / duration / topic / notes and add
 *   values   : { f1: 72.4, f2: 'yes' ... } keyed by field id.
 * Removed fields are ARCHIVED (hidden, data kept) and their id is never reused.
 */

const Trackers = {
    SLOTS: 10,
    MAX_ACTIVE: 8,

    fieldTypes: {
        number: 'Number',
        rating: 'Rating (1-5)',
        yesno: 'Yes / No',
        text: 'Short text',
        choice: 'Choice list'
    },
    aggLabels: { sum: 'Add up', avg: 'Average', last: 'Latest', max: 'Highest' },
    goalKinds: {
        frequency: 'Times per week',
        daily: 'Daily amount',
        weekly: 'Weekly amount',
        reach: 'Reach a target'
    },

    order: ['study', 'fitness', 'cardio', 'weight', 'food', 'water', 'sleep', 'habit', 'mood', 'hobby', 'custom'],

    templates: {
        study: {
            emoji: '📚', name: 'Study / Course', blurb: 'Courses, languages, exams, skills',
            namePh: 'e.g., Python (snakes not included) 🐍', descPh: 'What are you learning and why?',
            heading: 'What are we conquering? 🏔️', cta: 'Unlock Course 🔓',
            showStatus: true, showDuration: true, showTopic: true, learning: true,
            topicLabel: 'Topic', topicPh: 'e.g., Loops (the good kind of going in circles) 🔁',
            logTitle: 'What did your brain do today? 🧠', minutesLabel: 'Minutes of Brain Gains ⏱️',
            checklistTitle: 'Learning Checklist', fields: [], goal: null
        },
        fitness: {
            emoji: '🏋️', name: 'Gym & Workout', blurb: 'Lifting, classes, sports',
            namePh: 'e.g., Gym 4x a week 💪', descPh: 'What is your fitness goal?',
            heading: 'Time to get stronger! 💪', cta: 'Start Training 🏁',
            showStatus: false, showDuration: true, showTopic: false,
            logTitle: 'How did your body do today? 💪', minutesLabel: 'Minutes of Sweat ⏱️',
            checklistTitle: 'Fitness Checklist',
            fields: [
                { label: 'Exercise', type: 'text' },
                { label: 'Weight', type: 'number', unit: 'kg', agg: 'max' },
                { label: 'Sets', type: 'number', agg: 'sum' },
                { label: 'Reps', type: 'number', agg: 'sum' }
            ],
            goal: { kind: 'frequency', field: '', op: 'atLeast', value: 4 }
        },
        cardio: {
            emoji: '🏃', name: 'Running & Cardio', blurb: 'Running, cycling, swimming, walking',
            namePh: 'e.g., Run 20 km a week 🏃', descPh: 'What are you training for?',
            heading: 'Lace up! 👟', cta: 'Hit The Road 🛣️',
            showStatus: false, showDuration: true, showTopic: false,
            logTitle: 'How far did you go today? 🏃', minutesLabel: 'Minutes Moving ⏱️',
            checklistTitle: 'Training Checklist',
            fields: [
                { label: 'Distance', type: 'number', unit: 'km', agg: 'sum' },
                { label: 'Effort', type: 'rating' }
            ],
            goal: { kind: 'weekly', field: 'f1', op: 'atLeast', value: 20 }
        },
        weight: {
            emoji: '⚖️', name: 'Weight & Body', blurb: 'Weight, waist, body measurements',
            namePh: 'e.g., Get to my goal weight ⚖️', descPh: 'What are you working towards?',
            heading: 'Small changes add up 📉', cta: 'Start Tracking ⚖️',
            showStatus: false, showDuration: false, showTopic: false,
            logTitle: 'Step on the scale 📏', minutesLabel: 'Minutes ⏱️',
            checklistTitle: 'Body Checklist',
            fields: [
                { label: 'Weight', type: 'number', unit: 'kg', agg: 'last' },
                { label: 'Waist', type: 'number', unit: 'cm', agg: 'last' }
            ],
            goal: { kind: 'reach', field: 'f1', op: 'atLeast', value: null }
        },
        food: {
            emoji: '🥗', name: 'Food & Calories', blurb: 'Meals, calories, protein, eating habits',
            namePh: 'e.g., Eat well 🥗', descPh: 'What is your food goal?',
            heading: 'You are what you eat 🍎', cta: 'Start Food Log 🍽️',
            showStatus: false, showDuration: false, showTopic: false,
            logTitle: 'What did you eat? 🍽️', minutesLabel: 'Minutes ⏱️',
            checklistTitle: 'Food Checklist',
            fields: [
                { label: 'Meal', type: 'choice', options: ['Breakfast', 'Lunch', 'Dinner', 'Snack'] },
                { label: 'What you ate', type: 'text' },
                { label: 'Calories', type: 'number', unit: 'kcal', agg: 'sum' },
                { label: 'Protein', type: 'number', unit: 'g', agg: 'sum' }
            ],
            goal: { kind: 'daily', field: 'f3', op: 'atMost', value: 2000 }
        },
        water: {
            emoji: '💧', name: 'Water', blurb: 'Stay hydrated',
            namePh: 'e.g., Drink more water 💧', descPh: 'Why does hydration matter to you?',
            heading: 'Hydrate or diedrate 💦', cta: 'Start Sipping 💧',
            showStatus: false, showDuration: false, showTopic: false,
            logTitle: 'Glug glug 💧', minutesLabel: 'Minutes ⏱️',
            checklistTitle: 'Water Checklist',
            fields: [{ label: 'Glasses', type: 'number', unit: 'glasses', agg: 'sum' }],
            goal: { kind: 'daily', field: 'f1', op: 'atLeast', value: 8 }
        },
        sleep: {
            emoji: '😴', name: 'Sleep', blurb: 'Hours slept and how well',
            namePh: 'e.g., Sleep better 😴', descPh: 'What would better sleep change?',
            heading: 'Sleep is a superpower 🌙', cta: 'Start Sleep Log 🌙',
            showStatus: false, showDuration: false, showTopic: false,
            logTitle: 'How did you sleep? 🌙', minutesLabel: 'Minutes ⏱️',
            checklistTitle: 'Sleep Checklist',
            fields: [
                { label: 'Hours slept', type: 'number', unit: 'hrs', agg: 'avg' },
                { label: 'Quality', type: 'rating' }
            ],
            goal: { kind: 'daily', field: 'f1', op: 'atLeast', value: 7 }
        },
        habit: {
            emoji: '✅', name: 'Daily Habit', blurb: 'Reading, meditation, early wake-up, anything daily',
            namePh: 'e.g., Read 20 pages 📖', descPh: 'Why does this habit matter?',
            heading: 'Small steps, big change 🌱', cta: 'Build The Habit 🌱',
            showStatus: true, showDuration: false, showTopic: false,
            logTitle: 'Did you keep the habit today? 🌱', minutesLabel: 'Minutes ⏱️',
            checklistTitle: 'Habit Checklist', fields: [],
            goal: { kind: 'frequency', field: '', op: 'atLeast', value: 5 }
        },
        mood: {
            emoji: '🙂', name: 'Mood & Energy', blurb: 'How you feel, day by day',
            namePh: 'e.g., Daily check-in 🙂', descPh: 'What do you want to understand about yourself?',
            heading: 'Check in with yourself 💜', cta: 'Start Check-ins 💜',
            showStatus: false, showDuration: false, showTopic: false,
            logTitle: 'How are you feeling? 💜', minutesLabel: 'Minutes ⏱️',
            checklistTitle: 'Wellbeing Checklist',
            fields: [
                { label: 'Mood', type: 'rating' },
                { label: 'Energy', type: 'rating' },
                { label: 'What happened?', type: 'text' }
            ],
            goal: { kind: 'frequency', field: '', op: 'atLeast', value: 5 }
        },
        hobby: {
            emoji: '🎨', name: 'Hobby', blurb: 'Music, art, cooking, gardening, gaming...',
            namePh: 'e.g., Guitar practice 🎸', descPh: 'What do you enjoy making or doing?',
            heading: 'Make time for what you love 🎈', cta: 'Start My Hobby 🎉',
            showStatus: false, showDuration: true, showTopic: true,
            topicLabel: 'What did you work on?', topicPh: 'e.g., Learned a new chord',
            logTitle: 'What did you create today? 🎨', minutesLabel: 'Minutes of Joy ⏱️',
            checklistTitle: 'Hobby Checklist', fields: [],
            goal: { kind: 'weekly', field: 'duration', op: 'atLeast', value: 120 }
        },
        custom: {
            emoji: '⭐', name: 'Custom', blurb: 'Build your own: pick your own fields',
            namePh: 'e.g., Savings, side project, journaling', descPh: 'Describe what you are tracking',
            heading: 'Your tracker, your rules ⭐', cta: 'Start Tracking 🚀',
            showStatus: false, showDuration: true, showTopic: false,
            logTitle: 'What did you do today? ⭐', minutesLabel: 'Minutes Invested ⏱️',
            checklistTitle: 'Checklist', fields: [], goal: null
        }
    },

    // ---------------------------------------------------------------------
    // Reading a tracker (defensive: data comes from Firestore, possibly written by a friend)
    // ---------------------------------------------------------------------
    key: (c) => {
        const k = typeof c === 'string' ? c : (c && c.category);
        return Trackers.templates[k] ? k : 'study';
    },
    tpl: (c) => Trackers.templates[Trackers.key(c)],

    safeField: (f) => {
        if (!f || typeof f !== 'object') return null;
        const m = /^f([1-9]|10)$/.exec(String(f.id));
        const label = String(f.label == null ? '' : f.label).trim().slice(0, 40);
        if (!m || !label || !Trackers.fieldTypes[f.type]) return null;
        return {
            id: 'f' + m[1],
            label,
            type: f.type,
            unit: f.type === 'number' ? String(f.unit || '').slice(0, 12) : '',
            options: f.type === 'choice' && Array.isArray(f.options)
                ? f.options.map(o => String(o).slice(0, 30)).filter(Boolean).slice(0, 8) : [],
            agg: Trackers.aggLabels[f.agg] ? f.agg : 'sum',
            archived: f.archived === true
        };
    },
    allFields: (c) => (Array.isArray(c && c.fields) ? c.fields : []).map(Trackers.safeField).filter(Boolean),
    fields: (c) => Trackers.allFields(c).filter(f => !f.archived).slice(0, Trackers.MAX_ACTIVE),

    safeGoal: (g) => {
        if (!g || typeof g !== 'object' || !Trackers.goalKinds[g.kind]) return null;
        const value = Number(g.value);
        if (!isFinite(value) || value < 0 || value > 10000000) return null;
        const field = /^(f([1-9]|10)|duration)?$/.test(String(g.field == null ? '' : g.field)) ? String(g.field || '') : '';
        return { kind: g.kind, field, op: g.op === 'atMost' ? 'atMost' : 'atLeast', value };
    },

    /** Fields offered to a goal: active number fields (+ built-in minutes when the tracker has them) */
    goalFields: (c) => {
        const list = Trackers.fields(c).filter(f => f.type === 'number').map(f => ({ id: f.id, label: f.label, unit: f.unit }));
        if (Trackers.tpl(c).showDuration) list.push({ id: 'duration', label: 'Minutes', unit: 'min' });
        return list;
    },

    // ---------------------------------------------------------------------
    // Cleaning what the user typed (mirrors firestore.rules)
    // ---------------------------------------------------------------------
    /** Draft rows -> stored fields. Throws Error with a friendly message. */
    cleanFields: (draft) => {
        const rows = (Array.isArray(draft) ? draft : []).filter(f => f && (f.id || String(f.label || '').trim()));
        const used = new Set(rows.filter(f => f.id).map(f => f.id));
        const out = [];
        rows.forEach(f => {
            const label = String(f.label || '').trim().slice(0, 40);
            if (!label) throw new Error('Every field needs a name');
            if (!Trackers.fieldTypes[f.type]) throw new Error('Pick a type for "' + label + '"');
            let id = f.id;
            if (!id) {
                for (let i = 1; i <= Trackers.SLOTS; i++) { if (!used.has('f' + i)) { id = 'f' + i; used.add(id); break; } }
                if (!id) throw new Error('You have used all ' + Trackers.SLOTS + ' field slots (removed fields keep theirs)');
            }
            const field = { id, label, type: f.type };
            if (f.type === 'number') {
                field.unit = String(f.unit || '').trim().slice(0, 12);
                field.agg = Trackers.aggLabels[f.agg] ? f.agg : 'sum';
            }
            if (f.type === 'choice') {
                const opts = (Array.isArray(f.options) ? f.options : String(f.options || '').split(','))
                    .map(o => String(o).trim().slice(0, 30)).filter(Boolean);
                if (opts.length < 2 || opts.length > 8) throw new Error('"' + label + '" needs 2 to 8 choices (comma separated)');
                field.options = [...new Set(opts)];
            }
            if (f.archived) field.archived = true;
            out.push(field);
        });
        if (out.filter(f => !f.archived).length > Trackers.MAX_ACTIVE) throw new Error('Maximum ' + Trackers.MAX_ACTIVE + ' fields per tracker');
        return out;
    },

    /** Draft goal -> stored goal or null. Throws Error with a friendly message. */
    cleanGoal: (draft, course) => {
        if (!draft || !Trackers.goalKinds[draft.kind]) return null;
        const value = Number(draft.value);
        if (draft.value === '' || draft.value == null || !isFinite(value) || value < 0) throw new Error('Enter a number for your target');
        if (draft.kind === 'frequency') {
            if (value < 1 || value > 7) throw new Error('Pick between 1 and 7 days per week');
            return { kind: 'frequency', field: '', op: 'atLeast', value: Math.round(value) };
        }
        const allowed = Trackers.goalFields(course).map(f => f.id);
        if (!allowed.includes(draft.field)) throw new Error('Pick which field your target is about');
        if (value > 10000000) throw new Error('That target is too large');
        if (draft.kind === 'reach') return { kind: 'reach', field: draft.field, op: 'atLeast', value };
        return { kind: draft.kind, field: draft.field, op: draft.op === 'atMost' ? 'atMost' : 'atLeast', value };
    },

    /** Raw form values -> typed values for storage (only for this tracker's active fields) */
    cleanValues: (course, raw) => {
        const out = {};
        Trackers.fields(course).forEach(f => {
            let v = raw ? raw[f.id] : undefined;
            if (v === undefined || v === null || v === '') return;
            if (f.type === 'number') {
                v = Number(v);
                if (!isFinite(v)) return;
                out[f.id] = Math.round(Math.max(-10000000, Math.min(10000000, v)) * 10000) / 10000;
            } else if (f.type === 'rating') {
                v = Math.round(Number(v));
                if (v >= 1 && v <= 5) out[f.id] = v;
            } else if (f.type === 'yesno') {
                if (v === true || v === 'yes') out[f.id] = true;
                else if (v === false || v === 'no') out[f.id] = false;
            } else if (f.type === 'choice') {
                if (f.options.includes(String(v))) out[f.id] = String(v);
            } else {
                v = String(v).trim().slice(0, 200);
                if (v) out[f.id] = v;
            }
        });
        return out;
    },

    fmt: (f, v) => {
        if (v === undefined || v === null || v === '') return '';
        if (f.type === 'number') return String(v) + (f.unit ? ' ' + f.unit : '');
        if (f.type === 'rating') return '⭐'.repeat(Math.max(0, Math.min(5, Number(v) || 0)));
        if (f.type === 'yesno') return v === true ? 'Yes ✅' : 'No';
        return String(v);
    }
};

console.log('✓ Trackers module loaded');
