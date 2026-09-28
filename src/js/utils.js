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
        return password && password.length >= 6;
    },

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