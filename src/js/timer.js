/**
 * Focus Timer Module
 * Stopwatch or countdown (Pomodoro-style). State is kept in localStorage per course,
 * so it survives page refreshes and re-renders.
 */

const TimerModule = {
    courseId: null,
    interval: null,
    alerted: false,

    key: () => 'lt-timer-' + TimerModule.courseId,

    load: () => {
        try {
            const raw = localStorage.getItem(TimerModule.key());
            if (raw) return JSON.parse(raw);
        } catch (e) { /* ignore */ }
        return { mode: 0, running: false, startedAt: 0, acc: 0 }; // mode 0 = stopwatch, else minutes
    },

    save: (st) => {
        try { localStorage.setItem(TimerModule.key(), JSON.stringify(st)); } catch (e) { /* ignore */ }
    },

    elapsed: (st) => st.acc + (st.running ? Date.now() - st.startedAt : 0),

    /** Attach to the freshly rendered dashboard */
    mount: (courseId) => {
        TimerModule.courseId = courseId;
        TimerModule.alerted = false;
        clearInterval(TimerModule.interval);
        const sel = document.getElementById('timerMode');
        if (!sel) return;
        sel.value = String(TimerModule.load().mode);
        TimerModule.tick();
        TimerModule.interval = setInterval(TimerModule.tick, 500);
    },

    fmt: (ms) => {
        const total = Math.max(0, Math.floor(ms / 1000));
        const h = Math.floor(total / 3600);
        const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
        const s = String(total % 60).padStart(2, '0');
        return (h ? h + ':' : '') + m + ':' + s;
    },

    tick: () => {
        const display = document.getElementById('timerDisplay');
        if (!display) {
            clearInterval(TimerModule.interval);
            return;
        }
        const st = TimerModule.load();
        let elapsed = TimerModule.elapsed(st);

        if (st.mode > 0) {
            const target = st.mode * 60000;
            if (elapsed >= target) {
                elapsed = target;
                if (st.running) {
                    st.acc = target;
                    st.running = false;
                    TimerModule.save(st);
                    TimerModule.complete();
                }
            }
            display.textContent = TimerModule.fmt(target - elapsed);
        } else {
            display.textContent = TimerModule.fmt(elapsed);
        }

        const toggle = document.getElementById('timerToggle');
        if (toggle) toggle.textContent = st.running ? '⏸ Pause' : (elapsed > 0 ? '▶ Resume' : '▶ Start');
        const use = document.getElementById('timerUse');
        if (use) use.disabled = elapsed < 30000;
        document.getElementById('timerCard').classList.toggle('timer-running', st.running);
    },

    setMode: (value) => {
        const st = { mode: Number(value) || 0, running: false, startedAt: 0, acc: 0 };
        TimerModule.alerted = false;
        TimerModule.save(st);
        TimerModule.tick();
    },

    toggle: () => {
        const st = TimerModule.load();
        if (st.running) {
            st.acc = TimerModule.elapsed(st);
            st.running = false;
        } else {
            if (st.mode > 0 && st.acc >= st.mode * 60000) st.acc = 0;
            st.running = true;
            st.startedAt = Date.now();
            TimerModule.alerted = false;
        }
        TimerModule.save(st);
        TimerModule.tick();
    },

    reset: () => {
        const st = TimerModule.load();
        st.running = false;
        st.acc = 0;
        TimerModule.alerted = false;
        TimerModule.save(st);
        TimerModule.tick();
    },

    /** Minutes studied (rounded up, min 1) */
    minutes: () => {
        const st = TimerModule.load();
        return Math.max(1, Math.ceil(TimerModule.elapsed(st) / 60000));
    },

    complete: () => {
        if (TimerModule.alerted) return;
        TimerModule.alerted = true;
        Utils.showSuccess(Fun.msg('timerDone'));
        Fun.confetti();
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (AC) {
                const ctx = new AC();
                [0, 0.25, 0.5].forEach((t, i) => {
                    const o = ctx.createOscillator();
                    const g = ctx.createGain();
                    o.frequency.value = 660 + i * 110;
                    g.gain.value = 0.15;
                    o.connect(g);
                    g.connect(ctx.destination);
                    o.start(ctx.currentTime + t);
                    o.stop(ctx.currentTime + t + 0.18);
                });
            }
        } catch (e) { /* audio is optional */ }
        try {
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Learning Tracker ⏱️', { body: 'Focus session complete! 🎉', icon: 'icons/icon-192.png' });
            }
        } catch (e) { /* ignore */ }
    }
};

console.log('✓ Timer module loaded');
