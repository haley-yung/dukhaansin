(function () {
  const slug = window.location.pathname.split('/album/')[1];
  if (!slug) return;

  const SUB_COLS = 18;
  const MARGIN = 6; // px on each side of grid items (must match CSS)

  const SPAN_MAP = { 0.5: 3, 0.67: 4, 1: 6, 1.33: 8, 1.5: 9, 2: 12, 3: 18 };
  function spanToSubcols(span) {
    return SPAN_MAP[span] || Math.round(span * 6);
  }

  const grid = document.getElementById('grid-gallery');
  const titleEl = document.getElementById('album-title');
  const descEl = document.getElementById('album-description');
  const metaEl = document.getElementById('album-meta');
  const encodedSlug = encodeURIComponent(slug);

  // Keep the originating element around so focus returns there on close
  let openerEl = null;
  let albumTitle = '';

  Promise.all([
    fetch(`/api/albums/${encodedSlug}`).then(r => r.json()),
    fetch(`/api/albums/${encodedSlug}/photos`).then(r => r.json()),
  ]).then(([album, photos]) => {
    albumTitle = album.title || '';
    document.title = `${albumTitle} \u2014 dukhaansin`;
    titleEl.textContent = albumTitle;
    descEl.textContent = album.description || '';
    if (metaEl) {
      metaEl.textContent = `${String(photos.length).padStart(2, '0')} \u00B7 ${photos.length === 1 ? 'Photograph' : 'Photographs'}`;
    }

    const gridSpans = album.gridSpans || {};

    if (!photos.length) {
      grid.innerHTML = '<p class="archive-empty">No photos in this album yet.</p>';
      grid.setAttribute('aria-busy', 'false');
      return;
    }

    // Each item is a real <button> for keyboard + screen-reader support.
    // --i staggers the fade-in (capped at 20 so later photos don't wait forever).
    grid.innerHTML = photos.map((p, i) => {
      const span = gridSpans[p.filename] || 1;
      const subcols = spanToSubcols(span);
      const cls = subcols !== 6 ? ` subcol-${subcols}` : '';
      const eager = i < 6;
      const loadAttr = eager ? 'eager' : 'lazy';
      const priority = eager ? ' fetchpriority="high"' : '';
      const alt = `${albumTitle} \u2014 photograph ${i + 1}`;
      return `<button class="grid-item${cls}" data-index="${i}" data-span="${span}" style="--i:${Math.min(i, 20)}" type="button" aria-label="Open photograph ${i + 1} of ${photos.length}"><img src="${p.src}" alt="${alt.replace(/"/g, '&quot;')}" loading="${loadAttr}" decoding="async"${priority}></button>`;
    }).join('');

    grid.setAttribute('aria-busy', 'false');

    grid.querySelectorAll('.grid-item').forEach(item => {
      const img = item.querySelector('img');
      const setRows = () => {
        const span = parseFloat(item.dataset.span) || 1;
        const subcols = spanToSubcols(span);
        const cellW = grid.clientWidth / SUB_COLS * subcols;
        const visibleW = cellW - MARGIN * 2;
        const desiredH = img.naturalHeight / img.naturalWidth * visibleW;
        const totalH = Math.ceil(desiredH + MARGIN * 2);
        item.style.gridRowEnd = `span ${Math.max(2, totalH)}`;
      };
      if (img.complete && img.naturalWidth) setRows();
      else img.addEventListener('load', setRows);
    });

    initLightbox(photos);
  }).catch(() => {
    titleEl.textContent = 'Album not found';
    grid.innerHTML = '<p class="archive-empty">Couldn&rsquo;t load photos. Refresh to try again.</p>';
    grid.setAttribute('aria-busy', 'false');
  });

  function initLightbox(photos) {
    const lightbox = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    const counter = document.getElementById('lightbox-counter');
    const closeBtn = document.getElementById('lightbox-close');
    const prevBtn = document.getElementById('lightbox-prev');
    const nextBtn = document.getElementById('lightbox-next');
    const focusables = [closeBtn, prevBtn, nextBtn];
    let current = 0;

    function show(i, opener) {
      current = i;
      const p = photos[i];
      img.src = p.src;
      img.alt = `${albumTitle} \u2014 photograph ${i + 1}`;
      counter.textContent = `${String(i + 1).padStart(2, '0')} / ${String(photos.length).padStart(2, '0')}`;
      lightbox.classList.add('active');
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      if (opener) openerEl = opener;
      // Move focus into the dialog for keyboard/SR users
      requestAnimationFrame(() => closeBtn.focus());
    }
    function hide() {
      lightbox.classList.remove('active');
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      // Return focus to where the user opened the lightbox
      if (openerEl && typeof openerEl.focus === 'function') {
        openerEl.focus();
      }
      openerEl = null;
    }
    function prev() { show(current > 0 ? current - 1 : photos.length - 1); }
    function next() { show(current < photos.length - 1 ? current + 1 : 0); }

    grid.addEventListener('click', e => {
      const item = e.target.closest('.grid-item');
      if (item) show(parseInt(item.dataset.index, 10), item);
    });

    closeBtn.addEventListener('click', hide);
    prevBtn.addEventListener('click', prev);
    nextBtn.addEventListener('click', next);
    // Click outside image (on backdrop) closes
    lightbox.addEventListener('click', e => { if (e.target === lightbox) hide(); });

    document.addEventListener('keydown', e => {
      if (!lightbox.classList.contains('active')) return;
      if (e.key === 'Escape') { e.preventDefault(); hide(); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); next(); return; }
      // Focus trap: cycle between close / prev / next
      if (e.key === 'Tab') {
        const idx = focusables.indexOf(document.activeElement);
        if (idx === -1) { focusables[0].focus(); e.preventDefault(); return; }
        const dir = e.shiftKey ? -1 : 1;
        const nextIdx = (idx + dir + focusables.length) % focusables.length;
        focusables[nextIdx].focus();
        e.preventDefault();
      }
    });
  }
})();
