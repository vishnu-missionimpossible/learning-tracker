/**
 * Tracker statistics: goal progress, per-field summaries and chart data.
 * Pure functions over entry arrays (my entries for ONE tracker).
 */

Object.assign(Trackers, {

    ms: (t) => (t && t.toMillis ? t.toMillis() : new Date(t || 0).getTime()),

    /** Oldest -> newest (date, then creation time) */
    sorted: (metrics) => [...metrics].sort((a, b) =>
        (a.date < b.date ? -1 : a.date > b.date ? 1 : Trackers.ms(a.createdAt) - Trackers.ms(b.createdAt))),

    /** One entry's value for a field id ('duration' is the built-in minutes) */
    rawValue: (m, fid) => {
        if (fid === 'duration') return Number(m.duration) || 0;
        const v = m.values && typeof m.values === 'object' ? m.values[fid] : undefined;
        return v;
    },

    aggregate: (nums, agg) => {
        const a = nums.map(Number).filter(n => isFinite(n));
        if (!a.length) return 0;
        const round = (n) => Math.round(n * 100) / 100;
        if (agg === 'avg') return round(a.reduce((s, n) => s + n, 0) / a.length);
        if (agg === 'max') return Math.max(...a);
        if (agg === 'last') return a[a.length - 1];
        return round(a.reduce((s, n) => s + n, 0));
    },

    fieldDef: (course, fid) => {
        if (fid === 'duration') return { id: 'duration', label: 'Minutes', unit: 'min', agg: 'sum', type: 'number' };
        return Trackers.fields(course).find(f => f.id === fid) || null;
    },

    // ---------------------------------------------------------------------
    // Goal progress
    // ---------------------------------------------------------------------
    goalProgress: (course, metrics) => {
        const g = Trackers.safeGoal(course.goal);
        if (!g) return null;
        const today = Analytics.today();
        const wk = Analytics.weekStart(today);
        const done = Trackers.sorted(metrics.filter(m => m.status === 'Done'));
        const clampPct = (n) => Math.max(0, Math.min(100, Math.round(n)));
        const num = (n) => String(Math.round(n * 100) / 100);

        if (g.kind === 'frequency') {
            const days = new Set(done.filter(m => m.date >= wk && m.date <= today).map(m => m.date)).size;
            return { kind: g.kind, title: 'Weekly goal', current: days, target: g.value, pct: clampPct(days / (g.value || 1) * 100),
                met: days >= g.value, text: days + ' of ' + g.value + ' days this week' };
        }

        const f = Trackers.fieldDef(course, g.field);
        if (!f) return null;
        const unit = f.unit ? ' ' + f.unit : '';
        const inPeriod = (from) => done.filter(m => m.date >= from && m.date <= today)
            .map(m => Trackers.rawValue(m, f.id)).filter(v => v !== undefined && v !== null && v !== '');

        if (g.kind === 'reach') {
            const vals = done.map(m => ({ d: m.date, raw: Trackers.rawValue(m, f.id) }))
                .filter(x => typeof x.raw === 'number' && isFinite(x.raw))
                .map(x => ({ d: x.d, v: x.raw }));
            if (!vals.length) return { kind: 'reach', title: f.label + ' → ' + num(g.value) + unit, current: null, target: g.value, pct: 0, met: false,
                text: 'Log your first ' + f.label.toLowerCase() + ' to start' };
            const start = vals[0].v, cur = vals[vals.length - 1].v;
            const span = start - g.value;
            const pct = span === 0 ? 100 : clampPct((start - cur) / span * 100);
            const left = Math.abs(cur - g.value);
            const met = span === 0 ? true : (span > 0 ? cur <= g.value : cur >= g.value);
            return { kind: 'reach', title: f.label + ' → ' + num(g.value) + unit, current: cur, target: g.value, pct: met ? 100 : pct, met,
                text: met ? 'Target reached! Now at ' + num(cur) + unit : num(cur) + unit + ' now, ' + num(left) + unit + ' to go (started at ' + num(start) + unit + ')' };
        }

        const from = g.kind === 'daily' ? today : wk;
        const period = g.kind === 'daily' ? 'today' : 'this week';
        const current = Trackers.aggregate(inPeriod(from), f.agg || 'sum');
        const atMost = g.op === 'atMost';
        const met = atMost ? current <= g.value : current >= g.value;
        const pct = g.value ? clampPct(current / g.value * 100) : (current ? 100 : 0);
        const diff = Math.abs(g.value - current);
        return { kind: g.kind, title: f.label + ' ' + period, current, target: g.value, pct, met, atMost, over: atMost && !met,
            text: num(current) + ' / ' + num(g.value) + unit + (atMost ? ' limit' : '') + ' ' + period +
                (atMost ? (met ? ' - ' + num(diff) + unit + ' left' : ' - ' + num(diff) + unit + ' over') : (met ? ' - goal met!' : ' - ' + num(diff) + unit + ' to go')) };
    },

    // ---------------------------------------------------------------------
    // Per-field summary cards
    // ---------------------------------------------------------------------
    fieldSummaries: (course, metrics) => {
        const today = Analytics.today();
        const wk = Analytics.weekStart(today);
        const done = Trackers.sorted(metrics.filter(m => m.status === 'Done'));
        const out = [];
        Trackers.fields(course).forEach(f => {
            if (out.length >= 6) return;
            const rows = done.map(m => ({ d: m.date, v: Trackers.rawValue(m, f.id) })).filter(x => x.v !== undefined && x.v !== null && x.v !== '');
            if (!rows.length) return;
            const unit = f.unit ? ' ' + f.unit : '';
            const round = (n) => Math.round(n * 100) / 100;
            if (f.type === 'number') {
                const nums = rows.map(x => Number(x.v));
                if (f.agg === 'sum') {
                    const t = round(rows.filter(x => x.d >= wk).reduce((s, x) => s + Number(x.v), 0));
                    out.push({ label: f.label + ' this week', value: t + unit, sub: 'total' });
                } else if (f.agg === 'last') {
                    const cur = nums[nums.length - 1], diff = round(cur - nums[0]);
                    out.push({ label: f.label, value: cur + unit, sub: nums.length > 1 ? (diff > 0 ? '▲ ' : diff < 0 ? '▼ ' : '') + Math.abs(diff) + unit + ' since the start' : 'first entry' });
                } else if (f.agg === 'avg') {
                    const last = nums.slice(-7);
                    out.push({ label: 'Avg ' + f.label.toLowerCase(), value: round(last.reduce((s, n) => s + n, 0) / last.length) + unit, sub: 'last ' + last.length + ' entries' });
                } else {
                    out.push({ label: 'Best ' + f.label.toLowerCase(), value: Math.max(...nums) + unit, sub: 'all time' });
                }
            } else if (f.type === 'rating') {
                const last = rows.slice(-7).map(x => Number(x.v));
                out.push({ label: 'Avg ' + f.label.toLowerCase(), value: round(last.reduce((s, n) => s + n, 0) / last.length) + ' / 5', sub: 'last ' + last.length + ' entries' });
            } else if (f.type === 'yesno') {
                const last = rows.slice(-30);
                out.push({ label: f.label, value: Math.round(last.filter(x => x.v === true).length / last.length * 100) + '% yes', sub: 'last ' + last.length + ' entries' });
            }
        });
        return out;
    },

    // ---------------------------------------------------------------------
    // Chart data: the chart type is picked from the field type
    // ---------------------------------------------------------------------
    chartSpecs: (course, metrics) => {
        const specs = [];
        const today = Analytics.today();
        const goal = Trackers.safeGoal(course.goal);
        const done = Trackers.sorted(metrics.filter(m => m.status === 'Done'));
        const perDay = (fid) => {
            const map = {};
            done.forEach(m => {
                const v = Trackers.rawValue(m, fid);
                if (v === undefined || v === null || v === '') return;
                (map[m.date] = map[m.date] || []).push(v);
            });
            return map;
        };
        const short = (d) => d.slice(5);

        Trackers.fields(course).forEach(f => {
            if (specs.length >= 6) return;
            const targetOf = () => (goal && goal.field === f.id && (goal.kind === 'daily' || goal.kind === 'reach')) ? goal.value : null;
            if (f.type === 'number') {
                const map = perDay(f.id);
                if (!Object.keys(map).length) return;
                if (f.agg === 'sum') {
                    const days = Array.from({ length: 14 }, (_, i) => Analytics.addDays(today, i - 13));
                    specs.push({ id: 'fc_' + f.id, title: f.label + ' per day', type: 'bar', unit: f.unit, target: targetOf(),
                        labels: days.map(short), data: days.map(d => Trackers.aggregate(map[d] || [], 'sum')) });
                } else {
                    const dates = Object.keys(map).sort().slice(-30);
                    specs.push({ id: 'fc_' + f.id, title: f.label + ' over time', type: 'line', unit: f.unit, target: targetOf(),
                        labels: dates.map(short), data: dates.map(d => Trackers.aggregate(map[d], f.agg)) });
                }
            } else if (f.type === 'rating') {
                const map = perDay(f.id);
                const dates = Object.keys(map).sort().slice(-30);
                if (!dates.length) return;
                specs.push({ id: 'fc_' + f.id, title: f.label + ' (1-5)', type: 'line', unit: '', target: null, yMin: 0, yMax: 5,
                    labels: dates.map(short), data: dates.map(d => Trackers.aggregate(map[d], 'avg')) });
            } else if (f.type === 'yesno') {
                const weeks = Array.from({ length: 8 }, (_, i) => Analytics.addDays(Analytics.weekStart(today), (i - 7) * 7));
                const data = weeks.map(w => {
                    const end = Analytics.addDays(w, 6);
                    const vals = done.filter(m => m.date >= w && m.date <= end).map(m => Trackers.rawValue(m, f.id)).filter(v => typeof v === 'boolean');
                    return vals.length ? Math.round(vals.filter(Boolean).length / vals.length * 100) : 0;
                });
                if (data.every(n => n === 0)) return;
                specs.push({ id: 'fc_' + f.id, title: f.label + ' - % yes per week', type: 'bar', unit: '%', target: null, yMin: 0, yMax: 100,
                    labels: weeks.map(short), data });
            }
        });
        return specs;
    }
});

console.log('✓ Tracker stats module loaded');
