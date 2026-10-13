/**
 * Monthly report card - computed in the browser from your own entries (no extra database reads
 * beyond the entries already loaded). Print it or "Save as PDF" from the browser print dialog.
 */

const ReportModule = {
    scope: null,      // { type:'goal'|'all', course?, metrics, goals? }
    month: null,      // 'YYYY-MM'

    monthKey: (dateKey) => String(dateKey).slice(0, 7),

    monthLabel: (key) => {
        const [y, m] = key.split('-').map(Number);
        return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    },

    shift: (key, n) => {
        const [y, m] = key.split('-').map(Number);
        const d = new Date(y, m - 1 + n, 1);
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    },

    daysIn: (key) => {
        const [y, m] = key.split('-').map(Number);
        return new Date(y, m, 0).getDate();
    },

    /** Pure calculation for one month of entries */
    compute: (metrics, key) => {
        const inMonth = (list, k) => list.filter(m => m.date && m.date.slice(0, 7) === k);
        const stats = (list) => {
            const done = list.filter(m => m.status === 'Done');
            const doneDays = new Set(done.map(m => m.date));
            return {
                entries: list.length,
                doneDays: doneDays.size,
                missed: new Set(list.filter(m => m.status === 'Missed').map(m => m.date)).size,
                minutes: done.reduce((s, m) => s + (Number(m.duration) || 0), 0),
                dates: [...doneDays].sort()
            };
        };
        const cur = inMonth(metrics, key);
        const now = stats(cur);
        const prev = stats(inMonth(metrics, ReportModule.shift(key, -1)));

        // Longest run of consecutive Done days inside the month
        let best = 0, run = 0, last = null;
        now.dates.forEach(d => {
            run = last && Analytics.daysBetween(last, d) === 1 ? run + 1 : 1;
            best = Math.max(best, run);
            last = d;
        });

        const today = Analytics.today();
        const total = ReportModule.daysIn(key);
        const elapsed = key === ReportModule.monthKey(today) ? Number(today.slice(8, 10))
            : (key > ReportModule.monthKey(today) ? 0 : total);

        // Top topics
        const topics = {};
        cur.filter(m => m.status === 'Done' && (m.topic || '').trim()).forEach(m => {
            const t = m.topic.trim();
            topics[t] = (topics[t] || 0) + 1;
        });
        const topTopics = Object.entries(topics).sort((a, b) => b[1] - a[1]).slice(0, 3);

        // Best day
        const byDay = {};
        cur.filter(m => m.status === 'Done').forEach(m => { byDay[m.date] = (byDay[m.date] || 0) + (Number(m.duration) || 0); });
        const bestDay = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0] || null;

        // Personal record of the extra measurement (weight / reps ...)
        let pr = null;
        cur.filter(m => Number(m.value) > 0).forEach(m => {
            if (!pr || Number(m.value) > pr.value) pr = { value: Number(m.value), unit: m.unit || '', topic: m.topic || '' };
        });

        // Weekly buckets for a mini bar chart (Mon-based)
        const weeks = {};
        cur.filter(m => m.status === 'Done').forEach(m => {
            const wk = Analytics.weekStart(m.date);
            weeks[wk] = (weeks[wk] || 0) + (Number(m.duration) || 0);
        });

        return {
            key, label: ReportModule.monthLabel(key),
            doneDays: now.doneDays, missed: now.missed, minutes: now.minutes, entries: now.entries,
            consistency: elapsed ? Math.round(now.doneDays / elapsed * 100) : 0,
            elapsed, total, bestStreak: best, topTopics, bestDay, pr,
            weeks: Object.entries(weeks).sort((a, b) => (a[0] < b[0] ? -1 : 1)),
            prev: { doneDays: prev.doneDays, minutes: prev.minutes, label: ReportModule.monthLabel(ReportModule.shift(key, -1)) }
        };
    },

    verdict: (r) => {
        if (!r.entries) return 'A fresh page - nothing logged this month yet. Day one is whenever you decide it is 🌱';
        const diff = r.doneDays - r.prev.doneDays;
        const trend = !r.prev.doneDays ? '' : diff > 0 ? ` That is ${diff} more active day${diff === 1 ? '' : 's'} than ${r.prev.label}. 📈`
            : diff < 0 ? ` That is ${-diff} fewer than ${r.prev.label} - a small dip, not a disaster. 💪` : ` Exactly as steady as ${r.prev.label}. 🎯`;
        if (r.consistency >= 80) return `Incredible month - you showed up on ${r.doneDays} days!${trend} 🏆`;
        if (r.consistency >= 50) return `Solid month - ${r.doneDays} active days.${trend} 🔥`;
        return `You showed up on ${r.doneDays} day${r.doneDays === 1 ? '' : 's'} - every one counts.${trend} 🌱`;
    },

    /** Months that have data (newest first) plus the current month */
    months: (metrics) => {
        const set = new Set(metrics.map(m => (m.date || '').slice(0, 7)).filter(k => /^\d{4}-\d{2}$/.test(k)));
        set.add(ReportModule.monthKey(Analytics.today()));
        return [...set].sort().reverse().slice(0, 18);
    },

    html: () => {
        const esc = Utils.esc;
        const sc = ReportModule.scope;
        const r = ReportModule.compute(sc.metrics, ReportModule.month);
        const me = ProfileManager.mine() || {};
        const who = (me.avatar || '🙂') + ' ' + (me.displayName || AuthModule.getCurrentUser().email);
        const maxWeek = Math.max(1, ...r.weeks.map(w => w[1]));
        const delta = (a, b) => (a === b ? '' : `<small class="${a > b ? 'up' : 'down'}">${a > b ? '▲' : '▼'} ${Math.abs(a - b)} vs last month</small>`);
        const title = sc.type === 'goal' ? `${Categories.get(sc.course).emoji} ${esc(sc.course.courseName)}` : '🌟 All my goals';

        // Per-goal breakdown (only for the "all goals" report)
        let perGoal = '';
        if (sc.type === 'all' && sc.goals) {
            const rows = sc.goals.map(g => {
                const gr = ReportModule.compute(sc.metrics.filter(m => m.courseId === g.id), ReportModule.month);
                return { g, gr };
            }).filter(x => x.gr.entries).sort((a, b) => b.gr.doneDays - a.gr.doneDays);
            if (rows.length) {
                perGoal = `<h3>By goal</h3><table class="metrics-table report-table"><thead><tr><th>Goal</th><th>Active days</th><th>Minutes</th><th>Consistency</th></tr></thead><tbody>
                    ${rows.map(x => `<tr><td>${Categories.get(x.g).emoji} ${esc(x.g.courseName)}</td><td>${x.gr.doneDays}</td><td>${x.gr.minutes}</td><td>${x.gr.consistency}%</td></tr>`).join('')}
                </tbody></table>`;
            }
        }

        const options = ReportModule.months(sc.metrics).map(k =>
            `<option value="${esc(k)}" ${k === r.key ? 'selected' : ''}>${esc(ReportModule.monthLabel(k))}</option>`).join('');

        return `
            <div class="modal-box report-box">
                <div class="report-controls no-print">
                    <select id="reportMonth" onchange="AppController.reportMonth(this.value)">${options}</select>
                    <button class="btn btn-primary btn-sm" onclick="AppController.printReport()">🖨️ Print / Save PDF</button>
                    <button class="btn btn-secondary btn-sm" onclick="AppController.closeReport()">Close</button>
                </div>
                <div class="report-sheet">
                    <div class="report-head">
                        <div><h2>📅 ${esc(r.label)} Report Card</h2><p class="muted">${title} &middot; ${esc(who)}</p></div>
                        <div class="report-grade">${r.consistency}%<small>consistency</small></div>
                    </div>
                    <p class="verdict">${esc(ReportModule.verdict(r))}</p>
                    <div class="report-stats">
                        <div><div class="week-num">${r.doneDays}</div><div class="week-lbl">Active days</div>${delta(r.doneDays, r.prev.doneDays)}</div>
                        <div><div class="week-num">${r.minutes}</div><div class="week-lbl">Minutes</div>${delta(r.minutes, r.prev.minutes)}</div>
                        <div><div class="week-num">${r.bestStreak}</div><div class="week-lbl">Best run (days)</div></div>
                        <div><div class="week-num">${r.missed}</div><div class="week-lbl">Missed days</div></div>
                    </div>
                    ${r.weeks.length ? `<h3>Minutes by week</h3><div class="mini-bars">${r.weeks.map(([wk, min]) =>
                        `<div class="mini-bar"><div class="mini-fill" style="height:${Math.max(4, Math.round(min / maxWeek * 100))}%"></div><span>${min}</span><small>${esc(Utils.formatDate(wk).replace(/, \d{4}$/, ''))}</small></div>`).join('')}</div>` : ''}
                    <div class="report-cols">
                        <div><h3>Top topics</h3>${r.topTopics.length ? `<ol>${r.topTopics.map(([t, n]) => `<li>${esc(t)} <small>(${n}x)</small></li>`).join('')}</ol>` : '<p class="muted">-</p>'}</div>
                        <div><h3>Highlights</h3><ul>
                            <li>${r.bestDay ? `Best day: ${esc(Utils.formatDate(r.bestDay[0]))} (${r.bestDay[1]} min)` : 'Best day: -'}</li>
                            ${r.pr ? `<li>Personal best: ${esc(r.pr.value)} ${esc(r.pr.unit)} ${r.pr.topic ? '(' + esc(r.pr.topic) + ')' : ''}</li>` : ''}
                            <li>${r.elapsed ? `Showed up ${r.doneDays} of ${r.elapsed} day${r.elapsed === 1 ? '' : 's'}` : 'This month has not started yet'}</li>
                        </ul></div>
                    </div>
                    ${perGoal}
                    <p class="muted report-foot">Generated by Learning Tracker on ${esc(Utils.formatDate(Analytics.today()))}</p>
                </div>
            </div>`;
    },

    open: (scope) => {
        ReportModule.scope = scope;
        ReportModule.month = ReportModule.monthKey(Analytics.today());
        ReportModule.render();
    },

    render: () => {
        let overlay = document.getElementById('reportModal');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'reportModal';
            overlay.className = 'modal-overlay';
            overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
            document.body.appendChild(overlay);
        }
        overlay.innerHTML = ReportModule.html();
    }
};

console.log('✓ Report module loaded');
