/**
 * Metrics Manager Module - FIXED VERSION
 * Handles CRUD operations for learning metrics with better error handling
 */

const MetricsManager = {
    isAdding: false, // Prevent duplicate submissions

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
            if (!metricData.date) {
                throw new Error('Date is required');
            }
            if (!metricData.status) {
                throw new Error('Status is required');
            }

            console.log('Adding metric with data:', metricData);

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
            console.log('✓ Metric added with ID:', docRef.id);

            Utils.showSuccess('✓ Entry added successfully!');

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
            const userId = AuthModule.getCurrentUser().uid;
            const snapshot = await db.collection('metrics')
                .where('userId', '==', userId)
                .where('courseId', '==', courseId)
                .orderBy('date', 'desc')
                .get();

            console.log('Fetched', snapshot.docs.length, 'metrics for course');
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
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

            console.log('Course stats:', { completed, missed, totalDays, consistency });

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
            Utils.showError('Error calculating stats: ' + error.message);
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
            Utils.showSuccess('✓ Entry updated successfully!');
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
                Utils.showSuccess('✓ Entry deleted!');

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