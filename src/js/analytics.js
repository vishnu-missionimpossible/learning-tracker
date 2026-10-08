/**
 * Analytics Module
 * Pure functions (no Firestore access): streaks, badges, heatmap, chart data,
 * leaderboard and CSV export. Dates are 'YYYY-MM-DD' strings in local time.
 */

const Analytics = {
    toKey: (d) => {
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return d.getFullYear() + '-' + m + '-' + day;
    },

    parse: (key) => {
        const [y, m, d] = key.split('-').map(Number);
        return new Date(y, m - 1, d);
    },

    today: () => Analytics.toKey(new Date()),

    addDays: (key, n) => {
        const d = Analytics.parse(key);
        d.setDate(d.getDate() + n);
        return Analytics.toKey(d);
    },

    daysBetween: (a, b) => Math.round((Analytics.parse(b) - Analytics.parse(a)) / 86400000),

    /** Sorted unique dates with a Done entry */
    doneDates: (metrics) => {
        return [...new Set(metrics.filter(m => m.status === 'Done').map(m => m.date))].sort();
    },

    /** Current and best streak (consecutive Done days). Today not yet logged keeps yesterday's streak alive. */
    streaks: (metrics) => {
        const dates = Analytics.doneDates(metrics);
        if (!dates.length) return { current: 0, best: 0 };

        let best = 1, run = 1;
        for (let i = 1; i < dates.length; i++) {
            run = Analytics.daysBetween(dates[i - 1], dates[i]) === 1 ? run + 1 : 1;
            best = Math.max(best, run);
        }

        const set = new Set(dates);
        const today = Analytics.today();
        let cursor = set.has(today) ? today : Analytics.addDays(today, -1);
        let current = 0;
        while (set.has(cursor)) {
            current++;
            cursor = Analytics.addDays(cursor, -1);
        }
        return { current, best };
    },

    minutesOn: (metrics, dateKey) => {
        return metrics
            .filter(m => m.status === 'Done' && m.date === dateKey)
            .reduce((sum, m) => sum + (Number(m.duration) || 0), 0);
    },

    hasLoggedToday: (metrics) => metrics.some(m => m.date === Analytics.today()),

    /** All badges with earned flag */
    badges: (metrics) => {
        const dates = Analytics.doneDates(metrics);
        const { best } = Analytics.streaks(metrics);
        const minutes = metrics
            .filter(m => m.status === 'Done')
            .reduce((s, m) => s + (Number(m.duration) || 0), 0);
        let comeback = false;
        for (let i = 1; i < dates.length; i++) {
            if (Analytics.daysBetween(dates[i - 1], dates[i]) >= 7) comeback = true;
        }
        return [
            { id: 'first', emoji: '👣', name: 'First Step', desc: 'Log your first Done day', earned: dates.length >= 1 },
            { id: 'streak3', emoji: '🎩', name: 'Hat Trick', desc: '3-day streak', earned: best >= 3 },
            { id: 'streak7', emoji: '⚔️', name: 'Week Warrior', desc: '7-day streak', earned: best >= 7 },
            { id: 'streak30', emoji: '🚀', name: 'Unstoppable', desc: '30-day streak', earned: best >= 30 },
            { id: 'wins10', emoji: '🔟', name: 'Double Digits', desc: '10 Done days', earned: dates.length >= 10 },
            { id: 'wins30', emoji: '🦸', name: 'Habit Hero', desc: '30 Done days', earned: dates.length >= 30 },
            { id: 'min600', emoji: '⏰', name: '10 Hours Club', desc: '10 hours learned', earned: minutes >= 600 },
            { id: 'min3000', emoji: '🧙', name: '50 Hours Legend', desc: '50 hours learned', earned: minutes >= 3000 },
            { id: 'comeback', emoji: '🔄', name: 'Comeback Kid', desc: 'Return after a 7+ day break', earned: comeback }
        ];
    },

    /** Heatmap columns (weeks, Sun..Sat) covering the last N weeks */
    heatmap: (metrics, weeks = 18) => {
        const byDate = {};
        metrics.forEach(m => {
            if (m.status === 'Done') byDate[m.date] = 'done';
            else if (!byDate[m.date]) byDate[m.date] = 'missed';
        });
        const today = Analytics.today();
        const t = Analytics.parse(today);
        const startKey = Analytics.addDays(today, -(t.getDay() + (weeks - 1) * 7));
        const cols = [];
        for (let w = 0; w < weeks; w++) {
            const col = [];
            for (let d = 0; d < 7; d++) {
                const key = Analytics.addDays(startKey, w * 7 + d);
                col.push({ date: key, state: key > today ? 'future' : (byDate[key] || 'none') });
            }
            cols.push(col);
        }
        return cols;
    },

    /** Monday of the week containing the given key */
    weekStart: (key) => {
        const d = Analytics.parse(key);
        const diff = (d.getDay() + 6) % 7;
        return Analytics.addDays(key, -diff);
    },

    /** Minutes of Done entries per week for the last N weeks */
    weeklyMinutes: (metrics, weeks = 8) => {
        const thisWeek = Analytics.weekStart(Analytics.today());
        const out = [];
        for (let i = weeks - 1; i >= 0; i--) {
            const start = Analytics.addDays(thisWeek, -7 * i);
            const end = Analytics.addDays(start, 6);
            const minutes = metrics
                .filter(m => m.status === 'Done' && m.date >= start && m.date <= end)
                .reduce((s, m) => s + (Number(m.duration) || 0), 0);
            const d = Analytics.parse(start);
            out.push({ label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), minutes });
        }
        return out;
    },

    /** Cumulative consistency % at the end of each of the last N weeks */
    consistencyTrend: (metrics, startDate, weeks = 10) => {
        const today = Analytics.today();
        const dates = Analytics.doneDates(metrics);
        const thisWeek = Analytics.weekStart(today);
        const out = [];
        for (let i = weeks - 1; i >= 0; i--) {
            let end = Analytics.addDays(thisWeek, -7 * i + 6);
            if (end > today) end = today;
            if (end < startDate) continue;
            const elapsed = Analytics.daysBetween(startDate, end) + 1;
            const done = dates.filter(d => d >= startDate && d <= end).length;
            const label = Analytics.parse(end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            out.push({ label, value: Utils.calculateConsistency(done, elapsed) });
        }
        return out;
    },

    /** One row per course member: consistency, streak, wins, minutes */
    leaderboard: (course, allMetrics) => {
        const memberIds = course.memberIds && course.memberIds.length ? course.memberIds : [course.userId];
        const totalDays = Math.max(Utils.calculateDaysElapsed(course.startDate), 1);
        const rows = memberIds.map(uid => {
            const mine = allMetrics.filter(m => m.userId === uid && m.date >= course.startDate);
            const wins = Analytics.doneDates(mine).length;
            const minutes = mine.filter(m => m.status === 'Done')
                .reduce((s, m) => s + (Number(m.duration) || 0), 0);
            const email = (course.memberEmails && course.memberEmails[uid]) || (uid === course.userId ? 'Course owner' : 'Member');
            return {
                uid,
                email,
                consistency: Utils.calculateConsistency(wins, totalDays),
                wins,
                minutes,
                streak: Analytics.streaks(mine).current,
                loggedToday: Analytics.hasLoggedToday(mine)
            };
        });
        rows.sort((a, b) => b.consistency - a.consistency || b.streak - a.streak || b.minutes - a.minutes);
        return rows;
    },

    /** CSV text for entries (adds a Member column) */
    toCSV: (course, metrics, emailOf) => {
        const esc = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
        const header = ['Course', 'Date', 'Member', 'Status', 'Duration (min)', 'Topic', 'Notes'];
        const rows = metrics.map(m => [
            course.courseName, m.date, emailOf(m.userId), m.status, m.duration || 0, m.topic || '', m.notes || ''
        ]);
        return [header, ...rows].map(r => r.map(esc).join(',')).join('\r\n');
    },

    downloadCSV: (filename, text) => {
        const blob = new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
};

console.log('✓ Analytics module loaded');
