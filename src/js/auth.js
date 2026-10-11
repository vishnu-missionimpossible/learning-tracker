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
    signup: async (email, password, confirmPassword) => {
        try {
            const cleanEmail = (email || '').trim().toLowerCase();
            if (!Utils.isValidEmail(cleanEmail)) {
                throw new Error('Please enter a valid email');
            }
            const issue = Utils.passwordIssue(password);
            if (issue) {
                throw new Error(issue);
            }
            if (password !== confirmPassword) {
                throw new Error('Passwords do not match');
            }

            const result = await auth.createUserWithEmailAndPassword(cleanEmail, password);

            // Create user profile in Firestore
            await db.collection('users').doc(result.user.uid).set({
                email: cleanEmail,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            // Ask the user to verify their email (required to accept invitations / use study buddies)
            try {
                await result.user.sendEmailVerification();
            } catch (e) {
                console.warn('Could not send verification email:', e.code);
            }

            Utils.showSuccess(Fun.msg('signup') + ' Check your inbox to verify your email 📧');
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

            const result = await auth.signInWithEmailAndPassword(email.trim().toLowerCase(), password);
            Utils.showSuccess(Fun.msg('login'));
            return result.user;
        } catch (error) {
            const generic = ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-login-credentials'];
            Utils.showError(generic.includes(error.code)
                ? 'Incorrect email or password'
                : (error.code === 'auth/too-many-requests'
                    ? 'Too many attempts. Please wait a few minutes or reset your password.'
                    : error.message));
            throw error;
        }
    },

    /**
     * Send password reset email
     * @param {string} email - Account email
     */
    resetPassword: async (email) => {
        try {
            const clean = (email || '').trim();
            if (!Utils.isValidEmail(clean)) {
                throw new Error('Please enter a valid email');
            }
            await auth.sendPasswordResetEmail(clean);
            // Same message whether or not the account exists (avoids leaking who has an account)
            Utils.showSuccess('If an account exists for that email, a reset link is on its way 📬 (check spam too)');
            return true;
        } catch (error) {
            const msg = error.code === 'auth/too-many-requests'
                ? 'Too many attempts. Please wait a few minutes and try again.'
                : error.message;
            Utils.showError(msg);
            return false;
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
            Utils.showSuccess(Fun.msg('logout'));
        } catch (error) {
            Utils.showError(error.message);
            throw error;
        }
    },

    /** Re-send the verification email */
    resendVerification: async () => {
        try {
            const user = auth.currentUser;
            if (!user) return false;
            await user.sendEmailVerification();
            Utils.showSuccess('Verification email sent 📧 (check spam too)');
            return true;
        } catch (error) {
            Utils.showError(error.code === 'auth/too-many-requests'
                ? 'Too many requests - please wait a few minutes and try again.'
                : error.message);
            return false;
        }
    },

    /** Pick up a freshly verified email (refreshes the user and the ID token used by security rules) */
    refreshVerification: async () => {
        const user = auth.currentUser;
        if (!user) return false;
        await user.reload();
        await user.getIdToken(true);
        AuthModule.currentUser = auth.currentUser;
        return auth.currentUser.emailVerified;
    },

    isEmailVerified: () => !!(AuthModule.currentUser && AuthModule.currentUser.emailVerified),

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