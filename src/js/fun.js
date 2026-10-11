/**
 * Fun Module
 * Wholesome, encouraging copy + confetti. Pure presentation - no data access.
 */

const Fun = {
    pick: (arr) => arr[Math.floor(Math.random() * arr.length)],

    taglines: [
        'Tiny steps, big brain energy 🧠',
        'Your future self is already clapping 👏',
        'Consistency: the cheat code nobody talks about 🎮',
        'Learning loading... please enjoy the glow-up ✨',
        'Be the person your browser history is scared of 🚀'
    ],

    greetings: [
        'Welcome back, legend! 🦸',
        'Look who is here to level up! 🎯',
        'The brain gym is open 💪',
        'Ready to be 1% smarter today? 🌱'
    ],

    quotes: [
        '"It does not matter how slowly you go as long as you do not stop." - Confucius',
        '"We are what we repeatedly do." - Will Durant',
        '"Small daily improvements are the key to staggering long-term results." - Robin Sharma',
        '"The expert in anything was once a beginner." - Helen Hayes',
        '"Discipline is choosing between what you want now and what you want most." - Abraham Lincoln',
        '"A little progress each day adds up to big results." - Satya Nani'
    ],

    reminders: [
        'Your brain is getting lonely 🥺 Log a quick session!',
        'Tiny step time! Even 10 minutes keeps the streak alive 🔥',
        'Psst... your future self is waiting for today\'s entry 👀',
        'Knowledge will not absorb itself 🧽 Come learn!'
    ],

    nudges: [
        'Your learning streak is wondering where you are 👀',
        'The leaderboard is getting spicy and you are slacking 😏',
        'Quick 10 minutes today? I believe in you! 💪'
    ],

    toasts: {
        profile: ['Profile saved! Looking good, legend 😎'],
        left: ['You left the course. The door is always open 👋'],
        removed: ['Member removed'],
        challenge: ['Challenge started! May the best learner win 🏁'],
        challengeEnd: ['Challenge ended'],
        timerDone: ['Timer complete! Take a stretch 🧘'],
        invite: ['Invite sent! Learning is better with friends 👯'],
        joined: ['You joined the squad! Time to learn together 🎉'],
        goal: ['Daily goal saved! Let\'s hit it 🎯'],
        badge: ['New badge unlocked!'],
        edit: ['Entry updated! Polished to perfection ✨'],
        csv: ['Download started! Your data, your rules 📥'],
        signup: ['Welcome aboard! Your learning adventure begins 🎒', 'Account created! Future genius detected 🔍'],
        login: ['Welcome back, superstar! 🌟', 'You are back! The courses missed you 🥹'],
        logout: ['See you soon! Go hydrate 💧', 'Logged out. Rest well, learner 😴'],
        course: ['New course unlocked! Adventure time 🗺️', 'Course created. Look at you, ambitious! 🚀'],
        courseDelete: ['Course waved goodbye 👋', 'Course retired with honours 🎖️'],
        done: ['Entry logged! Your brain says thanks 🧠', 'Another day, another win 🏆', 'Consistency looks good on you 😎'],
        missed: ['Missed days happen. Tomorrow is a fresh start 🌅', 'Logged. No guilt, just come back stronger 💪'],
        entryDelete: ['Entry vanished like it never happened 🪄']
    },

    verdicts: {
        none: 'A blank week so far. Plot twist: it is only as empty as you let it stay 😄',
        low: 'Warm-up week! Every pro started with tiny sessions 🌱',
        mid: 'Solid week! Your brain is flexing in the mirror 💪',
        high: 'Monster week! Please leave some knowledge for the rest of us 🔥',
        up: 'More minutes than last week. Look at that glow-up 📈',
        down: 'A bit lighter than last week - rest is part of the process 🌿'
    },

    weekVerdict: (review) => {
        if (!review.doneDays) return Fun.verdicts.none;
        let base = review.doneDays >= 5 ? Fun.verdicts.high : review.doneDays >= 3 ? Fun.verdicts.mid : Fun.verdicts.low;
        if (review.lastMinutes) {
            base += ' ' + (review.minutes >= review.lastMinutes ? Fun.verdicts.up : Fun.verdicts.down);
        }
        return base;
    },

    reactionEmojis: ['👏', '🔥', '💪', '🎉', '😂'],

    avatars: ['🦊', '🐼', '🐯', '🦉', '🐙', '🦄', '🐢', '🐧', '🦁', '🐸', '🤖', '🧙', '🥷', '🧑‍🚀', '🌱', '🦖'],

    /** Same quote all day (changes at midnight) */
    dailyQuote: () => {
        const day = Math.floor(Date.now() / 86400000);
        return Fun.quotes[day % Fun.quotes.length];
    },

    /** Wrap original toast text with fun text when a key is given */
    msg: (key, fallback) => {
        const list = Fun.toasts[key];
        return list ? Fun.pick(list) : fallback;
    },

    /** Mood message based on consistency percentage */
    mood: (consistency, totalEntries) => {
        if (!totalEntries) return { emoji: '🌱', text: 'A blank page. Log your first entry and let the magic begin!' };
        if (consistency >= 90) return { emoji: '🏆', text: 'Absolute legend. Scientists want to study your habits.' };
        if (consistency >= 70) return { emoji: '🔥', text: 'You are on fire! Just do not set off the smoke alarm.' };
        if (consistency >= 50) return { emoji: '😎', text: 'Solid rhythm. Keep going, you are halfway to awesome.' };
        if (consistency >= 25) return { emoji: '🐢', text: 'Slow and steady. The tortoise approves of you.' };
        return { emoji: '🛋️', text: 'The couch is strong, but so are you. One small entry today?' };
    },

    /** Lightweight confetti burst (no library) */
    confetti: () => {
        const colors = ['#ff6b6b', '#feca57', '#48dbfb', '#1dd1a1', '#a29bfe', '#fd79a8'];
        const wrap = document.createElement('div');
        wrap.className = 'confetti-wrap';
        for (let i = 0; i < 60; i++) {
            const p = document.createElement('span');
            p.className = 'confetti-piece';
            p.style.left = Math.random() * 100 + 'vw';
            p.style.background = Fun.pick(colors);
            p.style.animationDelay = Math.random() * 0.4 + 's';
            p.style.animationDuration = 1.6 + Math.random() * 1.2 + 's';
            p.style.transform = 'rotate(' + Math.random() * 360 + 'deg)';
            wrap.appendChild(p);
        }
        document.body.appendChild(wrap);
        setTimeout(() => wrap.remove(), 3500);
    }
};

console.log('✓ Fun module loaded');
