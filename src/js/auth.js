/**
 * Authentication Module
 * Handles user authentication with Firebase
 */

const AuthModule = {
    currentUser: null,

    /**
     * Initialize authentication listeners
     * @param {function} callback - Callback when auth state changes
     */
    init: (callback) => {
        auth.onAuthStateChanged((user) => {
            AuthModule.currentUser = user;
            if (callback) callback(user);
        });
    },

    /**
     * Sign up new user
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise} - Firebase auth promise
     */
    signup: async (email, password) => {
        try {
            if (!Utils.isValidEmail(email)) {
                throw new Error('Please enter a valid email');
            }
            if (!Utils.isValidPassword(password)) {
                throw new Error('Password must be at least 6 characters');
            }

            const result = await auth.createUserWithEmailAndPassword(email, password);

            // Create user profile in Firestore
            await db.collection('users').doc(result.user.uid).set({
                email: email,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            Utils.showSuccess('Account created successfully!');
            return result.user;
        } catch (error) {
            Utils.showError(error.message);
            throw error;
        }
    },

    /**
     * Sign in user
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise} - Firebase auth promise
     */
    signin: async (email, password) => {
        try {
            if (!email || !password) {
                throw new Error('Please enter email and password');
            }

            const result = await auth.signInWithEmailAndPassword(email, password);
            Utils.showSuccess('Logged in successfully!');
            return result.user;
        } catch (error) {
            Utils.showError(error.message);
            throw error;
        }
    },

    /**
     * Sign out user
     * @returns {Promise} - Firebase auth promise
     */
    logout: async () => {
        try {
            await auth.signOut();
            AuthModule.currentUser = null;
            Utils.showSuccess('Logged out successfully');
        } catch (error) {
            Utils.showError(error.message);
            throw error;
        }
    },

    /**
     * Get current user
     * @returns {Object} - Current user object
     */
    getCurrentUser: () => {
        return AuthModule.currentUser;
    },

    /**
     * Check if user is authenticated
     * @returns {boolean} - Is authenticated
     */
    isAuthenticated: () => {
        return AuthModule.currentUser !== null;
    }
};

console.log('✓ Auth module loaded');