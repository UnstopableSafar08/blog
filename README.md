# DevBlog

A complete, full-stack blog built with vanilla web technologies (HTML, CSS, JavaScript) and Turso (libSQL) acting as the database. It is designed to be lightweight, fast, and easily deployable as a static site (e.g., on GitHub Pages).

## Features

- **No Frameworks:** 100% Vanilla HTML, CSS, and JavaScript.
- **Hash-based Routing:** Client-side routing without a server (`#home`, `#admin`, etc.).
- **Turso Database Integration:** Connects directly to a Turso (libSQL) database via the HTTP API using fetch.
- **Admin Panel:** Complete management system (create, edit, delete, publish/unpublish posts) with SHA-256 password hashing.
- **Rich Text Editor:** Integrated with Quill.js for WYSIWYG editing, including auto-save and auto-slug generation.
- **Light / Dark Mode:** Native dark mode support adapting to system preferences (`prefers-color-scheme`) and persistent via `localStorage`.
- **Responsive Design:** Mobile-first architecture with fluid typography and scalable UI components.
- **Skeleton Loading Screen:** A beautiful skeleton UI for a smooth loading experience while fetching data.

## Getting Started

1. Clone this repository locally.
2. Ensure you have your explicit Turso database credentials:
   - Database URL
   - Full Access Token (Read/Write)
   - Read-Only Token
3. Serve the application using any static file server:
   ```bash
   python -m http.server 8080
   ```
4. Navigate to `http://localhost:8080/#home`.
5. Access the admin dashboard at `http://localhost:8080/#admin` to set up your primary admin account and create your first posts!

## Setup Turso Database

The application automatically provisions its own tables when it connects if they don't exist. It will enforce the following schema:
- `posts`: Handles all blog entries including drafts and published states.
- `admin`: Handles your securely hashed admin credentials.

## Directory Structure

```text
├── index.html        # Entry point for the SPA
├── README.md         # Project documentation
└── assets/
    ├── css/
    │   └── style.css # All styling, including themes and responsive rules
    └── js/
        ├── app.js    # Main application controller and event registry
        ├── auth.js   # Authentication logic and hashing module
        ├── db.js     # Turso SQL communications via HTTP request
        ├── editor.js # Quill.js initialization and autosave loop
        ├── router.js # Simple hash-based router logic
        └── ui.js     # View rendering functions (HTML templates) and toasts
```

## Deploying to GitHub Pages

Since this relies heavily on hash-routing (`#`) and client-side database fetching via Turso, the repository requires absolutely zero build steps.
To host:
1. Push the code to a GitHub repository.
2. Go to Repository Settings > Pages.
3. Select `main` branch as the source.
4. Your blog is live!

---

*Built with vanilla web tech.*
