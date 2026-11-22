/**
 * Tracker UI: entry-form fields, the field / goal editors, the "new tracker" and "edit tracker"
 * screens, goal + summary cards and per-field charts. Every dynamic value is escaped.
 */

const TrackerUI = {
    draft: { mode: 'create', courseId: null, category: 'study', fields: [], goal: null },

    // =====================================================================
    // Entry form fields (dashboard log form + quick log modal)
    // =====================================================================
    formFieldsHtml: (course, values, prefix) => {
        const esc = Utils.esc;
        values = values || {};
        prefix = prefix || 'fld_';
        return Trackers.fields(course).map(f => {
            const id = prefix + f.id;
            const v = values[f.id];
            const sel = (val) => (String(v) === String(val) ? 'selected' : '');
            let input;
            if (f.type === 'number') {
                input = `<input type="number" step="any" inputmode="decimal" id="${id}" placeholder="0" value="${v === undefined ? '' : esc(v)}">`;
            } else if (f.type === 'rating') {
                input = `<select id="${id}"><option value="">-</option>${[1, 2, 3, 4, 5].map(n => `<option value="${n}" ${sel(n)}>${n} ${'⭐'.repeat(n)}</option>`).join('')}</select>`;
            } else if (f.type === 'yesno') {
                input = `<select id="${id}"><option value="">-</option><option value="yes" ${v === true ? 'selected' : ''}>Yes ✅</option><option value="no" ${v === false ? 'selected' : ''}>No</option></select>`;
            } else if (f.type === 'choice') {
                input = `<select id="${id}"><option value="">-</option>${f.options.map(o => `<option value="${esc(o)}" ${sel(o)}>${esc(o)}</option>`).join('')}</select>`;
            } else {
                input = `<input type="text" id="${id}" maxlength="200" value="${v === undefined ? '' : esc(v)}">`;
            }
            return `<div class="form-group"><label>${esc(f.label)}${f.unit ? ' <small>(' + esc(f.unit) + ')</small>' : ''}</label>${input}</div>`;
        }).join('');
    },

    /** Raw strings from the form -> typed values (clean + validated) */
    readForm: (course, prefix) => {
        prefix = prefix || 'fld_';
        const raw = {};
        Trackers.fields(course).forEach(f => {
            const el = document.getElementById(prefix + f.id);
            if (el) raw[f.id] = el.value;
        });
        return Trackers.cleanValues(course, raw);
    },

    /** Put stored values back into the (already rendered) form - for editing an entry */
    fillForm: (course, values, prefix) => {
        prefix = prefix || 'fld_';
        values = values || {};
        Trackers.fields(course).forEach(f => {
            const el = document.getElementById(prefix + f.id);
            if (!el) return;
            const v = values[f.id];
            el.value = v === undefined ? '' : (typeof v === 'boolean' ? (v ? 'yes' : 'no') : String(v));
        });
    },

    // =====================================================================
    // Cards shown on the tracker dashboard
    // =====================================================================
    goalCardHtml: (prog) => {
        if (!prog) return '';
        const esc = Utils.esc;
        return `<div class="form-section goal-prog ${prog.met ? 'met' : ''} ${prog.over ? 'over' : ''}">
            <h2>🎯 ${esc(prog.title)}</h2>
            <div class="progress-line"><div class="progress-fill ${prog.over ? 'danger' : ''}" style="width:${Number(prog.pct) || 0}%"></div></div>
            <p class="muted">${esc(prog.text)} ${prog.met ? '🎉' : ''}</p>
        </div>`;
    },

    summaryCardsHtml: (list) => {
        if (!list.length) return '';
        const esc = Utils.esc;
        return `<div class="stats-grid">${list.map(s => `
            <div class="stat-card"><div class="stat-value stat-small">${esc(s.value)}</div>
            <div class="stat-label">${esc(s.label)}<br><small>${esc(s.sub)}</small></div></div>`).join('')}</div>`;
    },

    chartsSectionHtml: (specs) => specs.length ? `
        <div class="form-section"><h2>📈 Your Numbers</h2>
            <div class="field-charts">${specs.map(s => `<div class="field-chart"><h3>${Utils.esc(s.title)}</h3><div class="chart-box"><canvas id="${Utils.esc(s.id)}"></canvas></div></div>`).join('')}</div>
        </div>` : '',

    renderFieldCharts: (specs) => {
        if (typeof Chart === 'undefined') return;
        const css = getComputedStyle(document.body);
        const line = css.getPropertyValue('--chart-line').trim() || '#667eea';
        const grid = css.getPropertyValue('--chart-grid').trim() || 'rgba(0,0,0,0.08)';
        const text = css.getPropertyValue('--chart-text').trim() || '#555';
        specs.forEach(s => {
            const el = document.getElementById(s.id);
            if (!el) return;
            const datasets = [{
                label: s.title, data: s.data, borderColor: line,
                backgroundColor: s.type === 'bar' ? 'rgba(102,126,234,0.65)' : 'rgba(102,126,234,0.15)',
                fill: s.type === 'line', tension: 0.3, borderRadius: 6
            }];
            if (s.target !== null && s.target !== undefined) {
                datasets.push({ type: 'line', label: 'Target', data: s.labels.map(() => s.target), borderColor: '#e67e22',
                    borderDash: [6, 6], pointRadius: 0, fill: false });
            }
            UIModule.charts.push(new Chart(el, {
                type: s.type,
                data: { labels: s.labels, datasets },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: s.target !== null && s.target !== undefined, labels: { color: text } } },
                    scales: {
                        x: { ticks: { color: text }, grid: { color: grid }, border: { display: false } },
                        y: { beginAtZero: s.type === 'bar' || s.yMin === 0, min: s.yMin, max: s.yMax, ticks: { color: text }, grid: { color: grid }, border: { display: false } }
                    }
                }
            }));
        });
    },

    // =====================================================================
    // Draft + editors
    // =====================================================================
    startDraft: (category) => {
        const key = Trackers.key(category);
        const tpl = Trackers.templates[key];
        TrackerUI.draft = {
            mode: 'create', courseId: null, category: key,
            fields: tpl.fields.map((f, i) => ({ ...f, id: 'f' + (i + 1), options: (f.options || []).slice() })),
            goal: tpl.goal ? { kind: tpl.goal.kind, field: tpl.goal.field, op: tpl.goal.op, value: tpl.goal.value == null ? '' : tpl.goal.value }
                : { kind: '', field: '', op: 'atLeast', value: '' }
        };
    },

    startEditDraft: (course) => {
        const g = Trackers.safeGoal(course.goal);
        TrackerUI.draft = {
            mode: 'edit', courseId: course.id, category: Trackers.key(course),
            fields: Trackers.allFields(course).map(f => ({ ...f, saved: true })),
            goal: g ? { ...g } : { kind: '', field: '', op: 'atLeast', value: '' }
        };
    },

    draftCourse: () => ({
        category: TrackerUI.draft.category,
        fields: TrackerUI.draft.fields.filter(f => !f.archived)
    }),

    fieldEditorHtml: () => {
        const esc = Utils.esc;
        const d = TrackerUI.draft;
        const rows = d.fields.map((f, i) => ({ f, i }));
        const active = rows.filter(x => !x.f.archived);
        const archived = rows.filter(x => x.f.archived);
        return `
            ${active.length ? '' : '<p class="muted">No extra fields yet - add what you want to record each time (weight, calories, reps, mood...).</p>'}
            ${active.map(({ f, i }) => `
            <div class="fe-row">
                <input type="text" class="fe-label" maxlength="40" placeholder="Field name" value="${esc(f.label)}" oninput="TrackerUI.setField(${i}, 'label', this.value)">
                <select onchange="TrackerUI.setField(${i}, 'type', this.value)">
                    ${Object.entries(Trackers.fieldTypes).map(([k, l]) => `<option value="${esc(k)}" ${f.type === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}
                </select>
                ${f.type === 'number' ? `
                    <input type="text" class="fe-unit" maxlength="12" placeholder="unit, e.g. kg" value="${esc(f.unit || '')}" oninput="TrackerUI.setField(${i}, 'unit', this.value)">
                    <select title="How to combine several entries" onchange="TrackerUI.setField(${i}, 'agg', this.value)">
                        ${Object.entries(Trackers.aggLabels).map(([k, l]) => `<option value="${esc(k)}" ${(f.agg || 'sum') === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}
                    </select>` : ''}
                ${f.type === 'choice' ? `<input type="text" class="fe-opts" placeholder="Choices, comma separated" value="${esc(Array.isArray(f.options) ? f.options.join(', ') : f.options || '')}" oninput="TrackerUI.setField(${i}, 'options', this.value)">` : ''}
                <button type="button" class="icon-btn" title="Remove field" onclick="TrackerUI.removeField(${i})">✕</button>
            </div>`).join('')}
            ${active.length < Trackers.MAX_ACTIVE ? '<button type="button" class="btn btn-secondary btn-sm" onclick="TrackerUI.addField()">+ Add field</button>' : '<p class="muted">Maximum ' + Trackers.MAX_ACTIVE + ' fields.</p>'}
            ${archived.length ? `<p class="muted" style="margin-top:10px">Removed (data kept): ${archived.map(({ f, i }) => `<a href="#" class="tag" onclick="TrackerUI.restoreField(${i}); return false;">↩ ${esc(f.label)}</a>`).join(' ')}</p>` : ''}`;
    },

    goalEditorHtml: () => {
        const esc = Utils.esc;
        const g = TrackerUI.draft.goal || { kind: '', field: '', op: 'atLeast', value: '' };
        const gf = Trackers.goalFields(TrackerUI.draftCourse());
        const fieldSel = `<select onchange="TrackerUI.setGoal('field', this.value)">
            <option value="">Pick a field</option>
            ${gf.map(f => `<option value="${esc(f.id)}" ${g.field === f.id ? 'selected' : ''}>${esc(f.label)}${f.unit ? ' (' + esc(f.unit) + ')' : ''}</option>`).join('')}</select>`;
        const valueIn = (ph) => `<input type="number" step="any" min="0" placeholder="${esc(ph)}" value="${g.value === '' || g.value == null ? '' : esc(g.value)}" oninput="TrackerUI.setGoal('value', this.value)">`;
        return `
            <div class="goal-row">
                <select onchange="TrackerUI.setGoalKind(this.value)">
                    <option value="">No goal</option>
                    ${Object.entries(Trackers.goalKinds).map(([k, l]) => `<option value="${esc(k)}" ${g.kind === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}
                </select>
                ${g.kind === 'frequency' ? `${valueIn('days')} <span class="muted">days a week</span>` : ''}
                ${g.kind === 'daily' || g.kind === 'weekly' ? `${fieldSel}
                    <select onchange="TrackerUI.setGoal('op', this.value)">
                        <option value="atLeast" ${g.op !== 'atMost' ? 'selected' : ''}>at least</option>
                        <option value="atMost" ${g.op === 'atMost' ? 'selected' : ''}>at most</option></select>
                    ${valueIn('amount')} <span class="muted">${g.kind === 'daily' ? 'per day' : 'per week'}</span>` : ''}
                ${g.kind === 'reach' ? `${fieldSel} <span class="muted">target</span> ${valueIn('target value')}` : ''}
            </div>
            ${(g.kind === 'daily' || g.kind === 'weekly' || g.kind === 'reach') && !gf.length ? '<p class="muted">Add a number field above to set an amount goal.</p>' : ''}
            <p class="muted">${g.kind === 'frequency' ? 'Counts the days you log something.' :
                g.kind === 'reach' ? 'Progress shows how far you have moved from your first entry to the target (works for losing or gaining).' :
                g.kind ? 'Several entries in the same period are combined using each field\'s "Add up / Average / Latest / Highest" setting.' :
                'A goal shows a progress bar on your Home screen and dashboard.'}</p>`;
    },

    refreshEditors: () => {
        const f = document.getElementById('fieldEditor');
        if (f) f.innerHTML = TrackerUI.fieldEditorHtml();
        TrackerUI.refreshGoalEditor();
    },
    refreshGoalEditor: () => {
        const g = document.getElementById('goalEditor');
        if (g) g.innerHTML = TrackerUI.goalEditorHtml();
    },

    addField: () => {
        const d = TrackerUI.draft;
        if (d.fields.filter(f => !f.archived).length >= Trackers.MAX_ACTIVE) return;
        const used = new Set(d.fields.map(f => f.id));
        let id = null;
        for (let i = 1; i <= Trackers.SLOTS; i++) { if (!used.has('f' + i)) { id = 'f' + i; break; } }
        if (!id) { Utils.showError('All ' + Trackers.SLOTS + ' field slots are used (removed fields keep theirs)'); return; }
        d.fields.push({ id, label: '', type: 'number', unit: '', agg: 'sum', options: [] });
        TrackerUI.refreshEditors();
        const inputs = document.querySelectorAll('#fieldEditor .fe-label');
        if (inputs.length && inputs[inputs.length - 1].focus) inputs[inputs.length - 1].focus();
    },

    removeField: (i) => {
        const d = TrackerUI.draft;
        const f = d.fields[i];
        if (!f) return;
        if (f.saved) f.archived = true; else d.fields.splice(i, 1);
        if (d.goal && d.goal.field === f.id) d.goal.field = '';
        TrackerUI.refreshEditors();
    },

    restoreField: (i) => {
        const f = TrackerUI.draft.fields[i];
        if (!f) return;
        if (TrackerUI.draft.fields.filter(x => !x.archived).length >= Trackers.MAX_ACTIVE) { Utils.showError('Maximum ' + Trackers.MAX_ACTIVE + ' fields'); return; }
        f.archived = false;
        TrackerUI.refreshEditors();
    },

    setField: (i, prop, value) => {
        const f = TrackerUI.draft.fields[i];
        if (!f || !['label', 'type', 'unit', 'agg', 'options'].includes(prop)) return;
        f[prop] = value;
        if (prop === 'type') {
            if (value !== 'number') { f.unit = ''; }
            if (value === 'number' && !f.agg) f.agg = 'sum';
            const g = TrackerUI.draft.goal;
            if (value !== 'number' && g && g.field === f.id) g.field = '';
            TrackerUI.refreshEditors();
        } else if (prop === 'label' || prop === 'unit') {
            TrackerUI.refreshGoalEditor();
        }
    },

    setGoalKind: (kind) => {
        const d = TrackerUI.draft;
        const gf = Trackers.goalFields(TrackerUI.draftCourse());
        const prev = d.goal || {};
        d.goal = { kind: Trackers.goalKinds[kind] ? kind : '', field: '', op: 'atLeast', value: '' };
        if (kind === 'frequency') d.goal.value = prev.kind === 'frequency' ? prev.value : 4;
        if ((kind === 'daily' || kind === 'weekly' || kind === 'reach') && gf.length) d.goal.field = gf[0].id;
        TrackerUI.refreshGoalEditor();
    },

    setGoal: (prop, value) => {
        const g = TrackerUI.draft.goal;
        if (!g || !['field', 'op', 'value'].includes(prop)) return;
        g[prop] = value;
    },

    /** Validate and return what to store. Throws Error with a friendly message. */
    collect: () => {
        const d = TrackerUI.draft;
        const rows = d.fields.filter(f => f.saved || String(f.label || '').trim());
        const fields = Trackers.cleanFields(rows);
        const goal = Trackers.cleanGoal(d.goal && d.goal.kind ? d.goal : null, { category: d.category, fields });
        return { category: d.category, fields, goal };
    }
};

console.log('✓ Tracker UI module loaded');
