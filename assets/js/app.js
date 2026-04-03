/* ============================================
   APP MODULE (Main Application Controller)
   ============================================ */

const App = (() => {
    const app = document.getElementById('app');
    let allPosts = [];
    let categories = [];
    let searchQuery = '';
    let activeCategory = '';
    let searchDebounce = null;

    // ── Initialize ─────────────────────────────────────────────────
    function init() {
        UI.initTheme();
        UI.initNavbar();

        // Theme toggle
        document.getElementById('theme-toggle').addEventListener('click', UI.toggleTheme);

        // Run schema updates in background, silently ignoring network errors if offline
        if (DB.isConfigured()) {
            DB.initTables().catch(e => console.warn('Schema sync deferred:', e));
        }

        // Start router
        Router.init(handleRoute);
    }

    // ── Route Handler ──────────────────────────────────────────────
    async function handleRoute(route) {
        const { segments, params } = route;
        const page = segments[0] || 'home';

        // Close mobile menu
        document.getElementById('nav-toggle').checked = false;

        // Scroll to top
        window.scrollTo(0, 0);

        // Update active nav
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href')?.slice(1) || '';
            if (href === page || (page === 'home' && href === 'home')) {
                link.classList.add('active');
            }
        });

        // Check if DB is configured
        if (!DB.isConfigured()) {
            renderSetup();
            return;
        }

        try {
            switch (page) {
                case 'home':
                    await renderHome();
                    break;

                case 'post':
                    if (segments[1]) {
                        await renderPost(segments[1]);
                    } else {
                        Router.navigate('home');
                    }
                    break;

                case 'admin':
                    if (segments[1] === 'dashboard') {
                        if (!Auth.isAuthenticated()) {
                            Router.navigate('admin');
                            return;
                        }
                        await renderDashboard();
                    } else if (segments[1] === 'editor') {
                        if (!Auth.isAuthenticated()) {
                            Router.navigate('admin');
                            return;
                        }
                        await renderEditor(params.id);
                    } else if (segments[1] === 'users') {
                        if (!Auth.isAuthenticated()) {
                            Router.navigate('admin');
                            return;
                        }
                        await renderUsers();
                    } else if (segments[1] === 'forgot-password') {
                        renderForgotPassword();
                    } else if (segments[1] === 'reset-password') {
                        renderResetPassword(params.user, params.token);
                    } else if (segments[1] === 'setup') {
                        renderAdminSetup();
                    } else {
                        if (Auth.isAuthenticated()) {
                            Router.navigate('admin/dashboard');
                            return;
                        }
                        renderLogin();
                    }
                    break;

                default:
                    await renderHome();
            }
        } catch (error) {
            console.error('Route error:', error);
            UI.showToast(error.message || 'An error occurred', 'error');
            app.innerHTML = `
                <div class="empty-state" style="padding-top: 120px;">
                    <div class="empty-state-icon">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="1" opacity="0.4">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                    </div>
                    <h3>Something went wrong</h3>
                    <p>${UI.escapeHtml(error.message)}</p>
                    <a href="#home" class="btn btn-primary" style="margin-top: 16px;">Go Home</a>
                </div>
            `;
        }
    }

    // ── Setup Page ─────────────────────────────────────────────────
    function renderSetup() {
        app.innerHTML = UI.renderSetupPage();
        document.getElementById('setup-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const url = document.getElementById('setup-url').value.trim().replace(/\/$/, '');
            const readToken = document.getElementById('setup-read-token').value.trim();
            const fullToken = document.getElementById('setup-full-token').value.trim();

            UI.showLoader();
            try {
                DB.saveConfig(url, readToken, fullToken);
                // Test connection & init tables
                await DB.initTables();
                UI.showToast('Database connected successfully!', 'success');
                Router.navigate('home');
                // Force re-render
                window.location.reload();
            } catch (error) {
                UI.showToast('Connection failed: ' + error.message, 'error');
                localStorage.removeItem('turso_config');
            } finally {
                UI.hideLoader();
            }
        });
    }

    // ── Home Page ──────────────────────────────────────────────────
    async function renderHome() {
        app.innerHTML = UI.skeletonLoader();

        try {
            const result = await DB.getPublishedPosts();
            allPosts = result.rows || [];
            const cats = await DB.getCategories();
            categories = cats || [];

            let filtered = filterPosts(allPosts, searchQuery, activeCategory);
            app.innerHTML = UI.renderHomePage(filtered, categories, searchQuery, activeCategory);
        } catch (error) {
            throw error;
        }
    }

    // ── Single Post ────────────────────────────────────────────────
    async function renderPost(slug) {
        app.innerHTML = UI.skeletonPostLoader();

        const result = await DB.getPostBySlug(slug);
        if (!result.rows.length) {
            app.innerHTML = `
                <div class="empty-state" style="padding-top: 120px;">
                    <h3>Post not found</h3>
                    <p>The post you are looking for does not exist.</p>
                    <a href="#home" class="btn btn-primary" style="margin-top: 16px;">Go Home</a>
                </div>
            `;
            return;
        }

        const post = result.rows[0];
        document.title = `${post.title} - DevBlog`;
        const adjacent = await DB.getAdjacentPosts(post.created_at);

        app.innerHTML = UI.renderSinglePost(post, adjacent);
    }

    // ── Login ──────────────────────────────────────────────────────
    function renderLogin() {
        app.innerHTML = UI.renderLoginPage();

        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('login-username').value.trim();
            const password = document.getElementById('login-password').value;
            const btn = document.getElementById('login-btn');

            btn.disabled = true;
            btn.textContent = 'Signing in...';

            try {
                await Auth.login(username, password);
                UI.showToast('Welcome back!', 'success');
                Router.navigate('admin/dashboard');
            } catch (error) {
                UI.showToast(error.message, 'error');
                btn.disabled = false;
                btn.textContent = 'Sign In';
            }
        });
    }

    // ── Admin Setup ────────────────────────────────────────────────
    function showSetupAdmin() {
        Router.navigate('admin/setup');
    }

    function renderAdminSetup() {
        app.innerHTML = UI.renderAdminSetup();

        document.getElementById('setup-admin-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('admin-username').value.trim();
            const password = document.getElementById('admin-password').value;
            const confirm = document.getElementById('admin-password-confirm').value;

            if (password !== confirm) {
                UI.showToast('Passwords do not match', 'error');
                return;
            }

            if (password.length < 6) {
                UI.showToast('Password must be at least 6 characters', 'error');
                return;
            }

            UI.showLoader();
            try {
                await Auth.setupAdmin(username, password);
                UI.showToast('Admin account created! Please sign in.', 'success');
                Router.navigate('admin');
            } catch (error) {
                UI.showToast(error.message, 'error');
            } finally {
                UI.hideLoader();
            }
        });
    }

    // ── Forgot Password ────────────────────────────────────────────
    function renderForgotPassword() {
        app.innerHTML = UI.renderForgotPassword();
        
        document.getElementById('forgot-password-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('forgot-username').value.trim();
            const btn = document.getElementById('forgot-btn');
            
            btn.disabled = true;
            btn.textContent = 'Processing...';
            
            try {
                const token = await Auth.forgotPassword(username);
                if (token) {
                    const to = 'admin@sagarmalla.info.np';
                    const cc = 'sagarmallaofficials@gmail.com';
                    const subject = encodeURIComponent('Password Reset Token');
                    const body = encodeURIComponent(`Your password reset link is:\n${window.location.origin}${window.location.pathname}#admin/reset-password?user=${encodeURIComponent(username)}&token=${token}`);
                    
                    window.location.href = `mailto:${to}?cc=${cc}&subject=${subject}&body=${body}`;
                }
                UI.showToast('If the user exists, a password reset email has been initiated.', 'success', 6000);
                setTimeout(() => Router.navigate('admin'), 3000);
            } catch (error) {
                UI.showToast(error.message, 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Request Reset Link';
            }
        });
    }

    // ── Reset Password ─────────────────────────────────────────────
    function renderResetPassword(username, token) {
        if (!username || !token) {
            UI.showToast('Invalid reset link', 'error');
            Router.navigate('admin');
            return;
        }

        app.innerHTML = UI.renderResetPassword(username, token);
        
        document.getElementById('reset-password-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const password = document.getElementById('reset-new-password').value;
            const confirm = document.getElementById('reset-confirm-password').value;
            const btn = document.getElementById('reset-btn');

            if (password !== confirm) {
                UI.showToast('Passwords do not match', 'error');
                return;
            }
            if (password.length < 6) {
                UI.showToast('Password must be at least 6 characters', 'error');
                return;
            }

            btn.disabled = true;
            btn.textContent = 'Resetting...';

            try {
                await Auth.resetPassword(username, token, password);
                UI.showToast('Password reset successful! You can now log in.', 'success');
                Router.navigate('admin');
            } catch (error) {
                UI.showToast(error.message, 'error');
                btn.disabled = false;
                btn.textContent = 'Reset Password';
            }
        });
    }

    // ── Users Management ───────────────────────────────────────────
    async function renderUsers() {
        app.innerHTML = UI.skeletonLoader();
        try {
            const admins = await DB.getAllAdmins();
            app.innerHTML = UI.renderAdminUsers(admins.rows || []);

            document.getElementById('add-admin-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const btn = e.target.querySelector('button[type="submit"]');
                const username = document.getElementById('new-admin-username').value.trim();
                const password = document.getElementById('new-admin-password').value;
                const role = document.getElementById('new-admin-role').value;

                if (password.length < 6) {
                    UI.showToast('Password must be at least 6 characters', 'error');
                    return;
                }

                btn.disabled = true;
                btn.textContent = 'Creating...';
                
                try {
                    await Auth.createAdditionalAdmin(username, password, role);
                    UI.showToast('Admin user created successfully', 'success');
                    renderUsers(); // Refresh page
                } catch (error) {
                    UI.showToast(error.message, 'error');
                    btn.disabled = false;
                    btn.textContent = 'Create User';
                }
            });
        } catch (error) {
            UI.showToast('Failed to load users: ' + error.message, 'error');
        }
    }

    // ── Edit/Delete User ───────────────────────────────────────────
    async function editUser(id, oldUsername, oldRole) {
        const newUsername = prompt("Enter new username:", oldUsername);
        if (!newUsername || newUsername.trim() === "") return;
        
        const newRoleVal = prompt("Enter new role (admin, editor, author):", oldRole);
        if (!newRoleVal || newRoleVal.trim() === "") return;

        UI.showLoader();
        try {
            await Auth.updateAdmin(id, newUsername.trim(), newRoleVal.trim().toLowerCase());
            UI.showToast('User updated successfully', 'success');
            if (window.location.hash.includes('users')) {
                renderUsers();
            }
        } catch (error) {
            UI.showToast('Update failed: ' + error.message, 'error');
        } finally {
            UI.hideLoader();
        }
    }

    async function deleteUser(id) {
        const confirmed = await UI.confirm('Delete User', 'Are you sure you want to delete this user?');
        if (!confirmed) return;

        UI.showLoader();
        try {
            await Auth.deleteAdmin(id);
            UI.showToast('User deleted', 'success');
            if (window.location.hash.includes('users')) {
                renderUsers();
            }
        } catch (error) {
            UI.showToast('Delete failed: ' + error.message, 'error');
        } finally {
            UI.hideLoader();
        }
    }

    // ── Dashboard ──────────────────────────────────────────────────
    async function renderDashboard() {
        app.innerHTML = UI.inlineLoader();
        const result = await DB.getAllPosts();
        app.innerHTML = UI.renderDashboard(result.rows || []);
    }

    // ── Editor ─────────────────────────────────────────────────────
    async function renderEditor(id) {
        let post = null;

        if (id) {
            app.innerHTML = UI.inlineLoader();
            const result = await DB.getPostById(id);
            if (result.rows.length) {
                post = result.rows[0];
            }
        }

        app.innerHTML = UI.renderEditorPage(post);
        Editor.init(post ? post.content : '');
    }

    // ── Save Post ──────────────────────────────────────────────────
    async function savePost(status) {
        const data = Editor.getFormData();

        if (!data.title) {
            UI.showToast('Title is required', 'warning');
            return;
        }

        if (!data.slug) {
            data.slug = UI.slugify(data.title);
        }

        data.status = status;

        const btn = status === 'published'
            ? document.getElementById('btn-publish')
            : document.getElementById('btn-save-draft');

        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Saving...';
        }

        try {
            if (data.id) {
                await DB.updatePost(data.id, data);
                UI.showToast('Post updated successfully!', 'success');
            } else {
                const result = await DB.createPost(data);
                // Set the ID on the hidden field so further saves become updates
                const idField = document.getElementById('editor-post-id');
                if (idField && result.lastInsertId) {
                    idField.value = result.lastInsertId;
                }
                UI.showToast('Post created successfully!', 'success');
            }
            Editor.clearAutoSave();
        } catch (error) {
            UI.showToast('Save failed: ' + error.message, 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = status === 'published' ? 'Publish' : 'Save Draft';
            }
        }
    }

    // ── Delete Post ────────────────────────────────────────────────
    async function deletePost(id) {
        const confirmed = await UI.confirm(
            'Delete Post',
            'Are you sure you want to delete this post? This action cannot be undone.'
        );

        if (!confirmed) return;

        UI.showLoader();
        try {
            await DB.deletePost(id);
            UI.showToast('Post deleted', 'success');
            await renderDashboard();
        } catch (error) {
            UI.showToast('Delete failed: ' + error.message, 'error');
        } finally {
            UI.hideLoader();
        }
    }

    // ── Toggle Post Status ─────────────────────────────────────────
    async function togglePostStatus(id, currentStatus) {
        UI.showLoader();
        try {
            await DB.togglePostStatus(id, currentStatus);
            const newStatus = currentStatus === 'published' ? 'draft' : 'published';
            UI.showToast(`Post ${newStatus === 'published' ? 'published' : 'unpublished'}`, 'success');
            await renderDashboard();
        } catch (error) {
            UI.showToast('Status update failed: ' + error.message, 'error');
        } finally {
            UI.hideLoader();
        }
    }

    // ── Logout ─────────────────────────────────────────────────────
    function logout() {
        Auth.logout();
        UI.showToast('Logged out', 'info');
        Router.navigate('admin');
    }

    // ── Search & Filter ────────────────────────────────────────────
    function handleSearch(query) {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(async () => {
            searchQuery = query.trim().toLowerCase();
            let filtered = filterPosts(allPosts, searchQuery, activeCategory);
            const gridContainer = document.querySelector('.section');
            if (gridContainer) {
                app.innerHTML = UI.renderHomePage(filtered, categories, searchQuery, activeCategory);
            }
        }, 300);
    }

    function filterByCategory(category) {
        activeCategory = activeCategory === category ? '' : category;
        let filtered = filterPosts(allPosts, searchQuery, activeCategory);
        app.innerHTML = UI.renderHomePage(filtered, categories, searchQuery, activeCategory);
    }

    function filterPosts(posts, query, category) {
        let filtered = [...posts];

        if (category) {
            filtered = filtered.filter(p =>
                (p.category || '').toLowerCase() === category.toLowerCase()
            );
        }

        if (query) {
            filtered = filtered.filter(p => {
                const title = (p.title || '').toLowerCase();
                const tags = (p.tags || '').toLowerCase();
                const excerpt = (p.excerpt || '').toLowerCase();
                return title.includes(query) || tags.includes(query) || excerpt.includes(query);
            });
        }

        return filtered;
    }

    return {
        init,
        handleSearch,
        filterByCategory,
        savePost,
        deletePost,
        togglePostStatus,
        logout,
        showSetupAdmin,
        editUser,
        deleteUser,
    };
})();

// ── Bootstrap ──────────────────────────────────────────────────────
window.App = App;
document.addEventListener('DOMContentLoaded', App.init);
