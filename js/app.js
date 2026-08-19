/**
 * LuminaVault Application Controller
 * Handles rendering for Books, Book Viewer, Podcasts Hub, Modular Podcast Landing Pages,
 * theme toggling, search, jump select, and interactive toasts.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Application State
  const state = {
    books: window.BookStore.getAllBooks(),
    podcasts: window.BookStore.getAllPodcasts(),
    currentBook: null,
    currentPodcast: null,
    currentLightboxIndex: 0,
    searchQuery: '',
    selectedGenre: 'ALL',
    viewMode: 'grid'
  };

  // DOM Elements
  const mainContent = document.getElementById('main-content');
  const jumpSelect = document.getElementById('jump-to-book-select');
  const themeToggleBtn = document.getElementById('theme-toggle');
  const navIndexBtn = document.getElementById('nav-index-btn');
  const navPodcastsBtn = document.getElementById('nav-podcasts-btn');

  const lightboxModal = document.getElementById('lightbox-modal');
  const lightboxStage = document.getElementById('lightbox-stage');
  const lightboxPageTitle = document.getElementById('lightbox-page-title');
  const lightboxFilename = document.getElementById('lightbox-filename');
  const lightboxCounter = document.getElementById('lightbox-counter');
  const lightboxPrevBtn = document.getElementById('lightbox-prev-btn');
  const lightboxNextBtn = document.getElementById('lightbox-next-btn');
  const lightboxCloseBtn = document.getElementById('lightbox-close-btn');

  const toastElement = document.getElementById('toast-notification');

  // Initialize UI controls & router
  initJumpSelector();
  initThemeToggle();
  initLightboxListeners();
  initS3ConfigModal();
  initRouter();

  /**
   * Populate Jump to Book selector
   */
  function initJumpSelector() {
    jumpSelect.innerHTML = '<option value="">Jump to Book...</option>';
    state.books.forEach(book => {
      const opt = document.createElement('option');
      opt.value = book.id;
      if (book.isMissing) {
        opt.textContent = `${book.title} (Needs Google Drive Share)`;
        opt.disabled = true;
      } else {
        opt.textContent = `${book.title} (${book.genre})`;
      }
      jumpSelect.appendChild(opt);
    });

    jumpSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val) {
        const book = window.BookStore.getBookById(val);
        if (book && book.isMissing) {
          showToast(`Book ${book.id} needs to be shared to Google Drive folder.`);
          jumpSelect.value = '';
          return;
        }
        window.Router.navigate(`/book/${val}`);
        jumpSelect.value = '';
      }
    });
  }

  /**
   * Theme Toggler
   */
  function initThemeToggle() {
    const savedTheme = localStorage.getItem('lumina_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    themeToggleBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('lumina_theme', newTheme);
    });
  }

  /**
   * Scroll Reveal Animation Observer
   */
  function initScrollObserver() {
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px 40px 0px' });

    document.querySelectorAll('.book-card, .page-card, .podcast-hub-card, .episode-card').forEach((el, idx) => {
      el.classList.add('reveal-on-scroll');
      el.style.animationDelay = `${(idx % 12) * 0.04}s`;
      observer.observe(el);
    });
  }

  /**
   * Show toast feedback
   */
  function showToast(msg) {
    if (!toastElement) return;
    toastElement.textContent = msg;
    toastElement.classList.add('show');
    setTimeout(() => {
      toastElement.classList.remove('show');
    }, 2800);
  }

  /**
   * SPA Route Registration
   */
  function initRouter() {
    // Route 1: Library Index Page (Books)
    window.Router.register('/', () => {
      document.title = 'Drawbook | Digital Sketchbook Gallery';
      state.currentBook = null;
      state.currentPodcast = null;
      updateActiveNav('books');
      renderLibraryIndex();
    });

    // Route 2: Book Viewer Component
    window.Router.register('/book/:id', (bookId) => {
      const book = window.BookStore.getBookById(bookId);
      if (!book || book.isMissing) {
        if (book && book.isMissing) {
          showToast(`Book ${book.id} is missing. Needs to be shared to Google Drive folder.`);
        }
        window.Router.navigate('/');
        return;
      }
      state.currentBook = book;
      state.currentPodcast = null;
      updateActiveNav('books');
      document.title = `${book.title} - Drawbook`;
      renderBookViewer(book);
    });

    // Route 3: Podcasts Mainpage Hub
    window.Router.register('/podcasts', () => {
      document.title = 'Drawbook | Audio Podcasts';
      state.currentBook = null;
      state.currentPodcast = null;
      updateActiveNav('podcasts');
      renderPodcastsHub();
    });

    // Route 4: Modular Podcast Landing Page Template
    window.Router.register('/podcast/:id', (param) => {
      let podcast = window.BookStore.getPodcastById(param);
      if (!podcast) {
        podcast = window.BookStore.getPodcastBySlug(param);
      }
      if (!podcast) {
        window.Router.navigate('/podcasts');
        return;
      }
      state.currentPodcast = podcast;
      state.currentBook = null;
      updateActiveNav('podcasts');
      document.title = `${podcast.podcastName} - Podcast Series`;
      renderPodcastLandingPage(podcast);
    });

    window.Router.init();
  }

  function updateActiveNav(type) {
    if (type === 'books') {
      navIndexBtn.classList.add('active');
      navPodcastsBtn.classList.remove('active');
    } else {
      navPodcastsBtn.classList.add('active');
      navIndexBtn.classList.remove('active');
    }
  }

  // =========================================================================
  // RENDERERS: BOOKS
  // =========================================================================

  function renderLibraryIndex() {
    const filteredBooks = state.books.filter(book => {
      const matchesSearch = book.title.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
                            book.genre.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
                            `book-${book.id}`.includes(state.searchQuery.toLowerCase());
      const matchesGenre = state.selectedGenre === 'ALL' || book.genre === state.selectedGenre;
      return matchesSearch && matchesGenre;
    });

    const totalBooksCount = state.books.length;

    mainContent.innerHTML = `
      <section class="library-hero">
        <h1 class="library-title">Digital Book & Photo Gallery</h1>
        <p class="library-subtitle">Browse all ${totalBooksCount} high-resolution sequential art books, sketchbooks, and codex volumes.</p>
      </section>

      <div class="toolbar-container">
        <div class="search-input-wrapper">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input type="text" id="library-search" class="search-input" placeholder="Search book 1-${totalBooksCount}, genre..." value="${escapeHtml(state.searchQuery)}" aria-label="Search books">
        </div>

        <div class="filter-group">
          <button class="filter-chip ${state.selectedGenre === 'ALL' ? 'active' : ''}" data-genre="ALL">All (${totalBooksCount})</button>
          <button class="filter-chip ${state.selectedGenre === 'Concept Art' ? 'active' : ''}" data-genre="Concept Art">Concept Art</button>
          <button class="filter-chip ${state.selectedGenre === 'Sketchbook' ? 'active' : ''}" data-genre="Sketchbook">Sketchbook</button>
          <button class="filter-chip ${state.selectedGenre === 'Graphic Novel' ? 'active' : ''}" data-genre="Graphic Novel">Graphic Novel</button>
        </div>
      </div>

      <div class="books-grid">
        ${filteredBooks.map(book => {
          if (book.isMissing) {
            return `
              <div class="book-card missing-book-card" data-missing-id="${book.id}" tabindex="0" role="button" aria-label="${book.title} - Needs to be shared to Google Drive folder">
                <div class="book-cover-wrap">
                  ${window.PageRenderer.createBookCoverSvg(book)}
                  <span class="book-card-badge missing-badge">Missing</span>
                </div>
                <div class="book-card-info">
                  <h2 class="book-card-title">${book.title}</h2>
                  <div class="book-card-meta missing-meta">
                    <span class="drive-notice-text">Needs Google Drive Share</span>
                  </div>
                </div>
              </div>
            `;
          }
          return `
            <a href="#/book/${book.id}" class="book-card" aria-label="Open ${book.title}">
              <div class="book-cover-wrap">
                ${window.PageRenderer.createBookCoverSvg(book)}
                <span class="book-card-badge">Book #${book.id}</span>
              </div>
              <div class="book-card-info">
                <h2 class="book-card-title">${book.title}</h2>
                <div class="book-card-meta">
                  <span>${book.genre}</span>
                  <span>${book.pageCount} Pages</span>
                </div>
              </div>
            </a>
          `;
        }).join('')}
      </div>
    `;

    const missingCards = document.querySelectorAll('.missing-book-card');
    missingCards.forEach(card => {
      const handleMissingClick = () => {
        const id = card.getAttribute('data-missing-id');
        showToast(`Book ${id} is missing. It needs to be shared to the Google Drive folder.`);
      };
      card.addEventListener('click', handleMissingClick);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleMissingClick();
        }
      });
    });

    const searchInput = document.getElementById('library-search');
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      renderLibraryIndex();
      const newInput = document.getElementById('library-search');
      newInput.focus();
      newInput.setSelectionRange(newInput.value.length, newInput.value.length);
    });

    const filterChips = document.querySelectorAll('.filter-chip');
    filterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        state.selectedGenre = chip.getAttribute('data-genre');
        renderLibraryIndex();
      });
    });

    initScrollObserver();
  }

  function renderBookViewer(book) {
    const { prevId, nextId } = window.BookStore.getAdjacentBookIds(book.id);

    const renderNavBarMarkup = (position) => `
      <nav class="book-nav-bar" aria-label="Book navigation ${position}">
        ${prevId ? `
          <a href="#/book/${prevId}" class="book-nav-btn" aria-label="Go to Book ${prevId}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
            <span>Previous Book</span>
          </a>
        ` : `
          <button class="book-nav-btn disabled" aria-disabled="true" disabled>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
            <span>Previous Book</span>
          </button>
        `}

        <div class="book-nav-center">
          <h1 class="book-header-title">book ${book.id}</h1>
          <span class="book-header-subtitle">${book.genre} • ${book.pageCount} High-Res Pages</span>
        </div>

        ${nextId ? `
          <a href="#/book/${nextId}" class="book-nav-btn" aria-label="Go to Book ${nextId}">
            <span>Next Book</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
          </a>
        ` : `
          <button class="book-nav-btn disabled" aria-disabled="true" disabled>
            <span>Next Book</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        `}
      </nav>
    `;

    mainContent.innerHTML = `
      <div class="book-viewer-container">
        ${renderNavBarMarkup('top')}

        <div class="viewer-toolbar">
          <div>
            <strong>Showing pages:</strong> 
            <code>${book.pages[0].rawName}</code> — <code>${book.pages[book.pages.length - 1].rawName}</code>
          </div>
          <div class="view-mode-toggle">
            <button class="view-mode-btn ${state.viewMode === 'grid' ? 'active' : ''}" id="mode-grid-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              Grid View (4 / 2 Col)
            </button>
            <button class="view-mode-btn ${state.viewMode === 'single' ? 'active' : ''}" id="mode-single-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="3" width="14" height="18" rx="2"/></svg>
              Single Column
            </button>
          </div>
        </div>

        <div class="gallery-grid ${state.viewMode === 'single' ? 'mode-single' : ''}" id="gallery-grid">
          ${book.pages.map((page, index) => `
            <div class="page-card" data-page-index="${index}" tabindex="0" role="button" aria-label="Open full resolution preview for ${page.filename}">
              <div class="page-placeholder-box" style="aspect-ratio: 3 / 4;">
                ${window.PageRenderer.createPageSvg(book, page)}
                <span class="page-filename-tag">${page.filename}</span>
                <div class="page-fullres-overlay">
                  <div class="zoom-icon-badge">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/><path d="M11 8v6M8 11h6"/>
                    </svg>
                  </div>
                </div>
              </div>
              <div class="page-card-footer">
                <span class="page-label">Page ${page.index}</span>
                <span class="page-res-badge">FULL-RES</span>
              </div>
            </div>
          `).join('')}
        </div>

        ${renderNavBarMarkup('bottom')}
      </div>
    `;

    const gridBtn = document.getElementById('mode-grid-btn');
    const singleBtn = document.getElementById('mode-single-btn');
    const galleryGrid = document.getElementById('gallery-grid');

    gridBtn.addEventListener('click', () => {
      state.viewMode = 'grid';
      gridBtn.classList.add('active');
      singleBtn.classList.remove('active');
      galleryGrid.classList.remove('mode-single');
    });

    singleBtn.addEventListener('click', () => {
      state.viewMode = 'single';
      singleBtn.classList.add('active');
      gridBtn.classList.remove('active');
      galleryGrid.classList.add('mode-single');
    });

    const pageCards = document.querySelectorAll('.page-card');
    pageCards.forEach(card => {
      const openPage = () => {
        const idx = parseInt(card.getAttribute('data-page-index'), 10);
        openLightbox(idx);
      };
      card.addEventListener('click', openPage);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openPage();
        }
      });
    });

    initScrollObserver();
  }

  // =========================================================================
  // RENDERERS: PODCASTS MAINPAGE HUB
  // =========================================================================

  function renderPodcastsHub() {
    mainContent.innerHTML = `
      <div class="podcasts-hub-container">
        <section class="library-hero">
          <h1 class="library-title">Drawbook Podcast Series</h1>
          <p class="library-subtitle">Explore 4 original audio series hosted by Sean Penalber.</p>
        </section>

        <div class="podcasts-grid">
          ${state.podcasts.map(podcast => `
            <a href="#/podcast/${podcast.id}" class="podcast-hub-card" aria-label="Open ${podcast.podcastName}">
              <div class="podcast-hub-cover">
                ${window.PageRenderer.createPodcastCoverSvg(podcast)}
              </div>
              <div class="podcast-hub-body">
                <h2 class="podcast-hub-title">${podcast.podcastName}</h2>
                <div class="podcast-hub-host">Hosted by ${podcast.hostName}</div>
                <p class="podcast-hub-desc">${podcast.description}</p>
                <div class="podcast-hub-footer">
                  <span>${podcast.episodes.length} Episodes</span>
                  <span class="podcast-hub-btn">
                    Listen Now
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </span>
                </div>
              </div>
            </a>
          `).join('')}
        </div>
      </div>
    `;
    initScrollObserver();
  }

  // =========================================================================
  // MODULAR PODCAST LANDING PAGE TEMPLATE
  // Reads podcast configuration object dynamically.
  // Host: Sean Penalber. Episodes: Clean title and audio player without episode numbers/descriptions.
  // =========================================================================

  function renderPodcastLandingPage(data) {
    mainContent.innerHTML = `
      <div class="podcast-landing-layout">
        
        <!-- Column 1 (Sidebar / Vibe) -->
        <aside class="podcast-sidebar">
          <!-- Cover Art Image / SVG -->
          <div class="podcast-cover-container">
            ${window.PageRenderer.createPodcastCoverSvg(data)}
          </div>

          <!-- Podcast Metadata -->
          <div class="podcast-sidebar-info">
            <h2 class="podcast-sidebar-title">${escapeHtml(data.podcastName)}</h2>
            <div class="podcast-host-byline">
              <span>Hosted by ${escapeHtml(data.hostName)}</span>
              ${data.socialLink ? `
                <a href="${escapeHtml(data.socialLink)}" target="_blank" rel="noopener" class="podcast-social-link" title="Host Social Profile">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
              ` : ''}
            </div>
            <p class="podcast-description">${escapeHtml(data.description)}</p>
          </div>

          <!-- Prominent Listen on Spotify Button -->
          ${data.spotifyDirectLink ? `
            <a href="${escapeHtml(data.spotifyDirectLink)}" target="_blank" rel="noopener" class="spotify-btn">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.12-.779-.18-.899-.54-.12-.42.18-.78.54-.9 4.56-1.02 8.52-.6 11.64 1.32.42.18.479.78.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.18-.1.2-.78-.42-.18-.6.2-1.2.78-1.38 4.26-1.26 11.28-1.02 15.72 1.62.54.3.72 1.02.42 1.56-.3.42-1.02.6-1.5.3z"/>
              </svg>
              <span>Listen on Spotify</span>
            </a>
          ` : ''}

          <!-- Stream Us Section -->
          <div class="podcast-sidebar-section">
            <h3 class="sidebar-section-title">Stream Us</h3>
            <ul class="stream-links-list">
              ${data.streamLinks.map(stream => `
                <li class="stream-link-item">
                  <a href="${escapeHtml(stream.url)}" target="_blank" rel="noopener">
                    <span>${escapeHtml(stream.platform)}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
                  </a>
                </li>
              `).join('')}
            </ul>
          </div>

          <!-- Support Us Section -->
          <div class="podcast-sidebar-section">
            <h3 class="sidebar-section-title">Support Us</h3>
            <div class="support-logos-grid">
              ${data.supportLinks.map(support => `
                <a href="${escapeHtml(support.url)}" target="_blank" rel="noopener" class="support-logo-card" style="background-color: ${support.color || '#1e293b'};">
                  ${window.PageRenderer.getSupportLogoSvg(support.logo || support.platform)}
                  <span>${escapeHtml(support.platform)}</span>
                </a>
              `).join('')}
            </div>
          </div>
        </aside>

        <!-- Column 2 (The Feed / Episodes) -->
        <section class="podcast-feed-column">
          <div class="feed-header">
            <h2 class="feed-title">Episodes</h2>
            <span class="feed-count">${data.episodes.length} Episodes</span>
          </div>

          <!-- Vertical Feed of Clean Episode Cards (No Episode Numbers or Details) -->
          <div class="episodes-feed-list">
            ${data.episodes.map(ep => `
              <article class="episode-card" id="ep-${ep.id}">
                <div class="episode-header">
                  <div class="episode-thumbnail">
                    ${window.PageRenderer.createPodcastCoverSvg(data)}
                  </div>
                  <div class="episode-info">
                    <div class="episode-meta-row">
                      <span>${escapeHtml(ep.releaseDate || '2026')}</span>
                      <span>•</span>
                      <span>Duration: ${escapeHtml(ep.duration)}</span>
                    </div>
                    <h3 class="episode-title">${escapeHtml(ep.title)}</h3>
                  </div>
                </div>

                <!-- HTML5 Audio Controls Player -->
                <div class="audio-player-wrapper">
                  <audio controls preload="metadata">
                    <source src="${escapeHtml(ep.audioUrl)}" type="audio/mpeg">
                    Your browser does not support the audio element.
                  </audio>
                </div>

                <!-- Action Buttons: Share, RSS, Download -->
                <div class="episode-actions-row">
                  <button class="episode-action-btn action-share-btn" data-ep-title="${escapeHtml(ep.title)}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                    <span>Share</span>
                  </button>

                  <button class="episode-action-btn action-rss-btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 11a9 9 0 019 9M4 4a16 16 0 0116 16"/><circle cx="5" cy="19" r="1"/></svg>
                    <span>RSS Feed</span>
                  </button>

                  <a href="${escapeHtml(ep.audioUrl)}" download class="episode-action-btn action-download-btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                    <span>Download MP3</span>
                  </a>
                </div>
              </article>
            `).join('')}
          </div>
        </section>
      </div>
    `;

    // Attach Share & RSS button listeners
    const shareBtns = document.querySelectorAll('.action-share-btn');
    shareBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const title = btn.getAttribute('data-ep-title');
        if (navigator.clipboard) {
          navigator.clipboard.writeText(window.location.href);
          showToast(`Copied share link for "${title}"`);
        } else {
          showToast(`Share link ready: ${window.location.href}`);
        }
      });
    });

    const rssBtns = document.querySelectorAll('.action-rss-btn');
    rssBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        showToast(`RSS Feed URL copied for ${data.podcastName}`);
      });
    });

    initScrollObserver();
  }

  // =========================================================================
  // LIGHTBOX MODAL LOGIC
  // =========================================================================

  function openLightbox(pageIndex) {
    if (!state.currentBook) return;
    state.currentLightboxIndex = pageIndex;
    updateLightboxContent();
    lightboxModal.classList.remove('hidden');
    lightboxModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightboxModal.classList.add('hidden');
    lightboxModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function updateLightboxContent() {
    const book = state.currentBook;
    if (!book) return;
    const page = book.pages[state.currentLightboxIndex];

    lightboxPageTitle.textContent = `${book.title} — Page ${page.index} of ${book.pageCount}`;
    lightboxFilename.textContent = page.filename;
    lightboxCounter.textContent = `${page.index} / ${book.pageCount}`;

    lightboxStage.innerHTML = window.PageRenderer.createPageSvg(book, page, true);

    lightboxPrevBtn.disabled = state.currentLightboxIndex === 0;
    lightboxNextBtn.disabled = state.currentLightboxIndex === book.pages.length - 1;
  }

  function nextLightboxPage() {
    if (state.currentBook && state.currentLightboxIndex < state.currentBook.pages.length - 1) {
      state.currentLightboxIndex++;
      updateLightboxContent();
    }
  }

  function prevLightboxPage() {
    if (state.currentBook && state.currentLightboxIndex > 0) {
      state.currentLightboxIndex--;
      updateLightboxContent();
    }
  }

  function initLightboxListeners() {
    lightboxCloseBtn.addEventListener('click', closeLightbox);
    lightboxPrevBtn.addEventListener('click', prevLightboxPage);
    lightboxNextBtn.addEventListener('click', nextLightboxPage);

    lightboxModal.addEventListener('click', (e) => {
      if (e.target === lightboxModal || e.target.classList.contains('lightbox-content')) {
        closeLightbox();
      }
    });

    window.addEventListener('keydown', (e) => {
      const isLightboxOpen = !lightboxModal.classList.contains('hidden');

      if (isLightboxOpen) {
        if (e.key === 'Escape') {
          closeLightbox();
        } else if (e.key === 'ArrowLeft') {
          prevLightboxPage();
        } else if (e.key === 'ArrowRight') {
          nextLightboxPage();
        }
      } else if (state.currentBook) {
        const { prevId, nextId } = window.BookStore.getAdjacentBookIds(state.currentBook.id);
        if (e.key === 'ArrowLeft' && prevId && e.altKey) {
          window.Router.navigate(`/book/${prevId}`);
        } else if (e.key === 'ArrowRight' && nextId && e.altKey) {
          window.Router.navigate(`/book/${nextId}`);
        }
    });
  }

  /**
   * S3 Configuration Modal Controller
   */
  function initS3ConfigModal() {
    const s3ConfigBtn = document.getElementById('s3-config-btn');
    const s3Modal = document.getElementById('s3-modal');
    const s3ModalCloseBtn = document.getElementById('s3-modal-close-btn');
    const s3UrlInput = document.getElementById('s3-url-input');
    const s3SaveBtn = document.getElementById('s3-save-btn');
    const s3ResetBtn = document.getElementById('s3-reset-btn');
    const s3StatusBox = document.getElementById('s3-status-box');
    const s3StatusText = document.getElementById('s3-status-text');

    if (!s3ConfigBtn || !s3Modal) return;

    function updateModalStatus() {
      const activeUrl = window.APP_CONFIG.getMediaBaseUrl();
      if (activeUrl) {
        s3UrlInput.value = activeUrl;
        s3StatusBox.className = 's3-status-box active-s3';
        s3StatusText.textContent = `Active S3 Host: ${activeUrl}`;
      } else {
        s3UrlInput.value = '';
        s3StatusBox.className = 's3-status-box active-local';
        s3StatusText.textContent = 'Status: Local fallback path active (S3 Base URL empty)';
      }
    }

    function openS3Modal() {
      updateModalStatus();
      s3Modal.classList.remove('hidden');
      s3Modal.setAttribute('aria-hidden', 'false');
      s3UrlInput.focus();
    }

    function closeS3Modal() {
      s3Modal.classList.add('hidden');
      s3Modal.setAttribute('aria-hidden', 'true');
    }

    s3ConfigBtn.addEventListener('click', openS3Modal);
    s3ModalCloseBtn.addEventListener('click', closeS3Modal);

    s3Modal.addEventListener('click', (e) => {
      if (e.target === s3Modal) {
        closeS3Modal();
      }
    });

    s3SaveBtn.addEventListener('click', () => {
      const inputVal = s3UrlInput.value.trim();
      if (inputVal) {
        if (!/^https?:\/\//i.test(inputVal)) {
          showToast('Please enter a valid URL starting with http:// or https://');
          return;
        }
        window.APP_CONFIG.setMediaBaseUrl(inputVal);
        showToast('S3 Media URL saved!');
      } else {
        window.APP_CONFIG.resetMediaBaseUrl();
        showToast('Reset to Local Path.');
      }
      updateModalStatus();
      closeS3Modal();
      // Re-render active view
      window.Router.handleRoute();
    });

    s3ResetBtn.addEventListener('click', () => {
      window.APP_CONFIG.resetMediaBaseUrl();
      showToast('Media source set to Local Path.');
      updateModalStatus();
      closeS3Modal();
      window.Router.handleRoute();
    });
  }
});

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, function(m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m];
  });
}
