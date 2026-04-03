/* ============================================
   UI MODULE
   ============================================ */

const UI = (() => {
    // ── Toast Notifications ────────────────────────────────────────
    function showToast(message, type = 'info', duration = 4000) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const icons = {
            success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>',
            error: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
            warning: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
            info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
        };

        toast.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    // ── Loading Overlay ────────────────────────────────────────────
    function showLoader() {
        document.getElementById('global-loader').classList.add('active');
    }

    function hideLoader() {
        document.getElementById('global-loader').classList.remove('active');
    }

    function inlineLoader() {
        return '<div class="inline-loader"><div class="loader-spinner"></div></div>';
    }

    function skeletonLoader() {
        return `
            <section class="section" style="padding-top: 80px;">
                <div class="skeleton-card skeleton" style="margin-bottom: 48px; min-height: 380px;"></div>
                <div class="post-grid">
                    ${[1, 2, 3].map(() => `
                        <article class="skeleton-card">
                            <div class="skeleton-image skeleton"></div>
                            <div class="skeleton-card-body">
                                <div class="skeleton-title skeleton"></div>
                                <div class="skeleton-text skeleton"></div>
                                <div class="skeleton-text skeleton"></div>
                                <div class="skeleton-text short skeleton"></div>
                                <div class="skeleton-meta skeleton"></div>
                            </div>
                        </article>
                    `).join('')}
                </div>
            </section>
        `;
    }

    function skeletonPostLoader() {
        return `
            <article>
                <div class="single-post-hero skeleton" style="height: clamp(250px, 40vw, 480px); border-radius: 0;"></div>
                <div class="single-post-content" style="max-width: 760px; margin: 0 auto; padding: 64px 32px;">
                    <div class="skeleton-title skeleton" style="height: 48px; margin-bottom: 30px; width: 60%;"></div>
                    <div class="skeleton-text skeleton" style="height: 20px;"></div>
                    <div class="skeleton-text skeleton" style="height: 20px;"></div>
                    <div class="skeleton-text short skeleton" style="height: 20px; margin-bottom: 40px;"></div>
                    <div class="skeleton-image skeleton" style="margin-bottom: 30px;"></div>
                    <div class="skeleton-text skeleton" style="height: 20px;"></div>
                    <div class="skeleton-text skeleton" style="height: 20px;"></div>
                </div>
            </article>
        `;
    }

    // ── Confirm Dialog ─────────────────────────────────────────────
    function confirm(title, message) {
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'confirm-overlay';
            overlay.innerHTML = `
                <div class="confirm-dialog">
                    <h3>${title}</h3>
                    <p>${message}</p>
                    <div class="confirm-dialog-actions">
                        <button class="btn btn-secondary" id="confirm-cancel">Cancel</button>
                        <button class="btn btn-danger" id="confirm-ok">Delete</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            overlay.querySelector('#confirm-cancel').addEventListener('click', () => {
                overlay.remove();
                resolve(false);
            });

            overlay.querySelector('#confirm-ok').addEventListener('click', () => {
                overlay.remove();
                resolve(true);
            });

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.remove();
                    resolve(false);
                }
            });
        });
    }

    // ── Helpers ────────────────────────────────────────────────────
    function formatDate(dateStr) {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr + (dateStr.includes('Z') ? '' : 'Z'));
            return d.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
        } catch {
            return dateStr;
        }
    }

    function estimateReadTime(html) {
        if (!html) return '1 min read';
        const text = html.replace(/<[^>]+>/g, '');
        const words = text.split(/\s+/).filter(w => w.length > 0).length;
        const minutes = Math.max(1, Math.ceil(words / 200));
        return `${minutes} min read`;
    }

    function slugify(text) {
        return text
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 80);
    }

    function escapeHtml(text) {
        const d = document.createElement('div');
        d.textContent = text;
        return d.innerHTML;
    }

    function truncate(text, maxLen = 120) {
        if (!text || text.length <= maxLen) return text || '';
        return text.substring(0, maxLen).trim() + '...';
    }

    // ── Theme ──────────────────────────────────────────────────────
    function initTheme() {
        const saved = localStorage.getItem('theme');
        if (saved) {
            document.documentElement.setAttribute('data-theme', saved);
        } else {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        }
    }

    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
    }

    // ── Navbar Scroll ──────────────────────────────────────────────
    function initNavbar() {
        const navbar = document.getElementById('navbar');
        let lastScroll = 0;

        window.addEventListener('scroll', () => {
            const scrollY = window.scrollY;
            if (scrollY > 10) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
            lastScroll = scrollY;
        }, { passive: true });

        // Close mobile menu on link click
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                document.getElementById('nav-toggle').checked = false;
            });
        });
    }

    // ── Setup Config Form ──────────────────────────────────────────
    function renderSetupPage() {
        return `
            <div class="admin-login">
                <div class="login-card" style="max-width: 520px;">
                    <h1>Database Setup</h1>
                    <p class="login-subtitle">Connect your Turso database to get started</p>
                    <form id="setup-form">
                        <div class="form-group">
                            <label class="form-label" for="setup-url">Database URL</label>
                            <input class="form-input" type="url" id="setup-url"
                                   placeholder="https://your-db-name-your-org.turso.io" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="setup-read-token">Read-Only Token</label>
                            <input class="form-input" type="password" id="setup-read-token"
                                   placeholder="eyJ..." required>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="setup-full-token">Full-Access Token</label>
                            <input class="form-input" type="password" id="setup-full-token"
                                   placeholder="eyJ..." required>
                        </div>
                        <button class="btn btn-primary btn-full" type="submit">Connect Database</button>
                    </form>
                </div>
            </div>
        `;
    }

    // ── Render Pages ───────────────────────────────────────────────

    function renderHomePage(posts, categories, searchQuery = '', activeCategory = '') {
        const featured = posts.length > 0 ? posts[0] : null;
        const gridPosts = posts.length > 1 ? posts.slice(1) : [];

        let featuredHtml = '';
        if (featured) {
            featuredHtml = `
                <div class="featured-post fade-in">
                    <div class="featured-post-image">
                        ${featured.cover_image_url
                            ? `<img src="${escapeHtml(featured.cover_image_url)}" alt="${escapeHtml(featured.title)}" loading="lazy">`
                            : `<div class="no-cover"><span class="no-cover-text">Featured</span></div>`
                        }
                    </div>
                    <div class="featured-post-content">
                        <span class="featured-badge">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                            Featured
                        </span>
                        ${featured.category ? `<span class="post-category-badge">${escapeHtml(featured.category)}</span>` : ''}
                        <h2><a href="#post/${escapeHtml(featured.slug)}">${escapeHtml(featured.title)}</a></h2>
                        <p>${escapeHtml(truncate(featured.excerpt, 180))}</p>
                        <div class="post-meta">
                            <span class="post-meta-item">${formatDate(featured.created_at)}</span>
                            <span class="post-meta-item">${estimateReadTime(featured.content || featured.excerpt)}</span>
                        </div>
                    </div>
                </div>
            `;
        }

        const categoryBtns = categories.map(cat => `
            <button class="category-btn ${activeCategory === cat ? 'active' : ''}"
                    onclick="App.filterByCategory('${escapeHtml(cat)}')">${escapeHtml(cat)}</button>
        `).join('');

        const gridHtml = gridPosts.map((post, i) => renderPostCard(post, i)).join('');

        return `
            <section class="hero">
                <div class="hero-content">
                    <h1>Welcome to DevBlog</h1>
                    <p>Exploring ideas, sharing knowledge, and building the future of the web — one post at a time.</p>
                    <div class="hero-search">
                        <svg class="hero-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                        <input type="text" id="search-input" placeholder="Search posts by title or tag..."
                               value="${escapeHtml(searchQuery)}" oninput="App.handleSearch(this.value)">
                    </div>
                </div>
            </section>

            ${categories.length > 0 ? `
                <div class="category-filters" style="margin-top: 32px;">
                    <button class="category-btn ${!activeCategory ? 'active' : ''}"
                            onclick="App.filterByCategory('')">All</button>
                    ${categoryBtns}
                </div>
            ` : ''}

            <section class="section">
                ${!searchQuery && !activeCategory ? featuredHtml : ''}

                ${posts.length === 0 ? `
                    <div class="empty-state">
                        <div class="empty-state-icon">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="1" opacity="0.4">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                <polyline points="10 9 9 9 8 9"></polyline>
                            </svg>
                        </div>
                        <h3>No posts found</h3>
                        <p>${searchQuery ? 'Try a different search term' : 'Check back later for new content!'}</p>
                    </div>
                ` : `
                    ${gridPosts.length > 0 || searchQuery || activeCategory ? `
                        <div class="section-header">
                            <h2 class="section-title">${searchQuery ? 'Search Results' : activeCategory ? escapeHtml(activeCategory) : 'Latest Posts'}</h2>
                        </div>
                        <div class="post-grid">
                            ${searchQuery || activeCategory ? posts.map((p, i) => renderPostCard(p, i)).join('') : gridHtml}
                        </div>
                    ` : ''}
                `}
            </section>
        `;
    }

    function renderPostCard(post, index = 0) {
        return `
            <article class="post-card fade-in" style="animation-delay: ${index * 80}ms">
                <div class="post-card-image">
                    ${post.cover_image_url
                        ? `<img src="${escapeHtml(post.cover_image_url)}" alt="${escapeHtml(post.title)}" loading="lazy">`
                        : `<div class="no-cover"><span class="no-cover-text">No Cover</span></div>`
                    }
                    ${post.category ? `<span class="post-card-category">${escapeHtml(post.category)}</span>` : ''}
                </div>
                <div class="post-card-body">
                    <h3><a href="#post/${escapeHtml(post.slug)}">${escapeHtml(post.title)}</a></h3>
                    <p class="post-card-excerpt">${escapeHtml(truncate(post.excerpt, 140))}</p>
                    <div class="post-card-meta">
                        <span>${formatDate(post.created_at)}</span>
                        <span>${estimateReadTime(post.content || post.excerpt)}</span>
                    </div>
                </div>
            </article>
        `;
    }

    function renderSinglePost(post, adjacent) {
        return `
            <article>
                <div class="single-post-hero">
                    ${post.cover_image_url
                        ? `<img src="${escapeHtml(post.cover_image_url)}" alt="${escapeHtml(post.title)}">`
                        : `<div class="no-cover" style="width:100%;height:100%"><span class="no-cover-text">${escapeHtml(post.title)}</span></div>`
                    }
                    <div class="single-post-hero-overlay"></div>
                    <div class="single-post-header">
                        ${post.category ? `<span class="post-category-badge">${escapeHtml(post.category)}</span>` : ''}
                        <h1>${escapeHtml(post.title)}</h1>
                        <div class="post-meta">
                            <span class="post-meta-item">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                ${formatDate(post.created_at)}
                            </span>
                            <span class="post-meta-item">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                ${estimateReadTime(post.content)}
                            </span>
                            ${post.tags ? `<span class="post-meta-item">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                                ${escapeHtml(post.tags)}
                            </span>` : ''}
                        </div>
                    </div>
                </div>

                <div class="single-post-content fade-in">
                    <div class="post-body">
                        ${post.content || '<p>No content available.</p>'}
                    </div>

                    ${(adjacent.prev || adjacent.next) ? `
                        <nav class="post-navigation">
                            ${adjacent.prev ? `
                                <a href="#post/${escapeHtml(adjacent.prev.slug)}" class="post-nav-item prev">
                                    <span class="post-nav-label">&larr; Previous</span>
                                    <span class="post-nav-title">${escapeHtml(adjacent.prev.title)}</span>
                                </a>
                            ` : '<div></div>'}
                            ${adjacent.next ? `
                                <a href="#post/${escapeHtml(adjacent.next.slug)}" class="post-nav-item next">
                                    <span class="post-nav-label">Next &rarr;</span>
                                    <span class="post-nav-title">${escapeHtml(adjacent.next.title)}</span>
                                </a>
                            ` : '<div></div>'}
                        </nav>
                    ` : ''}
                </div>
            </article>
        `;
    }

    // ── Admin Login Page ───────────────────────────────────────────
    function renderLoginPage() {
        return `
            <div class="admin-login">
                <div class="login-card">
                    <h1>Admin Login</h1>
                    <p class="login-subtitle">Sign in to manage your blog</p>
                    <form id="login-form">
                        <div class="form-group">
                            <label class="form-label" for="login-username">Username</label>
                            <input class="form-input" type="text" id="login-username"
                                   placeholder="Enter your username" required autocomplete="username">
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="login-password">Password</label>
                            <input class="form-input" type="password" id="login-password"
                                   placeholder="Enter your password" required autocomplete="current-password">
                        </div>
                        <button class="btn btn-primary btn-full" type="submit" id="login-btn">Sign In</button>
                    </form>
                    <div style="text-align:center;margin-top:16px;">
                        <a href="#admin/forgot-password" style="font-size:0.85rem;color:var(--text-secondary);display:block;margin-bottom:12px;">Forgot your password?</a>
                        <button class="btn btn-secondary btn-sm" onclick="App.showSetupAdmin()" style="font-size:0.8rem;">
                            First time? Create admin account
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // ── Admin Setup Page ───────────────────────────────────────────
    function renderAdminSetup() {
        return `
            <div class="admin-login">
                <div class="login-card">
                    <h1>Create Admin</h1>
                    <p class="login-subtitle">Set up your admin account</p>
                    <form id="setup-admin-form">
                        <div class="form-group">
                            <label class="form-label" for="admin-username">Username</label>
                            <input class="form-input" type="text" id="admin-username"
                                   placeholder="Choose a username" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="admin-password">Password</label>
                            <input class="form-input" type="password" id="admin-password"
                                   placeholder="Choose a strong password" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="admin-password-confirm">Confirm Password</label>
                            <input class="form-input" type="password" id="admin-password-confirm"
                                   placeholder="Re-enter your password" required>
                        </div>
                        <button class="btn btn-primary btn-full" type="submit">Create Account</button>
                    </form>
                    <div style="text-align:center;margin-top:16px;">
                        <a href="#admin" style="font-size:0.85rem;color:var(--text-secondary);">&larr; Back to login</a>
                    </div>
                </div>
            </div>
        `;
    }

    // ── Admin Dashboard ────────────────────────────────────────────
    function renderDashboard(posts) {
        const published = posts.filter(p => p.status === 'published').length;
        const drafts = posts.filter(p => p.status === 'draft').length;

        const rows = posts.map(post => `
            <tr>
                <td class="post-title-cell">${escapeHtml(post.title)}</td>
                <td>
                    <span class="status-badge ${post.status}">
                        <span class="status-dot"></span>
                        ${post.status}
                    </span>
                </td>
                <td>${formatDate(post.created_at)}</td>
                <td>
                    <div class="table-actions">
                        <a href="#admin/editor?id=${post.id}" class="btn btn-secondary btn-sm" title="Edit">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            Edit
                        </a>
                        <button class="btn btn-sm ${post.status === 'published' ? 'btn-secondary' : 'btn-success'}"
                                onclick="App.togglePostStatus(${post.id}, '${post.status}')" title="${post.status === 'published' ? 'Unpublish' : 'Publish'}">
                            ${post.status === 'published' ? 'Unpublish' : 'Publish'}
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="App.deletePost(${post.id})" title="Delete">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        return `
            <div class="admin-dashboard fade-in">
                <div class="dashboard-header">
                    <h1>Dashboard</h1>
                    <div style="display:flex;gap:10px;align-items:center;">
                        <a href="#admin/editor" class="btn btn-primary">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            New Post
                        </a>
                        <a href="#admin/users" class="btn btn-secondary" title="Manage Users">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        </a>
                        <button class="btn btn-secondary" onclick="App.logout()">Logout</button>
                    </div>
                </div>

                <div class="dashboard-stats">
                    <div class="stat-card">
                        <div class="stat-value">${posts.length}</div>
                        <div class="stat-label">Total Posts</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${published}</div>
                        <div class="stat-label">Published</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${drafts}</div>
                        <div class="stat-label">Drafts</div>
                    </div>
                </div>

                ${posts.length === 0 ? `
                    <div class="empty-state">
                        <div class="empty-state-icon">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="1" opacity="0.4">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="12" y1="11" x2="12" y2="17"></line>
                                <line x1="9" y1="14" x2="15" y2="14"></line>
                            </svg>
                        </div>
                        <h3>No posts yet</h3>
                        <p>Create your first blog post to get started!</p>
                        <a href="#admin/editor" class="btn btn-primary">Create Post</a>
                    </div>
                ` : `
                    <div class="posts-table-wrapper">
                        <table class="posts-table">
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rows}
                            </tbody>
                        </table>
                    </div>
                `}
            </div>
        `;
    }

    // ── Editor Page ────────────────────────────────────────────────
    function renderEditorPage(post = null) {
        const isEdit = post !== null;
        return `
            <div class="editor-page fade-in">
                <div class="editor-header">
                    <h1>${isEdit ? 'Edit Post' : 'Create New Post'}</h1>
                    <div class="editor-actions">
                        <span class="editor-autosave" id="autosave-status"></span>
                        <button class="btn btn-secondary" onclick="App.savePost('draft')" id="btn-save-draft">Save Draft</button>
                        <button class="btn btn-primary" onclick="App.savePost('published')" id="btn-publish">Publish</button>
                    </div>
                </div>

                <div class="editor-form">
                    <div class="form-group">
                        <label class="form-label" for="editor-title">Title</label>
                        <input class="form-input" type="text" id="editor-title"
                               placeholder="Post title" value="${isEdit ? escapeHtml(post.title) : ''}"
                               oninput="Editor.autoSlug()">
                    </div>

                    <div class="editor-row">
                        <div class="form-group">
                            <label class="form-label" for="editor-slug">Slug</label>
                            <input class="form-input" type="text" id="editor-slug"
                                   placeholder="post-url-slug" value="${isEdit ? escapeHtml(post.slug) : ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="editor-category">Category</label>
                            <input class="form-input" type="text" id="editor-category"
                                   placeholder="e.g. Technology" value="${isEdit ? escapeHtml(post.category || '') : ''}">
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="editor-excerpt">Excerpt</label>
                        <textarea class="form-input" id="editor-excerpt" rows="3"
                                  placeholder="A brief summary of your post...">${isEdit ? escapeHtml(post.excerpt || '') : ''}</textarea>
                    </div>

                    <div class="editor-row">
                        <div class="form-group">
                            <label class="form-label" for="editor-cover">Cover Image URL</label>
                            <input class="form-input" type="url" id="editor-cover"
                                   placeholder="https://example.com/image.jpg"
                                   value="${isEdit ? escapeHtml(post.cover_image_url || '') : ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="editor-tags">Tags (comma-separated)</label>
                            <input class="form-input" type="text" id="editor-tags"
                                   placeholder="javascript, web, tutorial"
                                   value="${isEdit ? escapeHtml(post.tags || '') : ''}">
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Content</label>
                        <div class="editor-content-wrapper">
                            <div id="editor-container"></div>
                        </div>
                    </div>

                    <input type="hidden" id="editor-post-id" value="${isEdit ? post.id : ''}">
                </div>
            </div>
        `;
    }

    // ── Forgot Password Page ───────────────────────────────────────
    function renderForgotPassword() {
        return `
            <div class="admin-login fade-in">
                <div class="login-card">
                    <h1>Forgot Password</h1>
                    <p class="login-subtitle">Enter your username to reset password.</p>
                    <form id="forgot-password-form">
                        <div class="form-group">
                            <label class="form-label" for="forgot-username">Username</label>
                            <input class="form-input" type="text" id="forgot-username" placeholder="Enter username" required>
                        </div>
                        <button class="btn btn-primary btn-full" type="submit" id="forgot-btn">Request Reset Link</button>
                    </form>
                    <div style="text-align:center;margin-top:16px;">
                        <a href="#admin" style="font-size:0.85rem;color:var(--text-secondary);">&larr; Back to login</a>
                    </div>
                </div>
            </div>
        `;
    }

    // ── Reset Password Page ────────────────────────────────────────
    function renderResetPassword(username, token) {
        return `
            <div class="admin-login fade-in">
                <div class="login-card">
                    <h1>Reset Password</h1>
                    <p class="login-subtitle">Set a new password for <strong>${escapeHtml(username)}</strong></p>
                    <form id="reset-password-form">
                        <input type="hidden" id="reset-username" value="${escapeHtml(username)}">
                        <input type="hidden" id="reset-token" value="${escapeHtml(token)}">
                        
                        <div class="form-group">
                            <label class="form-label" for="reset-new-password">New Password</label>
                            <input class="form-input" type="password" id="reset-new-password" placeholder="New strong password" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="reset-confirm-password">Confirm Password</label>
                            <input class="form-input" type="password" id="reset-confirm-password" placeholder="Confirm new password" required>
                        </div>
                        <button class="btn btn-primary btn-full" type="submit" id="reset-btn">Reset Password</button>
                    </form>
                </div>
            </div>
        `;
    }

    // ── Admin Users Page ───────────────────────────────────────────
    function renderAdminUsers(admins) {
        const rows = admins.map(adm => `
            <tr>
                <td style="font-weight: 600;">${escapeHtml(adm.username)}</td>
                <td>
                    <div class="table-actions" style="justify-content: flex-end;">
                        <span class="status-badge drafted" style="background:var(--bg-secondary);color:var(--text-primary);margin-right:12px;">${escapeHtml(adm.role || 'admin')}</span>
                        <button class="btn btn-secondary btn-sm" onclick="App.editUser(${adm.id}, '${escapeHtml(adm.username)}', '${escapeHtml(adm.role || 'admin')}')">
                           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                           Edit
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="App.deleteUser(${adm.id})">
                           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                           Delete
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        return `
            <div class="admin-dashboard fade-in">
                <div class="dashboard-header">
                    <h1>Manage Users</h1>
                    <div style="display:flex;gap:10px;align-items:center;">
                        <a href="#admin/dashboard" class="btn btn-secondary">&larr; Dashboard</a>
                    </div>
                </div>

                <div class="posts-table-wrapper" style="margin-bottom: 32px;">
                    <table class="posts-table">
                        <thead>
                            <tr>
                                <th>Username</th>
                                <th style="text-align: right;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows}
                        </tbody>
                    </table>
                </div>

                <div class="login-card" style="box-shadow: var(--shadow-sm); max-width: 100%;">
                    <h3 style="margin-bottom: 24px;">Add New Admin</h3>
                    <form id="add-admin-form" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;">
                        <div class="form-group">
                            <label class="form-label" for="new-admin-username">Username</label>
                            <input class="form-input" type="text" id="new-admin-username" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="new-admin-password">Password</label>
                            <input class="form-input" type="password" id="new-admin-password" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="new-admin-role">Role</label>
                            <select class="form-input" id="new-admin-role" style="appearance: auto;">
                                <option value="admin">Admin</option>
                                <option value="editor">Editor</option>
                                <option value="author">Author</option>
                            </select>
                        </div>
                        <div class="form-group" style="grid-column: span 3;">
                            <button class="btn btn-primary" type="submit" style="width: auto;">Create User</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    return {
        showToast,
        showLoader,
        hideLoader,
        inlineLoader,
        skeletonLoader,
        skeletonPostLoader,
        confirm,
        formatDate,
        estimateReadTime,
        slugify,
        escapeHtml,
        truncate,
        initTheme,
        toggleTheme,
        initNavbar,
        renderSetupPage,
        renderHomePage,
        renderPostCard,
        renderSinglePost,
        renderLoginPage,
        renderAdminSetup,
        renderDashboard,
        renderEditorPage,
        renderForgotPassword,
        renderResetPassword,
        renderAdminUsers,
    };
})();
