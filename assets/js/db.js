/* ============================================
   DATABASE MODULE (Turso HTTP API)
   ============================================

   SQL CREATE TABLE statements:

   CREATE TABLE IF NOT EXISTS posts (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       title TEXT NOT NULL,
       slug TEXT NOT NULL UNIQUE,
       content TEXT,
       excerpt TEXT,
       cover_image_url TEXT,
       category TEXT DEFAULT '',
       tags TEXT DEFAULT '',
       status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'published')),
       created_at TEXT DEFAULT (datetime('now')),
       updated_at TEXT DEFAULT (datetime('now'))
   );

   CREATE TABLE IF NOT EXISTS admin (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       username TEXT NOT NULL UNIQUE,
       password_hash TEXT NOT NULL
   );

   ============================================ */

const DB = (() => {
    // ── Configuration ──────────────────────────────────────────────
    // Update these with your real Turso credentials
    const CONFIG = {
        url: 'https://blog-db-smalla.aws-ap-south-1.turso.io',
        readToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicm8iLCJleHAiOjE3NzU4MDg5ODgsImlhdCI6MTc3NTIwNDE4OCwiaWQiOiIwMTlkNTI2My0yNzAxLTcyNGUtYmFlZS1kMDQxMjZjZThlZTQiLCJyaWQiOiJlYTZkYjNiZS1kNDI0LTQ0NGEtOGE2My00ODgxYWVlOThiOWMifQ.b2VfXULYET5wnq1de4QUW6NBS0dDt_5Jd9d29qzHpVk67LbBnkcmyk28Bo4leN9i7Ozplx6bEP2juNBRxl8dBw',
        fullToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE3NzU4MDg4NTQsImlhdCI6MTc3NTIwNDA1NCwiaWQiOiIwMTlkNTI2My0yNzAxLTcyNGUtYmFlZS1kMDQxMjZjZThlZTQiLCJyaWQiOiJlYTZkYjNiZS1kNDI0LTQ0NGEtOGE2My00ODgxYWVlOThiOWMifQ.FghxJ3Vccd2NKJPgyOO54R0RNjDxeN681MzInDGGhZTr4UEM1X6kkCNHzWzlFCkRghJR3k5yxgDqYuVyOBdaCA',
    };

    function getConfig() {
        // Try loading from localStorage first (set during setup)
        const saved = localStorage.getItem('turso_config');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                CONFIG.url = parsed.url || CONFIG.url;
                CONFIG.readToken = parsed.readToken || CONFIG.readToken;
                CONFIG.fullToken = parsed.fullToken || CONFIG.fullToken;
            } catch (e) {
                // ignore
            }
        }
        return CONFIG;
    }

    function getToken() {
        const config = getConfig();
        // Use full token if admin is authenticated, else read-only
        const adminToken = localStorage.getItem('turso_admin_token');
        if (adminToken) {
            return config.fullToken || adminToken;
        }
        return config.readToken || config.fullToken;
    }

    function getUrl() {
        const config = getConfig();
        return config.url;
    }

    function isConfigured() {
        const config = getConfig();
        return config.url && (config.readToken || config.fullToken);
    }

    // ── Core Query Function ────────────────────────────────────────
    async function query(sql, args = []) {
        const url = getUrl();
        const token = getToken();

        if (!url || !token) {
            throw new Error('Database not configured. Please set up your Turso credentials.');
        }

        const stmtArgs = args.map(arg => {
            if (arg === null || arg === undefined) {
                return { type: 'null', value: null };
            }
            if (typeof arg === 'number') {
                if (Number.isInteger(arg)) {
                    return { type: 'integer', value: String(arg) };
                }
                return { type: 'float', value: arg };
            }
            return { type: 'text', value: String(arg) };
        });

        const body = {
            requests: [
                { type: 'execute', stmt: { sql, args: stmtArgs } },
                { type: 'close' }
            ]
        };

        try {
            console.log('[DB] Executing SQL:', sql, 'Args:', JSON.stringify(stmtArgs));
            const response = await fetch(`${url}/v2/pipeline`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[DB] HTTP Error:', response.status, errorText);
                throw new Error(`Database error (${response.status}): ${errorText}`);
            }

            const data = await response.json();
            console.log('[DB] Response:', JSON.stringify(data).substring(0, 500));

            if (data.results && data.results[0]) {
                const result = data.results[0];
                if (result.type === 'error') {
                    console.error('[DB] SQL Error:', result.error);
                    throw new Error(`SQL Error: ${result.error.message}`);
                }
                if (result.type === 'ok' && result.response) {
                    return parseResult(result.response.result);
                }
            }

            return { rows: [], columns: [], rowsAffected: 0, lastInsertId: 0 };
        } catch (error) {
            if (error.message.includes('Database not configured')) {
                throw error;
            }
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Network error: Unable to reach the database. Check your connection.');
            }
            throw error;
        }
    }

    // ── Parse Turso Response ───────────────────────────────────────
    function parseResult(result) {
        if (!result) {
            return { rows: [], columns: [], rowsAffected: 0, lastInsertId: 0 };
        }

        const columns = (result.cols || []).map(c => c.name);
        const rows = (result.rows || []).map(row => {
            const obj = {};
            row.forEach((cell, i) => {
                obj[columns[i]] = cell.type === 'null' ? null : cell.value;
            });
            return obj;
        });

        return {
            rows,
            columns,
            rowsAffected: result.affected_row_count || 0,
            lastInsertId: result.last_insert_rowid ? Number(result.last_insert_rowid) : 0,
        };
    }

    // ── Initialize DB Tables ───────────────────────────────────────
    async function initTables() {
        await query(`
            CREATE TABLE IF NOT EXISTS posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                slug TEXT NOT NULL UNIQUE,
                content TEXT,
                excerpt TEXT,
                cover_image_url TEXT,
                category TEXT DEFAULT '',
                tags TEXT DEFAULT '',
                status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'published')),
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        `);

        await query(`
            CREATE TABLE IF NOT EXISTS admin (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                role TEXT DEFAULT 'admin',
                reset_token TEXT,
                reset_token_expires TEXT
            )
        `);

        // Attempt to add columns if they don't exist (for existing tables)
        try { await query(`ALTER TABLE admin ADD COLUMN role TEXT DEFAULT 'admin'`); } catch(e) {}
        try { await query(`ALTER TABLE admin ADD COLUMN reset_token TEXT`); } catch(e) {}
        try { await query(`ALTER TABLE admin ADD COLUMN reset_token_expires TEXT`); } catch(e) {}
    }

    // ── Post CRUD Operations ───────────────────────────────────────
    async function getPublishedPosts() {
        return await query(
            `SELECT id, title, slug, excerpt, cover_image_url, category, tags, status, created_at, updated_at
             FROM posts WHERE status = 'published' ORDER BY created_at DESC`
        );
    }

    async function getAllPosts() {
        return await query(
            `SELECT id, title, slug, excerpt, cover_image_url, category, tags, status, created_at, updated_at
             FROM posts ORDER BY created_at DESC`
        );
    }

    async function getPostBySlug(slug) {
        return await query(
            `SELECT * FROM posts WHERE slug = ?`, [slug]
        );
    }

    async function getPostById(id) {
        return await query(
            `SELECT * FROM posts WHERE id = ?`, [parseInt(id)]
        );
    }

    async function createPost(post) {
        return await query(
            `INSERT INTO posts (title, slug, content, excerpt, cover_image_url, category, tags, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
            [post.title, post.slug, post.content, post.excerpt, post.cover_image_url, post.category, post.tags, post.status]
        );
    }

    async function updatePost(id, post) {
        return await query(
            `UPDATE posts SET title = ?, slug = ?, content = ?, excerpt = ?, cover_image_url = ?,
             category = ?, tags = ?, status = ?, updated_at = datetime('now')
             WHERE id = ?`,
            [post.title, post.slug, post.content, post.excerpt, post.cover_image_url, post.category, post.tags, post.status, parseInt(id)]
        );
    }

    async function deletePost(id) {
        return await query(`DELETE FROM posts WHERE id = ?`, [parseInt(id)]);
    }

    async function togglePostStatus(id, currentStatus) {
        const newStatus = currentStatus === 'published' ? 'draft' : 'published';
        return await query(
            `UPDATE posts SET status = ?, updated_at = datetime('now') WHERE id = ?`,
            [newStatus, parseInt(id)]
        );
    }

    async function getAdjacentPosts(currentCreatedAt) {
        const prev = await query(
            `SELECT id, title, slug FROM posts WHERE status = 'published' AND created_at < ? ORDER BY created_at DESC LIMIT 1`,
            [currentCreatedAt]
        );
        const next = await query(
            `SELECT id, title, slug FROM posts WHERE status = 'published' AND created_at > ? ORDER BY created_at ASC LIMIT 1`,
            [currentCreatedAt]
        );
        return {
            prev: prev.rows.length ? prev.rows[0] : null,
            next: next.rows.length ? next.rows[0] : null,
        };
    }

    async function getCategories() {
        const result = await query(
            `SELECT DISTINCT category FROM posts WHERE status = 'published' AND category != '' ORDER BY category`
        );
        return result.rows.map(r => r.category);
    }

    // ── Admin Operations ───────────────────────────────────────────
    async function getAdminByUsername(username) {
        return await query(`SELECT * FROM admin WHERE username = ?`, [username]);
    }

    async function getAllAdmins() {
        return await query(`SELECT id, username, role FROM admin ORDER BY id ASC`);
    }

    async function createAdmin(username, passwordHash, role = 'admin') {
        return await query(
            `INSERT INTO admin (username, password_hash, role) VALUES (?, ?, ?)`,
            [username, passwordHash, role]
        );
    }

    async function updateAdmin(id, username, role) {
        return await query(
            `UPDATE admin SET username = ?, role = ? WHERE id = ?`,
            [username, role, parseInt(id)]
        );
    }

    async function deleteAdmin(id) {
        return await query(`DELETE FROM admin WHERE id = ?`, [parseInt(id)]);
    }

    async function getAdminCount() {
        return await query(`SELECT COUNT(*) as count FROM admin`);
    }

    async function setAdminResetToken(username, token, expires) {
        return await query(
            `UPDATE admin SET reset_token = ?, reset_token_expires = ? WHERE username = ?`,
            [token, expires, username]
        );
    }

    async function updateAdminPassword(username, newHash) {
        return await query(
            `UPDATE admin SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE username = ?`,
            [newHash, username]
        );
    }

    // ── Save Config ────────────────────────────────────────────────
    function saveConfig(url, readToken, fullToken) {
        CONFIG.url = url;
        CONFIG.readToken = readToken;
        CONFIG.fullToken = fullToken;
        localStorage.setItem('turso_config', JSON.stringify({ url, readToken, fullToken }));
    }

    return {
        query,
        isConfigured,
        saveConfig,
        initTables,
        getPublishedPosts,
        getAllPosts,
        getPostBySlug,
        getPostById,
        createPost,
        updatePost,
        deletePost,
        togglePostStatus,
        getAdjacentPosts,
        getCategories,
        getAdminByUsername,
        getAllAdmins,
        createAdmin,
        updateAdmin,
        deleteAdmin,
        getAdminCount,
        setAdminResetToken,
        updateAdminPassword,
    };
})();
