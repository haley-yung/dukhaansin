(function () {
  const slug = window.location.pathname.split('/album/')[1];
  if (!slug) return;

  const grid = document.getElementById('masonry-grid');
  const titleEl = document.getElementById('album-title');
  const descEl = document.getElementById('album-description');
  const encodedSlug = encodeURIComponent(slug);

  // Fetch album metadata and photos in parallel
  Promise.all([
    fetch(`/api/albums/${encodedSlug}`).then(r => r.json()),
    fetch(`/api/albums/${encodedSlug}/photos`).then(r => r.json()),
  ]).then(([album, photos]) => {
    document.title = `${album.title} — dukhaansin`;
    titleEl.textContent = album.title;
    descEl.textContent = album.description || '';

    if (!photos.length) {
      grid.innerHTML = '<p class="empty-state">No photos in this album yet.</p>';
      return;
    }

    grid.innerHTML = photos.map((p, i) =>
      `<div class="masonry-item" data-index="${i}"><img src="${p.src}" alt="${p.filename}" loading="lazy"></div>`
    ).join('');

    // Detect landscape images and add class for wider grid span
    grid.querySelectorAll('.masonry-item img').forEach(img => {
      img.addEventListener('load', () => {
        if (img.naturalWidth > img.naturalHeight) {
          img.closest('.masonry-item').classList.add('landscape');
        }
      });
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
      const item = e.target.closest('.masonry-item');
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
