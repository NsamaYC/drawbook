/**
 * LuminaVault Application Controller
 * Handles rendering for Books, Virtualized Book Viewer, Podcasts Hub, Modular Podcast Landing Pages,
 * Virtualized TAOC (The Art of Ceilings) Gallery with Mobile Precision Touch-Scrubber,
 * theme toggling, search, jump select, and interactive toasts.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Application State
  const state = {
    books: window.BookStore.getAllBooks(),
    podcasts: window.BookStore.getAllPodcasts(),
    taocBatches: window.BookStore.getAllTaocBatches(),
    currentBook: null,
    currentPodcast: null,
    currentTaocBatch: null,
    currentLightboxIndex: 0,
    lightboxContext: 'book', // 'book' or 'taoc'
    searchQuery: '',
    selectedGenre: 'ALL',
    viewMode: 'grid',
    activeVirtualGrid: null,
    activeTouchScrubber: null
  };

  // DOM Elements
  const mainContent = document.getElementById('main-content');
  const jumpSelect = document.getElementById('jump-to-book-select');
  const themeToggleBtn = document.getElementById('theme-toggle');
  const navIndexBtn = document.getElementById('nav-index-btn');
  const navPodcastsBtn = document.getElementById('nav-podcasts-btn');
  const navTaocBtn = document.getElementById('nav-taoc-btn');
  const navSupportersBtn = document.getElementById('nav-supporters-btn');

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
   * Clean up active virtualizers & scrubbers on route/view change
   */
  function cleanupActiveControllers() {
    if (state.activeVirtualGrid) {
      state.activeVirtualGrid.destroy();
      state.activeVirtualGrid = null;
    }
    if (state.activeTouchScrubber) {
      state.activeTouchScrubber.destroy();
      state.activeTouchScrubber = null;
    }
  }

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

    document.querySelectorAll('.book-card, .podcast-hub-card, .episode-card, .taoc-batch-card').forEach((el, idx) => {
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
      cleanupActiveControllers();
      document.title = 'Drawbook | Digital Sketchbook Gallery';
      state.currentBook = null;
      state.currentPodcast = null;
      state.currentTaocBatch = null;
      updateActiveNav('books');
      renderLibraryIndex();
    });

    // Route 2: Virtualized Book Viewer Component
    window.Router.register('/book/:id', (bookId) => {
      cleanupActiveControllers();
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
      state.currentTaocBatch = null;
      updateActiveNav('books');
      document.title = `${book.title} - Drawbook`;
      renderBookViewer(book);
    });

    // Route 3: Podcasts Mainpage Hub
    window.Router.register('/podcasts', () => {
      cleanupActiveControllers();
      document.title = 'Drawbook | Audio Podcasts';
      state.currentBook = null;
      state.currentPodcast = null;
      state.currentTaocBatch = null;
      updateActiveNav('podcasts');
      renderPodcastsHub();
    });

    // Route 4: Modular Podcast Landing Page Template
    window.Router.register('/podcast/:id', (param) => {
      cleanupActiveControllers();
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
      state.currentTaocBatch = null;
      updateActiveNav('podcasts');
      document.title = `${podcast.podcastName} - Podcast Series`;
      renderPodcastLandingPage(podcast);
    });

    // Route 5: @TheArtOfCeilings Index (Batch Grid)
    window.Router.register('/taoc', () => {
      cleanupActiveControllers();
      document.title = 'Drawbook | @TheArtOfCeilings';
      state.currentBook = null;
      state.currentPodcast = null;
      state.currentTaocBatch = null;
      updateActiveNav('taoc');
      renderTaocIndex();
    });

    // Route 6: Virtualized @TheArtOfCeilings Batch Viewer
    window.Router.register('/taoc/:id', (batchId) => {
      cleanupActiveControllers();
      const batch = window.BookStore.getTaocBatchById(batchId);
      if (!batch) {
        window.Router.navigate('/taoc');
        return;
      }
      state.currentTaocBatch = batch;
      state.currentBook = null;
      state.currentPodcast = null;
      updateActiveNav('taoc');
      document.title = `@TheArtOfCeilings ${batch.title}`;
      renderTaocBatchViewer(batch);
    });

    // Route 7: Supporters Page
    window.Router.register('/supporters', () => {
      cleanupActiveControllers();
      document.title = 'Drawbook | Supporters & Patrons';
      state.currentBook = null;
      state.currentPodcast = null;
      state.currentTaocBatch = null;
      updateActiveNav('supporters');
      renderSupportersPage();
    });

    window.Router.init();
  }

  function updateActiveNav(type) {
    navIndexBtn.classList.remove('active');
    navPodcastsBtn.classList.remove('active');
    if (navTaocBtn) navTaocBtn.classList.remove('active');
    if (navSupportersBtn) navSupportersBtn.classList.remove('active');

    if (type === 'books') {
      navIndexBtn.classList.add('active');
    } else if (type === 'podcasts') {
      navPodcastsBtn.classList.add('active');
    } else if (type === 'taoc') {
      if (navTaocBtn) navTaocBtn.classList.add('active');
    } else if (type === 'supporters') {
      if (navSupportersBtn) navSupportersBtn.classList.add('active');
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

  /**
   * Book Viewer Component
   */
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
        state.lightboxContext = 'book';
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

  // =========================================================================
  // RENDERERS: PODCASTS MAINPAGE HUB (VERTICAL SCROLL REEL)
  // =========================================================================

  function renderPodcastsHub() {
    const podcasts = state.podcasts;

    mainContent.innerHTML = `
      <div class="podcasts-reel-container" id="podcasts-reel">
        <!-- Floating Vertical Navigation Dots -->
        <nav class="reel-nav-dots" aria-label="Podcast Reel Navigation">
          ${podcasts.map((pod, idx) => `
            <button class="reel-dot-btn ${idx === 0 ? 'active' : ''}" data-index="${idx}" aria-label="Scroll to ${escapeHtml(pod.podcastName)}"></button>
          `).join('')}
        </nav>

        <!-- Full-screen Reel Sections -->
        ${podcasts.map((pod, idx) => {
          const resolvedCover = window.APP_CONFIG ? window.APP_CONFIG.resolveMediaUrl(pod.coverArtUrl) : pod.coverArtUrl;
          const targetRoute = `#/podcast/${pod.slug || pod.id}`;
          return `
            <section class="podcast-reel-section" id="reel-section-${idx}" data-index="${idx}">
              <div class="podcast-reel-ambient-bg" style="background-image: url('${resolvedCover}');"></div>
              
              <div class="podcast-reel-content">
                <div class="podcast-reel-cover-wrap">
                  <a href="${targetRoute}" aria-label="Open ${escapeHtml(pod.podcastName)}">
                    <img src="${resolvedCover}" alt="${escapeHtml(pod.podcastName)} Cover" loading="${idx === 0 ? 'eager' : 'lazy'}" onerror="this.onerror=null;this.src='${encodeURI(pod.coverArtUrl)}';">
                  </a>
                </div>

                <div class="podcast-reel-card">
                  <div class="podcast-reel-badge-row">
                    <span class="podcast-reel-index">SERIES 0${idx + 1}</span>
                    <span class="podcast-reel-ep-count">${pod.episodes.length} Episodes</span>
                  </div>

                  <h1 class="podcast-reel-title">${escapeHtml(pod.podcastName)}</h1>
                  <div class="podcast-reel-host">Hosted by ${escapeHtml(pod.hostName || 'Sean Penalber')}</div>
                  <p class="podcast-reel-desc">${escapeHtml(pod.description)}</p>

                  <div class="podcast-reel-actions">
                    <a href="${targetRoute}" class="podcast-reel-btn">
                      <span>Explore Episodes</span>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </a>
                    ${pod.socialLink ? `
                      <a href="${escapeHtml(pod.socialLink)}" target="_blank" rel="noopener" class="podcast-reel-social" title="Host Profile on X">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                      </a>
                    ` : ''}
                  </div>
                </div>
              </div>

              ${idx === 0 ? `
                <div class="reel-scroll-hint">
                  <span>Scroll to explore</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
                </div>
              ` : ''}
            </section>
          `;
        }).join('')}
      </div>
    `;

    const reelContainer = document.getElementById('podcasts-reel');
    const dotBtns = document.querySelectorAll('.reel-dot-btn');
    const sections = document.querySelectorAll('.podcast-reel-section');

    dotBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.getAttribute('data-index'), 10);
        if (sections[index]) {
          sections[index].scrollIntoView({ behavior: 'smooth' });
        }
      });
    });

    if ('IntersectionObserver' in window) {
      const reelObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const idx = parseInt(entry.target.getAttribute('data-index'), 10);
            dotBtns.forEach((dot, dIdx) => {
              dot.classList.toggle('active', dIdx === idx);
            });
          }
        });
      }, { root: reelContainer, threshold: 0.55 });

      sections.forEach(sec => reelObserver.observe(sec));
    }
  }

  // =========================================================================
  // MODULAR PODCAST LANDING PAGE TEMPLATE (CUSTOM AUDIO PLAYER)
  // =========================================================================

  function formatAudioTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  function renderPodcastLandingPage(data) {
    const resolvedCover = window.APP_CONFIG ? window.APP_CONFIG.resolveMediaUrl(data.coverArtUrl) : data.coverArtUrl;

    mainContent.innerHTML = `
      <div class="podcast-landing-layout">
        
        <!-- Column 1 (Sidebar / Vibe) -->
        <aside class="podcast-sidebar">
          <div class="podcast-cover-container">
            ${window.PageRenderer.createPodcastCoverSvg(data)}
          </div>

          <div class="podcast-sidebar-info">
            <h1 class="podcast-sidebar-title">${escapeHtml(data.podcastName)}</h1>
            <div class="podcast-host-byline">
              <span>Hosted by ${escapeHtml(data.hostName || 'Sean Penalber')}</span>
              ${data.socialLink ? `
                <a href="${escapeHtml(data.socialLink)}" target="_blank" rel="noopener" class="podcast-social-link" title="Host Social Profile">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
              ` : ''}
            </div>
            <p class="podcast-description">${escapeHtml(data.description)}</p>
          </div>

          ${data.spotifyDirectLink ? `
            <a href="${escapeHtml(data.spotifyDirectLink)}" target="_blank" rel="noopener" class="spotify-btn">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.12-.779-.18-.899-.54-.12-.42.18-.78.54-.9 4.56-1.02 8.52-.6 11.64 1.32.42.18.479.78.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.18-.1.2-.78-.42-.18-.6.2-1.2.78-1.38 4.26-1.26 11.28-1.02 15.72 1.62.54.3.72 1.02.42 1.56-.3.42-1.02.6-1.5.3z"/>
              </svg>
              <span>Listen on Spotify</span>
            </a>
          ` : ''}

          <div class="podcast-sidebar-section">
            <h3 class="sidebar-section-title">Stream Us</h3>
            <ul class="stream-links-list">
              ${(data.streamLinks || [
                { platform: "Apple Podcasts", url: "#" },
                { platform: "Spotify", url: "#" },
                { platform: "YouTube", url: "#" }
              ]).map(stream => `
                <li class="stream-link-item">
                  <a href="${escapeHtml(stream.url)}" target="_blank" rel="noopener">
                    <span>${escapeHtml(stream.platform)}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
                  </a>
                </li>
              `).join('')}
            </ul>
          </div>

          <div class="podcast-sidebar-section">
            <h3 class="sidebar-section-title">Support Us</h3>
            <div class="support-logos-grid">
              ${(data.supportLinks || [
                { platform: "Patreon", url: "https://patreon.com", color: "#f96854" },
                { platform: "Venmo", url: "https://account.venmo.com/u/seanpenalber", color: "#008cff" },
                { platform: "Cash App", url: "https://cash.app/$SeanPenalber", color: "#00d632" },
                { platform: "PayPal", url: "https://paypal.com/paypalme/seanpenalber", color: "#003087" }
              ]).map(support => `
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

          <div class="episodes-feed-list" style="display: flex; flex-direction: column; gap: 1.25rem;">
            ${data.episodes.map(ep => {
              const epAudio = window.APP_CONFIG ? window.APP_CONFIG.resolveMediaUrl(ep.audioUrl) : ep.audioUrl;
              return `
                <article class="custom-episode-card" id="ep-${ep.id}">
                  <div class="custom-episode-thumb-wrap">
                    <img src="${resolvedCover}" alt="${escapeHtml(data.podcastName)} Thumbnail" loading="lazy" onerror="this.onerror=null;this.src='${encodeURI(data.coverArtUrl)}';">
                  </div>

                  <div class="custom-episode-body">
                    <div class="custom-ep-series-name">${escapeHtml(data.podcastName)}</div>
                    <h3 class="custom-ep-title">${escapeHtml(ep.title)}</h3>

                    <div class="custom-player-bar">
                      <button class="custom-play-btn" data-audio-id="audio-${ep.id}" aria-label="Play ${escapeHtml(ep.title)}">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                      </button>

                      <div class="custom-scrubber-wrap">
                        <div class="custom-scrubber-top">
                          <input type="range" class="custom-scrub-range" min="0" max="100" value="0" step="0.1" data-audio-id="audio-${ep.id}" aria-label="Scrub episode audio">
                          <span class="custom-time-text" id="time-${ep.id}">00:00 / ${escapeHtml(ep.duration || '00:00')}</span>
                        </div>

                        <div class="custom-secondary-controls">
                          <button class="custom-icon-ctrl btn-vol" data-audio-id="audio-${ep.id}" title="Mute/Unmute" aria-label="Mute or unmute">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                          </button>
                          
                          <button class="custom-icon-ctrl btn-skip-back" data-audio-id="audio-${ep.id}" title="Rewind 10s" aria-label="Rewind 10 seconds">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><text x="12" y="15" font-size="8" font-family="sans-serif" font-weight="bold" fill="currentColor" text-anchor="middle">10</text></svg>
                          </button>

                          <button class="custom-icon-ctrl custom-speed-badge btn-speed" data-audio-id="audio-${ep.id}" title="Playback speed" aria-label="Change playback speed">1x</button>

                          <button class="custom-icon-ctrl btn-skip-fwd" data-audio-id="audio-${ep.id}" title="Forward 30s" aria-label="Forward 30 seconds">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><text x="12" y="15" font-size="8" font-family="sans-serif" font-weight="bold" fill="currentColor" text-anchor="middle">30</text></svg>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div class="custom-action-links">
                      <button class="custom-action-link btn-sub" data-ep-title="${escapeHtml(ep.title)}">SUBSCRIBE</button>
                      <button class="custom-action-link btn-share" data-ep-title="${escapeHtml(ep.title)}">SHARE</button>
                      <a href="${escapeHtml(epAudio)}" download class="custom-action-link">DOWNLOAD MP3</a>
                    </div>

                    <!-- Audio Element -->
                    <audio id="audio-${ep.id}" src="${escapeHtml(epAudio)}" preload="none"></audio>
                  </div>
                </article>
              `;
            }).join('')}
          </div>
        </section>
      </div>
    `;

    // Interactive Audio Engine
    let activeAudio = null;
    let activePlayBtn = null;

    const playBtns = document.querySelectorAll('.custom-play-btn');
    playBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const audioId = btn.getAttribute('data-audio-id');
        const audio = document.getElementById(audioId);
        if (!audio) return;

        if (activeAudio && activeAudio !== audio) {
          activeAudio.pause();
          if (activePlayBtn) {
            activePlayBtn.classList.remove('playing');
            activePlayBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
          }
        }

        if (audio.paused) {
          audio.play().then(() => {
            btn.classList.add('playing');
            btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
            activeAudio = audio;
            activePlayBtn = btn;
          }).catch(err => {
            console.warn('Playback notice:', err);
            showToast('Audio loading, please tap play again...');
          });
        } else {
          audio.pause();
          btn.classList.remove('playing');
          btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
        }
      });
    });

    document.querySelectorAll('.custom-scrub-range').forEach(slider => {
      const audioId = slider.getAttribute('data-audio-id');
      const audio = document.getElementById(audioId);
      const epId = audioId.replace('audio-', '');
      const timeDisplay = document.getElementById(`time-${epId}`);
      if (!audio) return;

      audio.addEventListener('timeupdate', () => {
        if (audio.duration) {
          slider.value = (audio.currentTime / audio.duration) * 100;
          if (timeDisplay) {
            timeDisplay.textContent = `${formatAudioTime(audio.currentTime)} / ${formatAudioTime(audio.duration)}`;
          }
        }
      });

      audio.addEventListener('ended', () => {
        const btn = document.querySelector(`.custom-play-btn[data-audio-id="${audioId}"]`);
        if (btn) {
          btn.classList.remove('playing');
          btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
        }
        slider.value = 0;
      });

      const onSeek = () => {
        if (audio.duration) {
          audio.currentTime = (slider.value / 100) * audio.duration;
        }
      };
      slider.addEventListener('input', onSeek);
      slider.addEventListener('change', onSeek);
    });

    document.querySelectorAll('.btn-skip-back').forEach(btn => {
      btn.addEventListener('click', () => {
        const audio = document.getElementById(btn.getAttribute('data-audio-id'));
        if (audio) audio.currentTime = Math.max(0, audio.currentTime - 10);
      });
    });

    document.querySelectorAll('.btn-skip-fwd').forEach(btn => {
      btn.addEventListener('click', () => {
        const audio = document.getElementById(btn.getAttribute('data-audio-id'));
        if (audio) audio.currentTime = Math.min(audio.duration || Infinity, audio.currentTime + 30);
      });
    });

    document.querySelectorAll('.btn-vol').forEach(btn => {
      btn.addEventListener('click', () => {
        const audio = document.getElementById(btn.getAttribute('data-audio-id'));
        if (audio) {
          audio.muted = !audio.muted;
          btn.innerHTML = audio.muted ?
            `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/></svg>` :
            `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;
        }
      });
    });

    document.querySelectorAll('.btn-speed').forEach(btn => {
      const speeds = [1, 1.25, 1.5, 2];
      let sIdx = 0;
      btn.addEventListener('click', () => {
        const audio = document.getElementById(btn.getAttribute('data-audio-id'));
        if (audio) {
          sIdx = (sIdx + 1) % speeds.length;
          const newSpeed = speeds[sIdx];
          audio.playbackRate = newSpeed;
          btn.textContent = `${newSpeed}x`;
        }
      });
    });

    document.querySelectorAll('.btn-share').forEach(btn => {
      btn.addEventListener('click', () => {
        const epTitle = btn.getAttribute('data-ep-title');
        const shareUrl = `${window.location.origin}${window.location.pathname}#/podcast/${data.slug || data.id}`;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(shareUrl);
          showToast(`Copied episode link for "${epTitle}"`);
        } else {
          showToast(`Share URL: ${shareUrl}`);
        }
      });
    });

    document.querySelectorAll('.btn-sub').forEach(btn => {
      btn.addEventListener('click', () => {
        showToast(`Subscribed to ${data.podcastName}! Follow @${data.podcastName.replace(/\\s+/g, '')} for updates.`);
      });
    });

    initScrollObserver();
  }

  // =========================================================================
  // RENDERERS: SUPPORTERS & PATRONS PAGE
  // =========================================================================

  function renderSupportersPage() {
    const supporterColumns = [
      [
        { name: "Sean Penalber", tier: "Founder & Artist" },
        { name: "Whodathunk Band", tier: "Creative Partner" },
        { name: "The School of Funk", tier: "Cultural Partner" },
        { name: "Bob Morrissey", tier: "Visionary Patron" },
        { name: "Qasim Ali", tier: "Founding Patron" },
        { name: "Francois Pointeau", tier: "Master Patron" },
        { name: "Anastasia Kirages", tier: "Key Contributor" },
        { name: "Wesley Demaree", tier: "Founding Supporter" },
        { name: "Meredith Nudo", tier: "Sustaining Patron" },
        { name: "Vee Ramos", tier: "Arts Advocate" }
      ],
      [
        { name: "Rahul Rao", tier: "Arts Benefactor" },
        { name: "Nisha Crossley", tier: "Honorary Patron" },
        { name: "Alyssia Dieringer", tier: "Creative Sponsor" },
        { name: "Beth Alder", tier: "Creative Sponsor" },
        { name: "Nick Palermo", tier: "Patron of Sound" },
        { name: "Cody Miears", tier: "Gallery Patron" },
        { name: "Scott White", tier: "Studio Supporter" },
        { name: "Bryce Levi Perkins", tier: "Sustaining Patron" },
        { name: "Ku Egenti", tier: "Arts Champion" },
        { name: "Mad Whit", tier: "Cultural Benefactor" }
      ],
      [
        { name: "Nathaniel Potts-Wells", tier: "Creative Patron" },
        { name: "Nkechi Chibueze", tier: "Honorary Sponsor" },
        { name: "Schetauna Powell", tier: "Patron of the Arts" },
        { name: "Jacob Calle", tier: "Explorer Patron" },
        { name: "Mark Hurtado", tier: "Sound Patron" },
        { name: "Elena Rostova", tier: "Archival Patron" },
        { name: "Marcus Vance", tier: "Collector" },
        { name: "Camila Torres", tier: "Gallery Friend" },
        { name: "Julian Sterling", tier: "Sustaining Patron" },
        { name: "Amara Osei", tier: "Arts Benefactor" }
      ],
      [
        { name: "Siddharth Mehta", tier: "Digital Archivist" },
        { name: "Leila Chen", tier: "Patron" },
        { name: "Darius Thorne", tier: "Honorary Supporter" },
        { name: "Zoe Katsaros", tier: "Creative Sponsor" },
        { name: "Trevor Vance", tier: "Founding Contributor" },
        { name: "Haruto Takahashi", tier: "International Patron" },
        { name: "Miriam Al-Mansoor", tier: "Gallery Patron" },
        { name: "Felix Beaulieu", tier: "Collector" },
        { name: "Seraphina Cruz", tier: "Arts Advocate" },
        { name: "David M. Keller", tier: "Sustaining Patron" }
      ]
    ];

    mainContent.innerHTML = `
      <div class="supporters-page-wrap">
        <div class="supporters-vignette"></div>

        <header class="supporters-hero-header">
          <h1 class="supporters-title">OUR SUPPORTERS</h1>
          <p class="supporters-subtitle">With profound gratitude to the patrons, collectors, collaborators, and friends who champion independent art, publishing, and sonic storytelling.</p>
        </header>

        <div class="supporters-marquee-container" aria-label="Supporters marquee list">
          ${supporterColumns.map((col, cIdx) => {
            const duplicated = [...col, ...col, ...col];
            return `
              <div class="marquee-column marquee-col-${cIdx + 1}">
                ${duplicated.map(sup => `
                  <div class="supporter-item">
                    <span class="supporter-name">${escapeHtml(sup.name)}</span>
                    <span class="supporter-tier">${escapeHtml(sup.tier)}</span>
                  </div>
                `).join('')}
              </div>
            `;
          }).join('')}
        </div>

        <div class="supporters-footer-card">
          <h2 class="supporters-footer-title">Join Our Circle of Patrons</h2>
          <p class="supporters-footer-desc">Support continuous production of sketchbooks, digital preservation, podcasts, and the ceiling art archive.</p>
          <div class="supporters-footer-links">
            <a href="https://paypal.com/paypalme/seanpenalber" target="_blank" rel="noopener" class="taoc-payment-btn paypal">PayPal</a>
            <a href="https://account.venmo.com/u/seanpenalber" target="_blank" rel="noopener" class="taoc-payment-btn venmo">Venmo</a>
            <a href="https://cash.app/$SeanPenalber" target="_blank" rel="noopener" class="taoc-payment-btn cashapp">Cash App</a>
            <a href="#/taoc" class="podcast-reel-btn">Acquire Ceiling Art & Cards →</a>
          </div>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // RENDERERS: @TheArtOfCeilings GALLERY
  // =========================================================================

  /**
   * @TheArtOfCeilings Index Page — Grid of batch cards & Trading Card Acquisition
   */
  function renderTaocIndex() {
    const batches = state.taocBatches;
    const totalImages = batches.reduce((sum, b) => sum + b.imageCount, 0);

    mainContent.innerHTML = `
      <section class="library-hero taoc-hero">
        <h1 class="library-title">@TheArtOfCeilings</h1>
        <p class="library-subtitle">Discover a new perspective with our exclusive collection of ceiling art photographs. Over ${totalImages.toLocaleString()} high-resolution images organized into ${batches.length} curated batches.</p>
      </section>

      <div class="taoc-batches-grid">
        ${batches.map(batch => {
          const coverSrc = window.APP_CONFIG ? window.APP_CONFIG.resolveMediaUrl(batch.coverSrc) : batch.coverSrc;
          return `
            <a href="#/taoc/${batch.id}" class="taoc-batch-card" aria-label="Open ${batch.title} — Images ${batch.startIndex} to ${batch.endIndex}">
              <div class="taoc-batch-cover-wrap">
                <img src="${coverSrc}" alt="@TheArtOfCeilings — ${batch.title}" class="taoc-batch-cover-img" loading="lazy">
                <div class="taoc-batch-cover-overlay">
                  <span class="taoc-batch-number">Batch ${batch.batchNumber}</span>
                </div>
              </div>
              <div class="taoc-batch-info">
                <h2 class="taoc-batch-title">${batch.title}</h2>
                <div class="taoc-batch-meta">
                  <span>Images ${batch.startIndex}–${batch.endIndex}</span>
                  <span>${batch.imageCount} Photos</span>
                </div>
              </div>
            </a>
          `;
        }).join('')}
      </div>

      <!-- Trading Card Acquisition & Collector Section -->
      <section class="taoc-acquire-section">
        <div class="taoc-acquire-header">
          <span class="taoc-acquire-badge">Exclusive Collector Cards</span>
          <h2 class="taoc-acquire-title">Acquire Original Trading Cards</h2>
          <p class="taoc-acquire-subtitle">Physical trading cards and collector prints from @TheArtOfCeilings archive are available for individual acquisition. Each card features original photography from the collection. All card purchases come with a surprise gift!</p>
        </div>

        <div class="taoc-acquire-grid">
          <div class="taoc-acquire-card">
            <h3 class="taoc-card-heading">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 7L2 7"/></svg>
              How to Place an Order
            </h3>
            <p style="font-size: 0.95rem; color: var(--text-secondary); line-height: 1.5;">To acquire cards or prints, send an email to either address below:</p>
            
            <div class="taoc-email-links">
              <a href="mailto:whodathunkband@gmail.com" class="taoc-email-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                whodathunkband@gmail.com
              </a>
              <a href="mailto:theeschooloffunk@gmail.com" class="taoc-email-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                theeschooloffunk@gmail.com
              </a>
            </div>

            <p style="font-size: 0.9rem; font-weight: 700; color: var(--text-primary); margin-top: 0.5rem;">Please include the following in your message:</p>
            <ul class="taoc-steps-list">
              <li class="taoc-step-item">
                <span class="taoc-step-num">1</span>
                <span><strong>Your Name</strong></span>
              </li>
              <li class="taoc-step-item">
                <span class="taoc-step-num">2</span>
                <span><strong>Card Number(s) (#)</strong> from the gallery (e.g. #0042)</span>
              </li>
              <li class="taoc-step-item">
                <span class="taoc-step-num">3</span>
                <span><strong>Phone Number</strong> <em>(optional)</em></span>
              </li>
              <li class="taoc-step-item">
                <span class="taoc-step-num">4</span>
                <span><strong>Social Media Handle</strong> <em>(optional)</em></span>
              </li>
              <li class="taoc-step-item">
                <span class="taoc-step-num">5</span>
                <span><strong>Mailing Address</strong> <em>(if shipping is required)</em></span>
              </li>
            </ul>
          </div>

          <div class="taoc-acquire-card">
            <h3 class="taoc-card-heading">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              Payment Methods
            </h3>
            <p style="font-size: 0.95rem; color: var(--text-secondary); line-height: 1.5;">Direct payments can be completed via:</p>

            <div class="taoc-payment-links-grid">
              <a href="https://paypal.com/paypalme/seanpenalber" target="_blank" rel="noopener" class="taoc-payment-btn paypal">
                <span>PayPal</span>
              </a>
              <a href="https://account.venmo.com/u/seanpenalber" target="_blank" rel="noopener" class="taoc-payment-btn venmo">
                <span>Venmo</span>
              </a>
              <a href="https://cash.app/$SeanPenalber" target="_blank" rel="noopener" class="taoc-payment-btn cashapp">
                <span>Cash App</span>
              </a>
              <div class="taoc-payment-btn cash" title="In-person payment">
                <span>Cash</span>
              </div>
            </div>

            <div class="taoc-gift-callout">
              <span class="taoc-gift-icon">🎁</span>
              <div>
                <div style="font-weight: 800; font-size: 1.05rem; margin-bottom: 2px;">Surprise Gift Included!</div>
                <div style="font-size: 0.875rem; color: var(--text-secondary);">All card purchases come with a surprise collectible gift from the studio archive.</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;

    initScrollObserver();
  }

  /**
   * TAOC Batch Viewer Component
   */
  function renderTaocBatchViewer(batch) {
    const { prevId, nextId } = window.BookStore.getAdjacentTaocBatchIds(batch.id);

    const renderBatchNavMarkup = (position) => `
      <nav class="book-nav-bar taoc-nav-bar" aria-label="Batch navigation ${position}">
        ${prevId ? `
          <a href="#/taoc/${prevId}" class="book-nav-btn" aria-label="Go to Batch ${prevId}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
            <span>Previous Batch</span>
          </a>
        ` : `
          <button class="book-nav-btn disabled" aria-disabled="true" disabled>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
            <span>Previous Batch</span>
          </button>
        `}

        <div class="book-nav-center">
          <h1 class="book-header-title">@TheArtOfCeilings — ${batch.title}</h1>
          <span class="book-header-subtitle">Images ${batch.startIndex}–${batch.endIndex} • ${batch.imageCount} Photographs</span>
        </div>

        ${nextId ? `
          <a href="#/taoc/${nextId}" class="book-nav-btn" aria-label="Go to Batch ${nextId}">
            <span>Next Batch</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
          </a>
        ` : `
          <button class="book-nav-btn disabled" aria-disabled="true" disabled>
            <span>Next Batch</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        `}
      </nav>
    `;

    mainContent.innerHTML = `
      <div class="book-viewer-container taoc-viewer-container">
        ${renderBatchNavMarkup('top')}

        <div class="viewer-toolbar">
          <div>
            <strong>Showing:</strong> 
            <code>${batch.pages[0].rawName}</code> — <code>${batch.pages[batch.pages.length - 1].rawName}</code>
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
          ${batch.pages.map((page, index) => {
            const isSold = page.status === 'sold';
            const badgeClass = isSold ? 'taoc-sold-badge' : 'taoc-forsale-badge';
            const badgeText = isSold ? 'SOLD' : 'FOR SALE';
            const resolvedSrc = window.APP_CONFIG ? window.APP_CONFIG.resolveMediaUrl(page.src) : page.src;

            return `
              <div class="page-card taoc-page-card ${isSold ? 'taoc-sold-card' : ''}" data-page-index="${index}" tabindex="0" role="button" aria-label="View ${page.filename}">
                <div class="page-placeholder-box" style="aspect-ratio: 3 / 4;">
                  <div class="page-img-wrapper">
                    <img src="${resolvedSrc}" alt="@TheArtOfCeilings Image ${page.imageNumber}" class="page-real-img" loading="lazy" onload="this.parentElement.classList.add('loaded')">
                  </div>
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
                  <span class="page-label">#${page.imageNumber}</span>
                  <span class="page-res-badge ${badgeClass}">${badgeText}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        ${renderBatchNavMarkup('bottom')}
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
        state.lightboxContext = 'taoc';
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
  // LIGHTBOX MODAL LOGIC
  // =========================================================================

  function openLightbox(pageIndex) {
    if (state.lightboxContext === 'book' && !state.currentBook) return;
    if (state.lightboxContext === 'taoc' && !state.currentTaocBatch) return;
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
    if (state.lightboxContext === 'taoc') {
      updateTaocLightboxContent();
      return;
    }

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

  function updateTaocLightboxContent() {
    const batch = state.currentTaocBatch;
    if (!batch) return;
    const page = batch.pages[state.currentLightboxIndex];
    const resolvedSrc = window.APP_CONFIG ? window.APP_CONFIG.resolveMediaUrl(page.src) : page.src;

    lightboxPageTitle.textContent = `TAOC — Image #${page.imageNumber} (${batch.title})`;
    lightboxFilename.textContent = page.filename;
    lightboxCounter.textContent = `${page.index} / ${batch.imageCount}`;

    lightboxStage.innerHTML = `
      <div class="page-img-wrapper">
        <img src="${resolvedSrc}" alt="TAOC Image ${page.imageNumber}" class="page-real-img fullres-img" loading="lazy" onload="this.parentElement.classList.add('loaded')">
      </div>
    `;

    lightboxPrevBtn.disabled = state.currentLightboxIndex === 0;
    lightboxNextBtn.disabled = state.currentLightboxIndex === batch.pages.length - 1;
  }

  function nextLightboxPage() {
    const pages = state.lightboxContext === 'taoc'
      ? (state.currentTaocBatch ? state.currentTaocBatch.pages : [])
      : (state.currentBook ? state.currentBook.pages : []);

    if (state.currentLightboxIndex < pages.length - 1) {
      state.currentLightboxIndex++;
      updateLightboxContent();
    }
  }

  function prevLightboxPage() {
    if (state.currentLightboxIndex > 0) {
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
      } else if (state.currentTaocBatch) {
        const { prevId, nextId } = window.BookStore.getAdjacentTaocBatchIds(state.currentTaocBatch.id);
        if (e.key === 'ArrowLeft' && prevId && e.altKey) {
          window.Router.navigate(`/taoc/${prevId}`);
        } else if (e.key === 'ArrowRight' && nextId && e.altKey) {
          window.Router.navigate(`/taoc/${nextId}`);
        }
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
