/**
 * Utility Functions Module
 * Common helper functions used throughout the application
 */

const Utils = {
    /**
     * Format date string to readable format
     * @param {string} dateStr - Date string (YYYY-MM-DD)
     * @returns {string} - Formatted date
     */
    formatDate: (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },

    /**
     * Calculate days remaining from start date
     * @param {string} startDate - Start date (YYYY-MM-DD)
     * @returns {number} - Days elapsed
     */
    calculateDaysElapsed: (startDate) => {
        if (!startDate) return 0;
        const start = new Date(startDate);
        const today = new Date();
        const diff = today - start;
        return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
    },

    /**
     * Calculate consistency percentage
     * @param {number} completedDays - Number of completed days
     * @param {number} totalDays - Total days elapsed
     * @returns {number} - Percentage (0-100)
     */
    calculateConsistency: (completedDays, totalDays) => {
        if (totalDays === 0) return 0;
        return Math.round((completedDays / totalDays) * 100);
    },

    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean} - Is valid email
     */
    isValidEmail: (email) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    },

    /**
     * Validate password strength
     * @param {string} password - Password to validate
     * @returns {boolean} - Is valid password (min 6 chars)
     */
    isValidPassword: (password) => {
        return !Utils.passwordIssue(password);
    },

    /**
     * Password policy: 8+ characters with at least one letter and one number
     * @returns {string|null} - Problem description, or null when the password is fine
     */
    passwordIssue: (password) => {
        if (!password || password.length < 8) return 'Password must be at least 8 characters';
        if (password.length > 128) return 'Password is too long (max 128 characters)';
        if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Password must include at least one letter and one number';
        if (/^(password|12345678|qwertyui|11111111)/i.test(password)) return 'That password is too common - pick something harder to guess';
        return null;
    },

    /** Make any id safe to use inside an HTML id attribute / selector */
    domId: (value) => String(value == null ? '' : value).replace(/[^A-Za-z0-9_-]/g, '_'),

    /**
     * Safe JavaScript string literal for use INSIDE a double-quoted HTML attribute
     * (e.g. onclick="Fn(${Utils.js(id)})"). Never put raw data between quotes in a handler.
     */
    js: (value) => Utils.esc(JSON.stringify(String(value == null ? '' : value))),


    /**
     * Get ordinal suffix for numbers (1st, 2nd, 3rd, etc.)
     * @param {number} num - Number
     * @returns {string} - Ordinal number
     */
    getOrdinal: (num) => {
        const j = num % 10;
        const k = num % 100;
        if (j === 1 && k !== 11) return num + 'st';
        if (j === 2 && k !== 12) return num + 'nd';
        if (j === 3 && k !== 13) return num + 'rd';
        return num + 'th';
    },

    /**
     * Escape text for safe insertion into HTML
     * @param {*} value - Any value
     * @returns {string} - Escaped string
     */
    esc: (value) => {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    /**
     * Normalise a user-typed URL. Only http(s) links are allowed.
     * @returns {string|null} - Safe absolute URL or null
     */
    safeUrl: (raw) => {
        let u = (raw || '').trim();
        if (!u) return null;
        if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(u)) u = 'https://' + u;
        try {
            const x = new URL(u);
            if (x.protocol !== 'http:' && x.protocol !== 'https:') return null;
            return x.href;
        } catch (e) {
            return null;
        }
    },

    /**
     * Tiny, SAFE markdown -> HTML (headings, bold, italic, code, lists, links, quotes).
     * All input is HTML-escaped FIRST, so no user HTML can ever get through.
     */
    md: (text) => {
        const lines = Utils.esc(String(text || '')).split('\n');
        const inline = (t) => t
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
            .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
        let out = '', list = null, code = false;
        const closeList = () => { if (list) { out += '</' + list + '>'; list = null; } };
        for (const raw of lines) {
            if (/^```/.test(raw)) { closeList(); out += code ? '</pre>' : '<pre>'; code = !code; continue; }
            if (code) { out += raw + '\n'; continue; }
            let m;
            if ((m = raw.match(/^(#{1,3})\s+(.*)$/))) { closeList(); out += '<h' + (m[1].length + 2) + '>' + inline(m[2]) + '</h' + (m[1].length + 2) + '>'; }
            else if ((m = raw.match(/^\s*[-*]\s+(.*)$/))) { if (list !== 'ul') { closeList(); out += '<ul>'; list = 'ul'; } out += '<li>' + inline(m[1]) + '</li>'; }
            else if ((m = raw.match(/^\s*\d+\.\s+(.*)$/))) { if (list !== 'ol') { closeList(); out += '<ol>'; list = 'ol'; } out += '<li>' + inline(m[1]) + '</li>'; }
            else if ((m = raw.match(/^&gt;\s?(.*)$/))) { closeList(); out += '<blockquote>' + inline(m[1]) + '</blockquote>'; }
            else if (!raw.trim()) { closeList(); }
            else { closeList(); out += '<p>' + inline(raw) + '</p>'; }
        }
        closeList();
        if (code) out += '</pre>';
        return out;
    },

    /** Human-friendly message for Firebase errors */
    explain: (error) => {
        if (error && error.code === 'permission-denied') {
            return 'Permission denied - publish the latest firestore.rules in Firebase Console (Firestore Database > Rules).';
        }
        return (error && error.message) || 'Something went wrong';
    },

    /** "5m ago" style label */
    timeAgo: (value) => {
        const ms = value && value.toMillis ? value.toMillis() : new Date(value || Date.now()).getTime();
        const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
        if (s < 60) return 'just now';
        if (s < 3600) return Math.floor(s / 60) + 'm ago';
        if (s < 86400) return Math.floor(s / 3600) + 'h ago';
        if (s < 86400 * 7) return Math.floor(s / 86400) + 'd ago';
        return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    },

    /**
     * Show error message to user
     * @param {string} message - Error message
     */
    showError: (message) => {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'toast toast-error';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);

        setTimeout(() => {
            errorDiv.classList.add('show');
        }, 10);

        setTimeout(() => {
            errorDiv.classList.remove('show');
            setTimeout(() => errorDiv.remove(), 300);
        }, 3000);
    },

    /**
     * Show success message to user
     * @param {string} message - Success message
     */
    showSuccess: (message) => {
        const successDiv = document.createElement('div');
        successDiv.className = 'toast toast-success';
        successDiv.textContent = message;
        document.body.appendChild(successDiv);

        setTimeout(() => {
            successDiv.classList.add('show');
        }, 10);

        setTimeout(() => {
            successDiv.classList.remove('show');
            setTimeout(() => successDiv.remove(), 300);
        }, 3000);
    },

    /**
     * Generate unique ID
     * @returns {string} - Unique ID
     */
    generateId: () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    /**
     * Debounce function calls
     * @param {function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {function} - Debounced function
     */
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

console.log('✓ Utils module loaded');