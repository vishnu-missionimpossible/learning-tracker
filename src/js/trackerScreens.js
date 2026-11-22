/**
 * Tracker screens: "Start a tracker" (template picker + field/goal editors) and "Edit tracker".
 */

Object.assign(TrackerUI, {

    includesHint: (tpl) => {
        const parts = ['date', 'notes'];
        if (tpl.showDuration) parts.push('minutes');
        if (tpl.showTopic) parts.push((tpl.topicLabel || 'topic').toLowerCase());
        if (tpl.showStatus) parts.push('done / missed');
        return 'Every entry also records: ' + parts.join(', ') + '.';
    },

    renderSetup: (category) => {
        TrackerUI.startDraft(category || 'study');
        const d = TrackerUI.draft;
        const tpl = Trackers.templates[d.category];
        const esc = Utils.esc;
        document.getElementById('app-root').innerHTML = `
            <div class="main-container">
                <div class="header">
                    <h1>✨ Start a New Tracker</h1>
                    <button class="btn btn-secondary" onclick="AppController.showCourses()">← Back to Home</button>
                </div>
                <div class="content">
                    <div class="form-section">
                        <h2>What do you want to track?</h2>
                        <div class="cat-chips" id="catChips">
                            ${Trackers.order.map(k => `<button type="button" class="cat-chip ${k === d.category ? 'active' : ''}" data-cat="${esc(k)}" onclick="TrackerUI.setTemplate(${Utils.js(k)})">${Trackers.templates[k].emoji} ${esc(Trackers.templates[k].name)}</button>`).join('')}
                        </div>
                        <p class="muted" id="setupBlurb">${esc(tpl.blurb)}</p>
                    </div>

                    <div class="form-section">
                        <h2 id="setupHeading">${esc(tpl.heading)}</h2>
                        <div class="form-group">
                            <label>Name *</label>
                            <input type="text" id="courseName" maxlength="100" placeholder="${esc(tpl.namePh)}">
                        </div>
                        <div class="form-group">
                            <label>Description</label>
                            <textarea id="courseDescription" maxlength="500" placeholder="${esc(tpl.descPh)}" rows="2"></textarea>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Start Date *</label>
                                <input type="text" id="startDate" class="datepicker" placeholder="Select date">
                            </div>
                            <div class="form-group">
                                <label>End Date (Optional)</label>
                                <input type="text" id="endDate" class="datepicker" placeholder="Select date">
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h2>📋 What do you log each time?</h2>
                        <p class="muted" id="includesHint">${esc(TrackerUI.includesHint(tpl))}</p>
                        <div id="fieldEditor">${TrackerUI.fieldEditorHtml()}</div>
                    </div>

                    <div class="form-section">
                        <h2>🎯 Your goal <small>(optional)</small></h2>
                        <div id="goalEditor">${TrackerUI.goalEditorHtml()}</div>
                    </div>

                    <button class="btn btn-primary" id="setupCta" onclick="AppController.createCourse()">${esc(tpl.cta)}</button>
                </div>
            </div>`;
        UIModule.initializeDatePickers();
        const start = document.getElementById('startDate');
        if (start && start._flatpickr) start._flatpickr.setDate(Analytics.today(), true);
    },

    /** Switch template on the setup screen without losing the name / dates typed so far */
    setTemplate: (key) => {
        TrackerUI.startDraft(key);
        const tpl = Trackers.templates[TrackerUI.draft.category];
        document.querySelectorAll('#catChips .cat-chip').forEach(b => b.classList.toggle('active', b.dataset.cat === TrackerUI.draft.category));
        const set = (id, fn) => { const el = document.getElementById(id); if (el) fn(el); };
        set('setupBlurb', el => { el.textContent = tpl.blurb; });
        set('setupHeading', el => { el.textContent = tpl.heading; });
        set('setupCta', el => { el.textContent = tpl.cta; });
        set('includesHint', el => { el.textContent = TrackerUI.includesHint(tpl); });
        set('courseName', el => { el.placeholder = tpl.namePh; });
        set('courseDescription', el => { el.placeholder = tpl.descPh; });
        TrackerUI.refreshEditors();
    },

    renderEdit: (course) => {
        TrackerUI.startEditDraft(course);
        const tpl = Trackers.tpl(course);
        const esc = Utils.esc;
        document.getElementById('app-root').innerHTML = `
            <div class="main-container">
                <div class="header">
                    <h1>${tpl.emoji} Edit tracker</h1>
                    <button class="btn btn-secondary" onclick="AppController.openCourse(${Utils.js(course.id)})">← Back</button>
                </div>
                <div class="content">
                    <div class="form-section">
                        <h2>${esc(tpl.name)}</h2>
                        <div class="form-group"><label>Name *</label>
                            <input type="text" id="courseName" maxlength="100" value="${esc(course.courseName)}"></div>
                        <div class="form-group"><label>Description</label>
                            <textarea id="courseDescription" maxlength="500" rows="2">${esc(course.description || '')}</textarea></div>
                        <div class="form-row">
                            <div class="form-group"><label>Start Date</label>
                                <input type="text" id="startDate" class="datepicker" value="${esc(course.startDate)}" disabled></div>
                            <div class="form-group"><label>End Date (Optional)</label>
                                <input type="text" id="endDate" class="datepicker" placeholder="Select date" value="${esc(course.endDate || '')}"></div>
                        </div>
                    </div>
                    <div class="form-section">
                        <h2>📋 What you log each time</h2>
                        <p class="muted">${esc(TrackerUI.includesHint(tpl))} Removed fields are hidden but their old data is kept.</p>
                        <div id="fieldEditor">${TrackerUI.fieldEditorHtml()}</div>
                    </div>
                    <div class="form-section">
                        <h2>🎯 Your goal</h2>
                        <div id="goalEditor">${TrackerUI.goalEditorHtml()}</div>
                    </div>
                    <button class="btn btn-primary" onclick="AppController.saveTracker(${Utils.js(course.id)})">Save changes 💾</button>
                    <button class="btn btn-secondary" onclick="AppController.openCourse(${Utils.js(course.id)})">Cancel</button>
                </div>
            </div>`;
        const end = document.getElementById('endDate');
        if (end && typeof flatpickr === 'function' && !end._flatpickr) {
            flatpickr(end, { dateFormat: 'Y-m-d', minDate: course.startDate, maxDate: '2035-12-31', defaultDate: course.endDate || null });
        }
    }
});

console.log('✓ Tracker screens loaded');
