/**
 * Metrics Manager Module
 * Handles CRUD operations for learning metrics
 */

const MetricsManager = {
    /**
     * Add learning metric entry
     * @param {Object} metricData - Metric details
     * @returns {Promise} - Firestore promise
     */
    addMetric: async (metricData) => {
        try {
            const userId = AuthModule.getCurrentUser().uid;

            if (!metricData.courseId) {
                throw new Error('Course is required');
            }
            if (!metricData.date) {
                throw new Error('Date is required');
            }
            if (!metricData.status) {
                throw new Error('Status is required');
            }

            const metric = {
                userId: userId,
                courseId: metricData.courseId,
                date: metricData.date,
                status: metricData.status, // 'Done' or 'Missed'
                duration: metricData.duration || 0, // in minutes
                topic: metricData.topic || '',
                notes: metricData.notes || '',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const docRef = await db.collection('metrics').add(metric);
            Utils.showSuccess('Metric added successfully!');
            return { id: docRef.id, ...metric };
        } catch (error) {
            Utils.showError(error.message);
            throw error;
        }
    },

    /**
     * Get metrics for specific course
     * @param {string} courseId - Course ID
     * @returns {Promise<Array>} - Array of metrics
     */
    getCourseMetrics: async (courseId) => {
        try {
            const userId = AuthModule.getCurrentUser().uid;
            const snapshot = await db.collection('metrics')
                .where('userId', '==', userId)
                .where('courseId', '==', courseId)
                .orderBy('date', 'desc')
                .get();

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error fetching metrics:', error);
            return [];
        }
    },

    /**
     * Get metric statistics for course
     * @param {string} courseId - Course ID
     * @param {string} startDate - Start date for calculation
     * @returns {Promise<Object>} - Statistics object
     */
    getCourseStats: async (courseId, startDate) => {
        try {
            const metrics = await MetricsManager.getCourseMetrics(courseId);

            const start = new Date(startDate);
            const relevantMetrics = metrics.filter(m => new Date(m.date) >= start);

            const completed = relevantMetrics.filter(m => m.status === 'Done').length;
            const missed = relevantMetrics.filter(m => m.status === 'Missed').length;
            const totalDays = Utils.calculateDaysElapsed(startDate);
            const consistency = Utils.calculateConsistency(completed, totalDays);
            const totalMinutes = relevantMetrics.reduce((sum, m) => sum + (m.duration || 0), 0);

            return {
                completed,
                missed,
                totalDays,
                consistency,
                totalMinutes,
                totalEntries: relevantMetrics.length
            };
        } catch (error) {
            console.error('Error calculating stats:', error);
            return {
                completed: 0,
                missed: 0,
                totalDays: 0,
                consistency: 0,
                totalMinutes: 0,
                totalEntries: 0
            };
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
            updates.updatedAt = new Date();
            await db.collection('metrics').doc(metricId).update(updates);
            Utils.showSuccess('Metric updated successfully!');
        } catch (error) {
            Utils.showError(error.message);
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
                Utils.showSuccess('Metric deleted!');
            }
        } catch (error) {
            Utils.showError(error.message);
            throw error;
        }
    }
};

console.log('✓ Metrics Manager module loaded');