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

    return {
        hashPassword,
        login,
        logout,
        isAuthenticated,
        getSession,
        setupAdmin,
    };
})();
