(function () {
  const slug = window.location.pathname.split('/album/')[1];
  if (!slug) return;

  const ROW_H = 2;
  const GAP = 12;
  const SUB_COLS = 18;

  const SPAN_MAP = { 0.5: 3, 0.67: 4, 1: 6, 1.33: 8, 1.5: 9, 2: 12, 3: 18 };
  function spanToSubcols(span) {
    return SPAN_MAP[span] || Math.round(span * 6);
  }

  const grid = document.getElementById('grid-gallery');
  const titleEl = document.getElementById('album-title');
  const descEl = document.getElementById('album-description');
  const encodedSlug = encodeURIComponent(slug);

  Promise.all([
    fetch(`/api/albums/${encodedSlug}`).then(r => r.json()),
    fetch(`/api/albums/${encodedSlug}/photos`).then(r => r.json()),
  ]).then(([album, photos]) => {
    document.title = `${album.title} — dukhaansin`;
    titleEl.textContent = album.title;
    descEl.textContent = album.description || '';

    const gridSpans = album.gridSpans || {};

    if (!photos.length) {
      grid.innerHTML = '<p class="empty-state">No photos in this album yet.</p>';
      return;
    }

    grid.innerHTML = photos.map((p, i) => {
      const span = gridSpans[p.filename] || 1;
      const subcols = spanToSubcols(span);
      const cls = subcols !== 4 ? ` subcol-${subcols}` : '';
      const eager = i < 6;
      return `<div class="grid-item${cls}" data-index="${i}" data-span="${span}"><img src="${p.src}" alt="${p.filename}" ${eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy" decoding="async"'}></div>`;
    }).join('');

    grid.querySelectorAll('.grid-item').forEach(item => {
      const img = item.querySelector('img');
      const setRows = () => {
        const span = parseFloat(item.dataset.span) || 1;
        const subcols = spanToSubcols(span);
        const colW = (grid.clientWidth - GAP * (SUB_COLS - 1)) / SUB_COLS * subcols + GAP * (subcols - 1);
        const desiredH = img.naturalHeight / img.naturalWidth * colW;
        const rows = Math.ceil((desiredH + GAP) / (ROW_H + GAP));
        item.style.gridRowEnd = `span ${Math.max(2, rows)}`;
      };
      if (img.complete && img.naturalWidth) setRows();
      else img.addEventListener('load', setRows);
    });

    initLightbox(photos);
  }).catch(() => {
    titleEl.textContent = 'Album not found';
    grid.innerHTML = '<p class="empty-state">Failed to load photos.</p>';
  });

  function initLightbox(photos) {
    const lightbox = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    const counter = document.getElementById('lightbox-counter');
    let current = 0;

    function show(i) {
      current = i;
      img.src = photos[i].src;
      counter.textContent = `${i + 1} / ${photos.length}`;
      lightbox.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
    function hide() {
      lightbox.classList.remove('active');
      document.body.style.overflow = '';
    }
    function prev() { show(current > 0 ? current - 1 : photos.length - 1); }
    function next() { show(current < photos.length - 1 ? current + 1 : 0); }

    grid.addEventListener('click', e => {
      const item = e.target.closest('.grid-item');
      if (item) show(parseInt(item.dataset.index, 10));
    });

    document.getElementById('lightbox-close').addEventListener('click', hide);
    document.getElementById('lightbox-prev').addEventListener('click', prev);
    document.getElementById('lightbox-next').addEventListener('click', next);
    lightbox.addEventListener('click', e => { if (e.target === lightbox) hide(); });

    document.addEventListener('keydown', e => {
      if (!lightbox.classList.contains('active')) return;
      if (e.key === 'Escape') hide();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    });
  }
})();
