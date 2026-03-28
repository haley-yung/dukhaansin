// Gallery — masonry grid + lightbox for public album pages

(function () {
  const slug = window.location.pathname.split('/album/')[1];
  if (!slug) return;

  const grid = document.getElementById('masonry-grid');
  const titleEl = document.getElementById('album-title');
  const descEl = document.getElementById('album-description');

  let photos = [];

  // Fetch album metadata
  fetch(`/api/albums/${encodeURIComponent(slug)}`)
    .then(r => r.json())
    .then(album => {
      document.title = `${album.title} — dukhaansin`;
      titleEl.textContent = album.title;
      descEl.textContent = album.description || '';
    })
    .catch(() => {
      titleEl.textContent = 'Album not found';
    });

  // Fetch photos and render
  fetch(`/api/albums/${encodeURIComponent(slug)}/photos`)
    .then(r => r.json())
    .then(data => {
      photos = data;
      if (!photos.length) {
        grid.innerHTML = '<p class="empty-state">No photos in this album yet.</p>';
        return;
      }
      renderMasonry(photos);
      initLightbox(photos);
    })
    .catch(() => {
      grid.innerHTML = '<p class="empty-state">Failed to load photos.</p>';
    });

  function renderMasonry(photos) {
    grid.innerHTML = photos.map((photo, i) => `
      <div class="masonry-item" data-index="${i}">
        <img src="${photo.src}" alt="${photo.filename}" loading="lazy">
      </div>
    `).join('');
  }

  function initLightbox(photos) {
    const lightbox = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    const counter = document.getElementById('lightbox-counter');
    const closeBtn = document.getElementById('lightbox-close');
    const prevBtn = document.getElementById('lightbox-prev');
    const nextBtn = document.getElementById('lightbox-next');
    let current = 0;

    function show(index) {
      current = index;
      img.src = photos[index].src;
      counter.textContent = `${index + 1} / ${photos.length}`;
      lightbox.classList.add('active');
      document.body.style.overflow = 'hidden';
    }

    function hide() {
      lightbox.classList.remove('active');
      document.body.style.overflow = '';
    }

    function prev() {
      show(current > 0 ? current - 1 : photos.length - 1);
    }

    function next() {
      show(current < photos.length - 1 ? current + 1 : 0);
    }

    grid.addEventListener('click', (e) => {
      const item = e.target.closest('.masonry-item');
      if (item) show(parseInt(item.dataset.index, 10));
    });

    closeBtn.addEventListener('click', hide);
    prevBtn.addEventListener('click', prev);
    nextBtn.addEventListener('click', next);

    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) hide();
    });

    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('active')) return;
      if (e.key === 'Escape') hide();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    });
  }
})();
