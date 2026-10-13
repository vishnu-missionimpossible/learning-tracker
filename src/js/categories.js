/**
 * Goal categories
 * The app tracks any recurring activity, not just courses. Every goal is a document in the
 * "courses" collection with a `category`; this table only changes labels, which tabs are
 * shown and whether the log form has an extra value (weight / reps / distance ...).
 */

const Categories = {
    order: ['learning', 'fitness', 'hobby', 'habit', 'wellness', 'custom'],

    tabLabels: {
        progress: '📊 Progress',
        together: '👯 Together',
        milestones: '🧩 Milestones',
        library: '📚 Library',
        cards: '🃏 Flashcards',
        questions: '❓ Q&amp;A',
        notes: '🗒️ Notes',
        journal: '📓 Journal',
        log: '📝 Log &amp; History'
    },

    list: {
        learning: {
            emoji: '📚', name: 'Learning', blurb: 'Courses, languages, skills and exams',
            namePh: 'e.g., Python (snakes not included) 🐍', descPh: 'What are you learning and why?',
            heading: 'What are we conquering? 🏔️', cta: 'Unlock Course 🔓',
            topicLabel: 'Topic', topicPh: 'e.g., Loops (the good kind of going in circles) 🔁',
            logTitle: 'What did your brain do today? 🧠', minutesLabel: 'Minutes of Brain Gains ⏱️',
            checklistTitle: 'Learning Checklist', unit: 'course',
            valueLabel: null, units: [],
            tabs: ['progress', 'together', 'milestones', 'library', 'cards', 'questions', 'notes', 'journal', 'log']
        },
        fitness: {
            emoji: '🏋️', name: 'Gym & Fitness', blurb: 'Workouts, running, sports, steps',
            namePh: 'e.g., Gym 4x a week 💪', descPh: 'What is your fitness goal?',
            heading: 'Time to get stronger! 💪', cta: 'Start Training 🏁',
            topicLabel: 'Workout / exercise', topicPh: 'e.g., Leg day, 5k run, Bench press',
            logTitle: 'How did your body do today? 💪', minutesLabel: 'Minutes of Sweat ⏱️',
            checklistTitle: 'Fitness Checklist', unit: 'goal',
            valueLabel: 'Weight / reps / distance', units: ['kg', 'lb', 'reps', 'sets', 'km', 'mi', 'steps'],
            tabs: ['progress', 'together', 'milestones', 'notes', 'journal', 'log']
        },
        hobby: {
            emoji: '🎨', name: 'Hobby', blurb: 'Music, art, cooking, gardening, gaming...',
            namePh: 'e.g., Guitar practice 🎸', descPh: 'What do you enjoy doing?',
            heading: 'Make time for what you love 🎈', cta: 'Start My Hobby 🎉',
            topicLabel: 'What did you work on?', topicPh: 'e.g., Learned a new chord, painted a sky',
            logTitle: 'What did you create today? 🎨', minutesLabel: 'Minutes of Joy ⏱️',
            checklistTitle: 'Hobby Checklist', unit: 'hobby',
            valueLabel: null, units: [],
            tabs: ['progress', 'together', 'milestones', 'library', 'notes', 'journal', 'log']
        },
        habit: {
            emoji: '✅', name: 'Daily Habit', blurb: 'Routines like reading, water, early wake-up',
            namePh: 'e.g., Read 20 pages 📖', descPh: 'Why does this habit matter to you?',
            heading: 'Small steps, big change 🌱', cta: 'Build The Habit 🌱',
            topicLabel: 'Details', topicPh: 'e.g., Chapter 4, 8 glasses',
            logTitle: 'Did you keep the habit today? 🌱', minutesLabel: 'Minutes Invested ⏱️',
            checklistTitle: 'Habit Checklist', unit: 'habit',
            valueLabel: 'Count / amount', units: ['times', 'pages', 'glasses', 'min', 'km'],
            tabs: ['progress', 'together', 'milestones', 'notes', 'journal', 'log']
        },
        wellness: {
            emoji: '🧘', name: 'Wellness', blurb: 'Meditation, sleep, stretching, mindfulness',
            namePh: 'e.g., Morning meditation 🧘', descPh: 'What are you caring for?',
            heading: 'Take care of you 💜', cta: 'Begin The Journey 🕊️',
            topicLabel: 'Practice', topicPh: 'e.g., Breathing, yoga flow, 8h sleep',
            logTitle: 'How did you look after yourself? 💜', minutesLabel: 'Minutes of Calm ⏱️',
            checklistTitle: 'Wellness Checklist', unit: 'practice',
            valueLabel: 'Amount', units: ['hours', 'min', 'times', 'glasses'],
            tabs: ['progress', 'together', 'milestones', 'notes', 'journal', 'log']
        },
        custom: {
            emoji: '⭐', name: 'Something Else', blurb: 'Anything you want to be consistent at',
            namePh: 'e.g., Side project, savings, journaling', descPh: 'Describe your goal',
            heading: 'Your goal, your rules ⭐', cta: 'Start Tracking 🚀',
            topicLabel: 'What did you do?', topicPh: 'e.g., Wrote 500 words',
            logTitle: 'What did you do today? ⭐', minutesLabel: 'Minutes Invested ⏱️',
            checklistTitle: 'Checklist', unit: 'goal',
            valueLabel: 'Amount', units: ['times', 'min', 'pages', 'km', 'kg', 'items'],
            tabs: ['progress', 'together', 'milestones', 'notes', 'journal', 'log']
        }
    },

    /** Safe category key for a goal (unknown / missing -> learning) */
    key: (goalOrKey) => {
        const k = typeof goalOrKey === 'string' ? goalOrKey : (goalOrKey && goalOrKey.category);
        return Categories.list[k] ? k : 'learning';
    },

    /** Config for a goal object or a key */
    get: (goalOrKey) => Categories.list[Categories.key(goalOrKey)],

    hasTab: (goal, tab) => Categories.get(goal).tabs.includes(tab),

    /** Keep only an allowed unit for the category (else '') */
    cleanUnit: (goal, unit) => {
        const u = String(unit || '').trim();
        return Categories.get(goal).units.includes(u) ? u : '';
    },

    /** Value is 0..1,000,000 with up to 2 decimals */
    cleanValue: (v) => {
        const n = Number(v);
        if (!isFinite(n) || n < 0) return 0;
        return Math.round(Math.min(1000000, n) * 100) / 100;
    }
};

console.log('✓ Categories module loaded');
