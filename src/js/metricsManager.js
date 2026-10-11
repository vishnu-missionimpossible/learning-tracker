/**
 * Metrics Manager Module - FIXED VERSION
 * Handles CRUD operations for learning metrics with better error handling
 */

const MetricsManager = {
    isAdding: false, // Prevent duplicate submissions

    /** Whole minutes between 0 and 24h */
    cleanDuration: (value) => Math.min(1440, Math.max(0, Math.floor(Number(value) || 0))),

    /**
     * Add learning metric entry
     * @param {Object} metricData - Metric details
     * @returns {Promise} - Firestore promise
     */
    addMetric: async (metricData) => {
        // Prevent duplicate submissions
        if (MetricsManager.isAdding) {
            Utils.showError('Adding entry... Please wait');
            return;
        }

        try {
            MetricsManager.isAdding = true;
            const userId = AuthModule.getCurrentUser().uid;

            if (!metricData.courseId) {
                throw new Error('Course is required');
            }
            if (!metricData.date || !/^\d{4}-\d{2}-\d{2}$/.test(metricData.date)) {
                throw new Error('Please pick a valid date');
            }
            if (!metricData.status) {
                throw new Error('Status is required');
            }


            const metric = {
                userId: userId,
                courseId: metricData.courseId,
                date: metricData.date,
                status: metricData.status, // 'Done' or 'Missed'
                duration: MetricsManager.cleanDuration(metricData.duration), // in minutes
                topic: (metricData.topic || '').slice(0, 200),
                notes: (metricData.notes || '').slice(0, 2000),
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const docRef = await db.collection('metrics').add(metric);
            console.log('✓ Metric added with ID:', docRef.id);

            if (metricData.status === 'Done') {
                Utils.showSuccess(Fun.msg('done'));
                Fun.confetti();
            } else {
                Utils.showSuccess(Fun.msg('missed'));
            }

            // Wait a bit for the success message to show
            setTimeout(() => {
                AppController.openCourse(metricData.courseId);
            }, 1000);

            return { id: docRef.id, ...metric };
        } catch (error) {
            console.error('Error adding metric:', error);
            Utils.showError('Error: ' + error.message);
            throw error;
        } finally {
            MetricsManager.isAdding = false;
        }
    },

    /**
     * Get metrics for specific course
     * @param {string} courseId - Course ID
     * @returns {Promise<Array>} - Array of metrics
     */
    getCourseMetrics: async (courseId) => {
        try {
            // All entries of the course (every member's) - Firestore rules enforce membership
            const snapshot = await db.collection('metrics')
                .where('courseId', '==', courseId)
                .get();

            console.log('Fetched', snapshot.docs.length, 'metrics for course');
            return snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .sort((a, b) => new Date(b.date) - new Date(a.date));
        } catch (error) {
            console.error('Error fetching metrics:', error);
            Utils.showError('Error loading metrics: ' + error.message);
            return [];
        }
    },

    /**
     * Get metric statistics for course
     * @param {string} courseId - Course ID
     * @param {string} startDate - Start date for calculation
     * @returns {Promise<Object>} - Statistics object
     */
    getCourseStats: async (courseId, startDate, metrics) => {
        try {
            const all = metrics || await MetricsManager.getCourseMetrics(courseId);
            const myId = AuthModule.getCurrentUser().uid;
            return MetricsManager.computeStats(all.filter(m => m.userId === myId), startDate);
        } catch (error) {
            console.error('Error calculating stats:', error);
            Utils.showError('Error calculating stats: ' + error.message);
            return MetricsManager.computeStats([], startDate);
        }
    },

    /**
     * Pure stats calculation for a set of (already filtered) metrics
     */
    computeStats: (metrics, startDate) => {
        const relevant = metrics.filter(m => m.date >= startDate);
        const completed = Analytics.doneDates(relevant).length;
        const missed = relevant.filter(m => m.status === 'Missed').length;
        const totalDays = Utils.calculateDaysElapsed(startDate);
        return {
            completed,
            missed,
            totalDays,
            consistency: Utils.calculateConsistency(completed, totalDays),
            totalMinutes: relevant.filter(m => m.status === 'Done')
                .reduce((sum, m) => sum + (Number(m.duration) || 0), 0),
            totalEntries: relevant.length
        };
    },

    /**
     * Toggle my reaction on an entry (one reaction per person per entry)
     * @returns {Promise<string|null>} - the new reaction (null if removed), or undefined on error
     */
    react: async (metricId, emoji) => {
        try {
            const uid = AuthModule.getCurrentUser().uid;
            const metric = (UIModule.allMetrics || []).find(m => m.id === metricId);
            const current = metric && metric.reactions ? metric.reactions[uid] : null;
            const next = current === emoji ? null : emoji;
            await db.collection('metrics').doc(metricId).update({
                ['reactions.' + uid]: next === null ? firebase.firestore.FieldValue.delete() : next
            });
            if (metric) {
                metric.reactions = { ...(metric.reactions || {}) };
                if (next === null) delete metric.reactions[uid];
                else metric.reactions[uid] = next;
            }
            return next;
        } catch (error) {
            console.error('Reaction error:', error);
            Utils.showError('Could not react: ' + error.message);
            return undefined;
        }
    },

    /**
     * Update metric
     * @param {string} metricId - Metric ID
     * @param {Object} updates - Fields to update
     * @returns {Promise} - Firestore promise
     */
    updateMetric: async (metricId, updates) => {
        try {
            if ('duration' in updates) updates.duration = MetricsManager.cleanDuration(updates.duration);
            if ('topic' in updates) updates.topic = String(updates.topic || '').slice(0, 200);
            if ('notes' in updates) updates.notes = String(updates.notes || '').slice(0, 2000);
            if ('date' in updates && !/^\d{4}-\d{2}-\d{2}$/.test(updates.date)) throw new Error('Please pick a valid date');
            updates.updatedAt = new Date();
            await db.collection('metrics').doc(metricId).update(updates);
            Utils.showSuccess(Fun.msg('edit'));
        } catch (error) {
            console.error('Error updating metric:', error);
            Utils.showError('Error: ' + error.message);
            throw error;
        }
    },

    /**
     * Delete metric
     * @param {string} metricId - Metric ID
     * @returns {Promise} - Firestore promise
     */
    deleteMetric: async (metricId) => {
        try {
            if (confirm('Are you sure you want to delete this entry?')) {
                await db.collection('metrics').doc(metricId).delete();
                console.log('✓ Metric deleted');
                Utils.showSuccess(Fun.msg('entryDelete'));

                setTimeout(() => {
                    AppController.openCourse(UIModule.currentCourseId);
                }, 800);
            }
        } catch (error) {
            console.error('Error deleting metric:', error);
            Utils.showError('Error: ' + error.message);
            throw error;
        }
    }
};

console.log('✓ Metrics Manager module loaded');