/* ============================================
   AUTH MODULE
   ============================================ */

const Auth = (() => {
    const SESSION_KEY = 'blog_admin_session';
    const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

    // ── SHA-256 Hash ───────────────────────────────────────────────
    async function hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // ── Login ──────────────────────────────────────────────────────
    async function login(username, password) {
        const passwordHash = await hashPassword(password);

        const result = await DB.getAdminByUsername(username);
        if (!result.rows.length) {
            throw new Error('Invalid username or password');
        }

        const admin = result.rows[0];
        if (admin.password_hash !== passwordHash) {
            throw new Error('Invalid username or password');
        }

        const session = {
            username: admin.username,
            token: generateToken(),
            expiry: Date.now() + SESSION_DURATION,
        };

        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        // Store the full-access token for DB operations
        localStorage.setItem('turso_admin_token', 'authenticated');

        return session;
    }

    // ── Logout ─────────────────────────────────────────────────────
    function logout() {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem('turso_admin_token');
    }

    // ── Check Auth ─────────────────────────────────────────────────
    function isAuthenticated() {
        const session = getSession();
        if (!session) return false;
        if (Date.now() > session.expiry) {
            logout();
            return false;
        }
        return true;
    }

    function getSession() {
        try {
            const raw = localStorage.getItem(SESSION_KEY);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }

    // ── Generate Token ─────────────────────────────────────────────
    function generateToken() {
        const arr = new Uint8Array(32);
        crypto.getRandomValues(arr);
        return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // ── Setup First Admin ──────────────────────────────────────────
    async function setupAdmin(username, password) {
        const count = await DB.getAdminCount();
        if (count.rows[0] && parseInt(count.rows[0].count) > 0) {
            throw new Error('Admin account already exists');
        }

        const passwordHash = await hashPassword(password);
        await DB.createAdmin(username, passwordHash);
        return true;
    }

    // ── Create Additional Admin ────────────────────────────────────
    async function createAdditionalAdmin(username, password, role = 'admin') {
        if (!isAuthenticated()) throw new Error('Not authorized');
        
        try {
            const passwordHash = await hashPassword(password);
            await DB.createAdmin(username, passwordHash, role);
            return true;
        } catch (e) {
            if (e.message.includes('UNIQUE constraint failed')) {
                throw new Error('Username already exists');
            }
            throw e;
        }
    }

    // ── Update Admin ───────────────────────────────────────────────
    async function updateAdmin(id, username, role) {
        if (!isAuthenticated()) throw new Error('Not authorized');
        await DB.updateAdmin(id, username, role);
        return true;
    }

    // ── Delete Admin ───────────────────────────────────────────────
    async function deleteAdmin(id) {
        if (!isAuthenticated()) throw new Error('Not authorized');
        const count = await DB.getAdminCount();
        if (count.rows[0].count <= 1) {
            throw new Error('Cannot delete the last remaining admin');
        }
        await DB.deleteAdmin(id);
        return true;
    }

    // ── Change Password ────────────────────────────────────────────
    async function changePassword(oldPassword, newPassword) {
        if (!isAuthenticated()) throw new Error('Not authorized');
        const session = getSession();

        const result = await DB.getAdminByUsername(session.username);
        if (!result.rows.length) throw new Error('User not found');
        
        const oldHash = await hashPassword(oldPassword);
        if (result.rows[0].password_hash !== oldHash) {
            throw new Error('Incorrect current password');
        }

        const newHash = await hashPassword(newPassword);
        await DB.updateAdminPassword(session.username, newHash);
        return true;
    }

    // ── Forgot Password ────────────────────────────────────────────
    async function forgotPassword(username) {
        const result = await DB.getAdminByUsername(username);
        if (!result.rows.length) {
            // Silently pretend it worked for security, but return null
            return null;
        }
        
        const token = generateToken();
        const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hr
        await DB.setAdminResetToken(username, token, expires);
        
        return token;
    }

    // ── Reset Password ─────────────────────────────────────────────
    async function resetPassword(username, token, newPassword) {
        const result = await DB.getAdminByUsername(username);
        if (!result.rows.length) throw new Error('Invalid request');
        
        const admin = result.rows[0];
        if (!admin.reset_token || admin.reset_token !== token) {
            throw new Error('Invalid or expired token');
        }
        
        const expires = new Date(admin.reset_token_expires).getTime();
        if (Date.now() > expires) {
            throw new Error('Token has expired');
        }
        
        const newHash = await hashPassword(newPassword);
        await DB.updateAdminPassword(username, newHash);
        return true;
    }

    return {
        hashPassword,
        login,
        logout,
        isAuthenticated,
        getSession,
        setupAdmin,
        createAdditionalAdmin,
        updateAdmin,
        deleteAdmin,
        changePassword,
        forgotPassword,
        resetPassword,
    };
})();
