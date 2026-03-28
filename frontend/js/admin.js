// Admin JS — dashboard + album management

(function () {
  const page = detectPage();
  if (page === 'dashboard') initDashboard();
  if (page === 'album') initAlbumPage();

  function detectPage() {
    if (document.getElementById('album-list')) return 'dashboard';
    if (document.getElementById('preview-grid')) return 'album';
    return null;
  }

  // ─── Dashboard ──────────────────────────────────────────

  function initDashboard() {
    loadAlbums();
    initLogout();
    initCreateAlbumForm();
  }

  async function loadAlbums() {
    try {
      const res = await fetch('/api/albums');
      if (res.status === 401) return redirectToLogin();
      const albums = await res.json();

      document.getElementById('stat-albums').textContent = albums.length;
      document.getElementById('stat-photos').textContent =
        albums.reduce((sum, a) => sum + a.photoCount, 0);

      const list = document.getElementById('album-list');
      if (!albums.length) {
        list.innerHTML = '<p class="empty-state">No albums yet. Create one above.</p>';
        return;
      }

      list.innerHTML = albums.map(album => `
        <div class="album-row" data-slug="${album.slug}">
          <div class="album-row-thumb">
            ${album.coverUrl
              ? `<img src="${album.coverUrl}" alt="${album.title}">`
              : '<div class="album-card-placeholder"></div>'}
          </div>
          <div class="album-row-info">
            <strong>${album.title}</strong>
            <span>${album.photoCount} photo${album.photoCount !== 1 ? 's' : ''}</span>
          </div>
          <div class="album-row-actions">
            <a href="/admin/album/${album.slug}" class="btn btn-outline btn-small">Manage</a>
            <button class="btn btn-danger btn-small delete-album-btn" data-slug="${album.slug}" data-title="${album.title}">Delete</button>
          </div>
        </div>
      `).join('');

      initDeleteAlbumButtons();
    } catch {
      document.getElementById('album-list').innerHTML =
        '<p class="empty-state">Failed to load albums.</p>';
    }
  }

  function initCreateAlbumForm() {
    const form = document.getElementById('create-album-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('album-title').value.trim();
      const description = document.getElementById('album-desc').value.trim();
      if (!title) return;

      try {
        const res = await fetch('/api/albums', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, description }),
        });
        if (res.status === 401) return redirectToLogin();
        if (!res.ok) {
          const data = await res.json();
          alert(data.error || 'Failed to create album');
          return;
        }
        window.location.reload();
      } catch {
        alert('Network error');
      }
    });
  }

  function initDeleteAlbumButtons() {
    document.querySelectorAll('.delete-album-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const slug = btn.dataset.slug;
        const title = btn.dataset.title;
        if (!confirm(`Delete album "${title}"? This cannot be undone.`)) return;

        try {
          const res = await fetch(`/api/albums/${slug}`, { method: 'DELETE' });
          if (res.status === 401) return redirectToLogin();
          if (res.ok) {
            btn.closest('.album-row').remove();
          } else {
            alert('Failed to delete album');
          }
        } catch {
          alert('Network error');
        }
      });
    });
  }

  function initLogout() {
    const btn = document.getElementById('logout-btn');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      await fetch('/api/logout');
      window.location.href = '/admin/login';
    });
  }

  // ─── Album Management ──────────────────────────────────

  function initAlbumPage() {
    const slug = window.location.pathname.split('/admin/album/')[1];
    if (!slug) return;

    document.getElementById('view-public-link').href = `/album/${slug}`;
    loadAlbumData(slug);
    initSettingsForm(slug);
    initUploadZone(slug);
  }

  async function loadAlbumData(slug) {
    try {
      const res = await fetch(`/api/albums/${slug}`);
      if (res.status === 401) return redirectToLogin();
      const album = await res.json();

      document.getElementById('page-title').textContent = album.title;
      document.getElementById('edit-title').value = album.title;
      document.getElementById('edit-desc').value = album.description || '';

      // Load photos
      const photosRes = await fetch(`/api/albums/${slug}/photos`);
      const photos = await photosRes.json();

      document.getElementById('photo-count').textContent = `(${photos.length})`;
      renderPreviewGrid(photos, slug);
    } catch {
      document.getElementById('preview-grid').innerHTML =
        '<p class="empty-state">Failed to load album.</p>';
    }
  }

  function renderPreviewGrid(photos, slug) {
    const grid = document.getElementById('preview-grid');
    if (!photos.length) {
      grid.innerHTML = '<p class="empty-state">No photos yet. Upload some above.</p>';
      return;
    }

    grid.innerHTML = photos.map(photo => `
      <div class="masonry-item preview-item" draggable="true" data-filename="${photo.filename}">
        <img src="${photo.src}" alt="${photo.filename}" loading="lazy">
        <div class="preview-actions">
          <button class="preview-action-btn set-cover-btn ${photo.isCover ? 'active' : ''}"
                  data-filename="${photo.filename}" title="Set as cover">
            ${photo.isCover ? '&#9733;' : '&#9734;'}
          </button>
          <button class="preview-action-btn delete-photo-btn"
                  data-filename="${photo.filename}" title="Delete photo">
            &#10005;
          </button>
        </div>
        <div class="drag-hint">Drag to reorder</div>
      </div>
    `).join('');

    initPreviewActions(slug);
    initDragReorder(grid, slug);
  }

  function initPreviewActions(slug) {
    // Set cover
    document.querySelectorAll('.set-cover-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const filename = btn.dataset.filename;
        try {
          const res = await fetch(`/api/albums/${slug}/cover`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cover: filename }),
          });
          if (res.status === 401) return redirectToLogin();
          if (res.ok) {
            document.querySelectorAll('.set-cover-btn').forEach(b => {
              b.classList.remove('active');
              b.innerHTML = '&#9734;';
            });
            btn.classList.add('active');
            btn.innerHTML = '&#9733;';
          }
        } catch {
          alert('Failed to set cover');
        }
      });
    });

    // Delete photo
    document.querySelectorAll('.delete-photo-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this photo?')) return;
        const filename = btn.dataset.filename;
        try {
          const res = await fetch(`/api/albums/${slug}/photos/${filename}`, {
            method: 'DELETE',
          });
          if (res.status === 401) return redirectToLogin();
          if (res.ok) {
            btn.closest('.preview-item').remove();
            const countEl = document.getElementById('photo-count');
            const current = parseInt(countEl.textContent.replace(/\D/g, ''), 10) || 0;
            countEl.textContent = `(${current - 1})`;
          }
        } catch {
          alert('Failed to delete photo');
        }
      });
    });
  }

  function initSettingsForm(slug) {
    const form = document.getElementById('settings-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('edit-title').value.trim();
      const description = document.getElementById('edit-desc').value.trim();

      try {
        const res = await fetch(`/api/albums/${slug}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, description }),
        });
        if (res.status === 401) return redirectToLogin();
        if (res.ok) {
          document.getElementById('page-title').textContent = title;
          alert('Settings saved');
        }
      } catch {
        alert('Failed to save settings');
      }
    });
  }

  // ─── Upload (presigned URLs → direct to R2) ────────────

  function initUploadZone(slug) {
    const zone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    if (!zone || !fileInput) return;

    zone.addEventListener('click', () => fileInput.click());

    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('dragover');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
      if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files, slug);
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files.length) uploadFiles(fileInput.files, slug);
    });
  }

  async function uploadFiles(fileList, slug) {
    const files = Array.from(fileList);
    const progressEl = document.getElementById('upload-progress');
    const fillEl = document.getElementById('progress-fill');
    const textEl = document.getElementById('progress-text');

    progressEl.style.display = 'block';
    fillEl.style.width = '0%';

    try {
      // Upload each file through the server proxy (avoids R2 CORS issues)
      const filenames = [];
      for (let i = 0; i < files.length; i++) {
        textEl.textContent = `Uploading ${i + 1} of ${files.length}...`;
        fillEl.style.width = `${((i) / files.length) * 90}%`;

        const ext = (files[i].name || 'image.jpg').split('.').pop().toLowerCase();
        const uploadRes = await fetch(`/api/albums/${slug}/upload`, {
          method: 'POST',
          body: files[i],
          headers: {
            'Content-Type': files[i].type || 'image/jpeg',
            'X-File-Ext': ext,
          },
        });

        if (uploadRes.status === 401) return redirectToLogin();
        if (!uploadRes.ok) throw new Error('Upload failed');

        const { filename } = await uploadRes.json();
        filenames.push(filename);
      }

      // Finalize — update metadata
      textEl.textContent = 'Finalizing...';
      fillEl.style.width = '95%';

      await fetch(`/api/albums/${slug}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filenames }),
      });

      fillEl.style.width = '100%';
      textEl.textContent = 'Upload complete!';
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      textEl.textContent = `Upload failed: ${err.message}`;
    }
  }

  // ─── Drag Reorder ──────────────────────────────────────

  function initDragReorder(grid, slug) {
    let dragItem = null;

    grid.addEventListener('dragstart', (e) => {
      dragItem = e.target.closest('.preview-item');
      if (!dragItem) return;
      dragItem.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    grid.addEventListener('dragover', (e) => {
      e.preventDefault();
      const target = e.target.closest('.preview-item');
      if (target && target !== dragItem) {
        target.classList.add('drag-over');
      }
    });

    grid.addEventListener('dragleave', (e) => {
      const target = e.target.closest('.preview-item');
      if (target) target.classList.remove('drag-over');
    });

    grid.addEventListener('drop', async (e) => {
      e.preventDefault();
      const target = e.target.closest('.preview-item');
      if (!target || target === dragItem) return;
      target.classList.remove('drag-over');

      // Reorder in DOM
      const items = [...grid.querySelectorAll('.preview-item')];
      const fromIndex = items.indexOf(dragItem);
      const toIndex = items.indexOf(target);
      if (fromIndex < toIndex) {
        target.after(dragItem);
      } else {
        target.before(dragItem);
      }

      // Save new order
      const newOrder = [...grid.querySelectorAll('.preview-item')]
        .map(el => el.dataset.filename);

      try {
        await fetch(`/api/albums/${slug}/reorder`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: newOrder }),
        });
      } catch {
        alert('Failed to save order');
      }
    });

    grid.addEventListener('dragend', () => {
      if (dragItem) dragItem.classList.remove('dragging');
      grid.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      dragItem = null;
    });
  }

  // ─── Helpers ───────────────────────────────────────────

  function redirectToLogin() {
    window.location.href = '/admin/login';
  }
})();
