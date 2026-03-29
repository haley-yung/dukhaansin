(async function () {
  const authRes = await fetch('/api/me');
  if (!authRes.ok) return redirectToLogin();

  const page = detectPage();
  if (page === 'dashboard') initDashboard();
  if (page === 'album') initAlbumPage();

  function detectPage() {
    if (document.getElementById('album-list')) return 'dashboard';
    if (document.getElementById('preview-grid')) return 'album';
    return null;
  }

  // ── Dashboard ─────────────────────────────────────────

  function initDashboard() {
    loadAlbums();
    loadStorageUsage();
    initLogout();
    initCreateAlbumForm();
  }

  async function loadAlbums() {
    try {
      const res = await fetch('/api/albums');
      if (res.status === 401) return redirectToLogin();
      const albums = await res.json();

      document.getElementById('stat-albums').textContent = albums.length;
      document.getElementById('stat-photos').textContent = albums.reduce((s, a) => s + a.photoCount, 0);

      const list = document.getElementById('album-list');
      if (!albums.length) {
        list.innerHTML = '<p class="empty-state">No albums yet. Create one above.</p>';
        return;
      }

      list.innerHTML = albums.map(a => `
        <div class="album-row" data-slug="${a.slug}">
          <div class="album-row-thumb">
            ${a.coverUrl ? `<img src="${a.coverUrl}" alt="${a.title}">` : '<div class="album-card-placeholder"></div>'}
          </div>
          <div class="album-row-info">
            <strong>${a.title}</strong>
            <span>${a.photoCount} photo${a.photoCount !== 1 ? 's' : ''}</span>
          </div>
          <div class="album-row-actions">
            <a href="/admin/album/${a.slug}" class="btn btn-outline btn-small">Manage</a>
            <button class="btn btn-danger btn-small delete-album-btn" data-slug="${a.slug}" data-title="${a.title}">Delete</button>
          </div>
        </div>
      `).join('');

      initDeleteAlbumButtons();
    } catch {
      document.getElementById('album-list').innerHTML = '<p class="empty-state">Failed to load albums.</p>';
    }
  }

  async function loadStorageUsage() {
    try {
      const res = await fetch('/api/storage');
      if (!res.ok) return;
      const { totalBytes, percentage } = await res.json();

      const mb = (totalBytes / (1024 * 1024)).toFixed(1);
      const gb = (totalBytes / (1024 * 1024 * 1024)).toFixed(2);
      const display = totalBytes >= 1024 * 1024 * 1024 ? `${gb} GB` : `${mb} MB`;

      document.getElementById('stat-storage').textContent = `${percentage}%`;
      document.getElementById('storage-bar-fill').style.width = `${Math.min(percentage, 100)}%`;

      const label = document.querySelector('#stats-row .stat-card:last-child .stat-label');
      if (label) label.textContent = `${display} / 10 GB`;
    } catch {}
  }

  function initCreateAlbumForm() {
    const form = document.getElementById('create-album-form');
    if (!form) return;
    form.addEventListener('submit', async e => {
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
      } catch { alert('Network error'); }
    });
  }

  function initDeleteAlbumButtons() {
    document.querySelectorAll('.delete-album-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm(`Delete album "${btn.dataset.title}"? This cannot be undone.`)) return;
        try {
          const res = await fetch(`/api/albums/${btn.dataset.slug}`, { method: 'DELETE' });
          if (res.status === 401) return redirectToLogin();
          if (res.ok) btn.closest('.album-row').remove();
          else alert('Failed to delete album');
        } catch { alert('Network error'); }
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

  // ── Album Management ──────────────────────────────────

  const ROW_H = 2;
  const GAP = 12;
  const SUB_COLS = 18;
  const VALID_SPANS = [0.5, 0.67, 1, 1.33, 1.5, 2, 3];
  let currentGridSpans = {};

  const SPAN_MAP = { 0.5: 3, 0.67: 4, 1: 6, 1.33: 8, 1.5: 9, 2: 12, 3: 18 };
  const SUBCOL_MAP = { 3: 0.5, 4: 0.67, 6: 1, 8: 1.33, 9: 1.5, 12: 2, 18: 3 };

  function spanToSubcols(span) {
    return SPAN_MAP[span] || Math.round(span * 6);
  }

  function subcolsToSpan(subcols) {
    return SUBCOL_MAP[subcols] || subcols / 6;
  }

  function getSpanLabel(span) {
    if (span === 0.5) return '½';
    if (span === 0.67) return '⅔';
    if (span === 1) return '1';
    if (span === 1.33) return '1⅓';
    if (span === 1.5) return '1½';
    if (span === 2) return '2';
    if (span === 3) return '3';
    return `${span}`;
  }

  function nextSpan(current, direction) {
    const idx = VALID_SPANS.indexOf(current);
    if (idx === -1) {
      // Snap to nearest valid span in the given direction
      if (direction > 0) {
        for (let i = 0; i < VALID_SPANS.length; i++) {
          if (VALID_SPANS[i] >= current) return VALID_SPANS[i];
        }
        return VALID_SPANS[VALID_SPANS.length - 1];
      } else {
        for (let i = VALID_SPANS.length - 1; i >= 0; i--) {
          if (VALID_SPANS[i] <= current) return VALID_SPANS[i];
        }
        return VALID_SPANS[0];
      }
    }
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= VALID_SPANS.length) return current;
    return VALID_SPANS[newIdx];
  }

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
      const [albumRes, photosRes] = await Promise.all([
        fetch(`/api/albums/${slug}`),
        fetch(`/api/albums/${slug}/photos`),
      ]);
      if (albumRes.status === 401) return redirectToLogin();

      const album = await albumRes.json();
      const photos = await photosRes.json();

      currentGridSpans = album.gridSpans || {};

      document.getElementById('page-title').textContent = album.title;
      document.getElementById('edit-title').value = album.title;
      document.getElementById('edit-desc').value = album.description || '';
      document.getElementById('photo-count').textContent = `(${photos.length})`;
      renderPreviewGrid(photos, slug);
    } catch {
      document.getElementById('preview-grid').innerHTML = '<p class="empty-state">Failed to load album.</p>';
    }
  }

  function applyRowSpan(item, grid) {
    const img = item.querySelector('img');
    const doApply = () => {
      const span = parseFloat(item.dataset.span) || 1;
      const subcols = spanToSubcols(span);
      const colW = (grid.clientWidth - GAP * (SUB_COLS - 1)) / SUB_COLS * subcols + GAP * (subcols - 1);
      const desiredH = img.naturalHeight / img.naturalWidth * colW;
      const rows = Math.ceil((desiredH + GAP) / (ROW_H + GAP));
      item.style.gridRowEnd = `span ${Math.max(2, rows)}`;
    };
    if (img.complete && img.naturalWidth) doApply();
    else img.addEventListener('load', doApply);
  }

  function updateItemSpan(item, newSpan, grid, slug) {
    const subcols = spanToSubcols(newSpan);
    item.dataset.span = newSpan;

    // Remove old subcol classes, add new one
    item.className = item.className.replace(/\bsubcol-\d+\b/g, '').trim();
    if (subcols !== 4) item.classList.add(`subcol-${subcols}`);

    // Update label
    const label = item.querySelector('.span-label');
    if (label) label.textContent = getSpanLabel(newSpan);

    // Update +/- button states
    const minusBtn = item.querySelector('.size-minus');
    const plusBtn = item.querySelector('.size-plus');
    if (minusBtn) minusBtn.disabled = (newSpan <= VALID_SPANS[0]);
    if (plusBtn) plusBtn.disabled = (newSpan >= VALID_SPANS[VALID_SPANS.length - 1]);

    applyRowSpan(item, grid);

    // Update local state
    const filename = item.dataset.filename;
    if (newSpan === 1) delete currentGridSpans[filename];
    else currentGridSpans[filename] = newSpan;

    // Save
    const newOrder = [...grid.querySelectorAll('.preview-item')].map(el => el.dataset.filename);
    fetch(`/api/albums/${slug}/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: newOrder, gridSpans: currentGridSpans }),
    }).catch(() => alert('Failed to save size'));
  }

  function renderPreviewGrid(photos, slug) {
    const grid = document.getElementById('preview-grid');
    if (!photos.length) {
      grid.innerHTML = '<p class="empty-state">No photos yet. Upload some above.</p>';
      return;
    }

    grid.innerHTML = photos.map(p => {
      const span = currentGridSpans[p.filename] || 1;
      const subcols = spanToSubcols(span);
      const cls = subcols !== 4 ? ` subcol-${subcols}` : '';
      const atMin = span <= VALID_SPANS[0];
      const atMax = span >= VALID_SPANS[VALID_SPANS.length - 1];

      return `
      <div class="preview-item${cls}" draggable="true" data-filename="${p.filename}" data-span="${span}">
        <img src="${p.src}" alt="${p.filename}" loading="lazy">
        <div class="preview-actions">
          <button class="preview-action-btn set-cover-btn ${p.isCover ? 'active' : ''}"
                  data-filename="${p.filename}" title="Set as cover">
            ${p.isCover ? '&#9733;' : '&#9734;'}
          </button>
          <button class="preview-action-btn delete-photo-btn"
                  data-filename="${p.filename}" title="Delete photo">&#10005;</button>
        </div>
        <div class="resize-handle" title="Drag to resize"></div>
        <div class="span-label">${getSpanLabel(span)}</div>
        <div class="size-controls">
          <button class="size-btn size-minus" title="Shrink"${atMin ? ' disabled' : ''}>−</button>
          <button class="size-btn size-plus" title="Enlarge"${atMax ? ' disabled' : ''}>+</button>
        </div>
      </div>`;
    }).join('');

    grid.querySelectorAll('.preview-item').forEach(item => applyRowSpan(item, grid));

    initPreviewActions(slug);
    initSizeButtons(grid, slug);
    initDragResize(grid, slug);
    initDragReorder(grid, slug);
  }

  // ── Size +/- Buttons ──────────────────────────────────

  function initSizeButtons(grid, slug) {
    grid.addEventListener('click', e => {
      const btn = e.target.closest('.size-btn');
      if (!btn) return;
      e.stopPropagation();

      const item = btn.closest('.preview-item');
      const currentSpan = parseFloat(item.dataset.span) || 1;
      const direction = btn.classList.contains('size-plus') ? 1 : -1;
      const newSpan = nextSpan(currentSpan, direction);

      if (newSpan !== currentSpan) {
        updateItemSpan(item, newSpan, grid, slug);
      }
    });
  }

  // ── Drag-to-Resize ─────────────────────────────────────

  function initDragResize(grid, slug) {
    let resizingItem = null;
    let startX = 0;
    let startSpan = 1;

    grid.addEventListener('mousedown', e => {
      const handle = e.target.closest('.resize-handle');
      if (!handle) return;
      e.preventDefault();
      e.stopPropagation();

      resizingItem = handle.closest('.preview-item');
      resizingItem.classList.add('resizing');
      resizingItem.setAttribute('draggable', 'false');
      startX = e.clientX;
      startSpan = parseFloat(resizingItem.dataset.span) || 1;

      document.addEventListener('mousemove', onResizeMove);
      document.addEventListener('mouseup', onResizeEnd);
    });

    function onResizeMove(e) {
      if (!resizingItem) return;
      const subcolWidth = (grid.clientWidth - GAP * (SUB_COLS - 1)) / SUB_COLS;
      const dx = e.clientX - startX;
      const subcolsDelta = Math.round(dx / subcolWidth);
      const startSubcols = spanToSubcols(startSpan);
      const rawSubcols = Math.max(1, Math.min(SUB_COLS, startSubcols + subcolsDelta));

      // Snap to nearest valid span
      const rawSpan = subcolsToSpan(rawSubcols);
      let bestSpan = VALID_SPANS[0];
      let bestDist = Math.abs(rawSpan - bestSpan);
      for (const vs of VALID_SPANS) {
        const dist = Math.abs(rawSpan - vs);
        if (dist < bestDist) { bestDist = dist; bestSpan = vs; }
      }

      const currentSpan = parseFloat(resizingItem.dataset.span) || 1;
      if (bestSpan !== currentSpan) {
        const subcols = spanToSubcols(bestSpan);
        resizingItem.dataset.span = bestSpan;
        resizingItem.className = resizingItem.className.replace(/\bsubcol-\d+\b/g, '').trim();
        if (subcols !== 4) resizingItem.classList.add(`subcol-${subcols}`);
        resizingItem.classList.add('resizing');

        const label = resizingItem.querySelector('.span-label');
        if (label) label.textContent = getSpanLabel(bestSpan);

        const minusBtn = resizingItem.querySelector('.size-minus');
        const plusBtn = resizingItem.querySelector('.size-plus');
        if (minusBtn) minusBtn.disabled = (bestSpan <= VALID_SPANS[0]);
        if (plusBtn) plusBtn.disabled = (bestSpan >= VALID_SPANS[VALID_SPANS.length - 1]);

        applyRowSpan(resizingItem, grid);
      }
    }

    function onResizeEnd() {
      if (!resizingItem) return;
      document.removeEventListener('mousemove', onResizeMove);
      document.removeEventListener('mouseup', onResizeEnd);

      resizingItem.classList.remove('resizing');
      resizingItem.setAttribute('draggable', 'true');

      const filename = resizingItem.dataset.filename;
      const newSpan = parseFloat(resizingItem.dataset.span) || 1;

      if (newSpan === 1) delete currentGridSpans[filename];
      else currentGridSpans[filename] = newSpan;

      resizingItem = null;

      const newOrder = [...grid.querySelectorAll('.preview-item')].map(el => el.dataset.filename);
      fetch(`/api/albums/${slug}/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: newOrder, gridSpans: currentGridSpans }),
      }).catch(() => alert('Failed to save size'));
    }
  }

  function initPreviewActions(slug) {
    document.querySelectorAll('.set-cover-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          const res = await fetch(`/api/albums/${slug}/cover`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cover: btn.dataset.filename }),
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
        } catch { alert('Failed to set cover'); }
      });
    });

    document.querySelectorAll('.delete-photo-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this photo?')) return;
        try {
          const res = await fetch(`/api/albums/${slug}/photos/${btn.dataset.filename}`, { method: 'DELETE' });
          if (res.status === 401) return redirectToLogin();
          if (res.ok) {
            const filename = btn.dataset.filename;
            btn.closest('.preview-item').remove();
            delete currentGridSpans[filename];
            const countEl = document.getElementById('photo-count');
            const current = parseInt(countEl.textContent.replace(/\D/g, ''), 10) || 0;
            countEl.textContent = `(${current - 1})`;
          }
        } catch { alert('Failed to delete photo'); }
      });
    });
  }

  function initSettingsForm(slug) {
    const form = document.getElementById('settings-form');
    if (!form) return;
    form.addEventListener('submit', async e => {
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
      } catch { alert('Failed to save settings'); }
    });
  }

  // ── Upload ─────────────────────────────────────────────

  function initUploadZone(slug) {
    const zone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    if (!zone || !fileInput) return;

    zone.addEventListener('click', () => fileInput.click());
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', e => {
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
      textEl.textContent = 'Preparing upload...';
      const presignRes = await fetch(`/api/albums/${slug}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: files.map(f => ({ name: f.name || 'image.jpg', contentType: f.type || 'image/jpeg' })),
        }),
      });
      if (presignRes.status === 401) return redirectToLogin();
      if (!presignRes.ok) throw new Error('Failed to get upload URLs');

      const { uploads } = await presignRes.json();
      const filenames = [];

      for (let i = 0; i < files.length; i++) {
        textEl.textContent = `Uploading ${i + 1} of ${files.length}...`;
        fillEl.style.width = `${(i / files.length) * 90}%`;

        const putRes = await fetch(uploads[i].uploadUrl, {
          method: 'PUT',
          body: files[i],
          headers: { 'Content-Type': files[i].type || 'image/jpeg' },
        });
        if (!putRes.ok) throw new Error(`Upload failed for file ${i + 1}`);
        filenames.push(uploads[i].filename);
      }

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

  // ── Drag Reorder ──────────────────────────────────────

  function initDragReorder(grid, slug) {
    let dragItem = null;

    grid.addEventListener('dragstart', e => {
      dragItem = e.target.closest('.preview-item');
      if (dragItem) {
        dragItem.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      }
    });

    grid.addEventListener('dragover', e => {
      e.preventDefault();
      const target = e.target.closest('.preview-item');
      if (target && target !== dragItem) target.classList.add('drag-over');
    });

    grid.addEventListener('dragleave', e => {
      const target = e.target.closest('.preview-item');
      if (target) target.classList.remove('drag-over');
    });

    grid.addEventListener('drop', async e => {
      e.preventDefault();
      const target = e.target.closest('.preview-item');
      if (!target || target === dragItem) return;
      target.classList.remove('drag-over');

      const items = [...grid.querySelectorAll('.preview-item')];
      const fromIdx = items.indexOf(dragItem);
      const toIdx = items.indexOf(target);
      if (fromIdx < toIdx) target.after(dragItem);
      else target.before(dragItem);

      const newOrder = [...grid.querySelectorAll('.preview-item')].map(el => el.dataset.filename);
      try {
        await fetch(`/api/albums/${slug}/reorder`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: newOrder, gridSpans: currentGridSpans }),
        });
      } catch { alert('Failed to save order'); }
    });

    grid.addEventListener('dragend', () => {
      if (dragItem) dragItem.classList.remove('dragging');
      grid.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      dragItem = null;
    });
  }

  function redirectToLogin() {
    window.location.href = '/admin/login';
  }
})();
