/* ============================================
   EDITOR MODULE (Quill.js Integration)
   ============================================ */

const Editor = (() => {
    let quillInstance = null;
    let autoSaveInterval = null;
    let slugManuallyEdited = false;

    // ── Initialize Quill ───────────────────────────────────────────
    function init(content = '') {
        destroy();

        const container = document.getElementById('editor-container');
        if (!container) return;

        quillInstance = new Quill('#editor-container', {
            theme: 'snow',
            placeholder: 'Write your blog post content here...',
            modules: {
                toolbar: [
                    [{ header: [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    ['blockquote', 'code-block'],
                    [{ list: 'ordered' }, { list: 'bullet' }],
                    [{ align: [] }],
                    ['link', 'image'],
                    ['clean'],
                ],
            },
        });

        if (content) {
            quillInstance.root.innerHTML = content;
        }

        // Check for autosaved draft
        const autosaved = loadAutoSave();
        if (autosaved && !content) {
            const restored = window.confirm('An auto-saved draft was found. Do you want to restore it?');
            if (restored) {
                restoreAutoSave(autosaved);
            } else {
                clearAutoSave();
            }
        }

        // Track manual slug editing
        const slugInput = document.getElementById('editor-slug');
        if (slugInput) {
            slugInput.addEventListener('input', () => {
                slugManuallyEdited = true;
            });
        }

        // Start auto-save
        startAutoSave();

        return quillInstance;
    }

    // ── Get Content ────────────────────────────────────────────────
    function getContent() {
        if (!quillInstance) return '';
        return quillInstance.root.innerHTML;
    }

    // ── Get Form Data ──────────────────────────────────────────────
    function getFormData() {
        return {
            id: document.getElementById('editor-post-id')?.value || '',
            title: document.getElementById('editor-title')?.value?.trim() || '',
            slug: document.getElementById('editor-slug')?.value?.trim() || '',
            excerpt: document.getElementById('editor-excerpt')?.value?.trim() || '',
            cover_image_url: document.getElementById('editor-cover')?.value?.trim() || '',
            category: document.getElementById('editor-category')?.value?.trim() || '',
            tags: document.getElementById('editor-tags')?.value?.trim() || '',
            content: getContent(),
        };
    }

    // ── Auto Slug ──────────────────────────────────────────────────
    function autoSlug() {
        if (slugManuallyEdited) return;
        const title = document.getElementById('editor-title')?.value || '';
        const slug = UI.slugify(title);
        const slugInput = document.getElementById('editor-slug');
        if (slugInput) {
            slugInput.value = slug;
        }
    }

    // ── Auto Save ──────────────────────────────────────────────────
    function startAutoSave() {
        stopAutoSave();
        autoSaveInterval = setInterval(() => {
            const data = getFormData();
            if (data.title || data.content) {
                localStorage.setItem('blog_editor_autosave', JSON.stringify({
                    ...data,
                    savedAt: new Date().toISOString(),
                }));
                updateAutoSaveStatus();
            }
        }, 30000); // Every 30 seconds
    }

    function stopAutoSave() {
        if (autoSaveInterval) {
            clearInterval(autoSaveInterval);
            autoSaveInterval = null;
        }
    }

    function updateAutoSaveStatus() {
        const el = document.getElementById('autosave-status');
        if (el) {
            const now = new Date();
            el.textContent = `Auto-saved at ${now.toLocaleTimeString()}`;
        }
    }

    function loadAutoSave() {
        try {
            const raw = localStorage.getItem('blog_editor_autosave');
            if (!raw) return null;
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }

    function restoreAutoSave(data) {
        if (!data) return;
        if (data.title) document.getElementById('editor-title').value = data.title;
        if (data.slug) {
            document.getElementById('editor-slug').value = data.slug;
            slugManuallyEdited = true;
        }
        if (data.excerpt) document.getElementById('editor-excerpt').value = data.excerpt;
        if (data.cover_image_url) document.getElementById('editor-cover').value = data.cover_image_url;
        if (data.category) document.getElementById('editor-category').value = data.category;
        if (data.tags) document.getElementById('editor-tags').value = data.tags;
        if (data.content && quillInstance) {
            quillInstance.root.innerHTML = data.content;
        }
    }

    function clearAutoSave() {
        localStorage.removeItem('blog_editor_autosave');
    }

    // ── Destroy ────────────────────────────────────────────────────
    function destroy() {
        stopAutoSave();
        quillInstance = null;
        slugManuallyEdited = false;
    }

    return {
        init,
        getContent,
        getFormData,
        autoSlug,
        startAutoSave,
        stopAutoSave,
        clearAutoSave,
        destroy,
    };
})();
