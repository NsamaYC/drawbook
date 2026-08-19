/**
 * LuminaVault Canvas & SVG Renderer
 * Renders realistic comic/sketchbook page placeholders, book covers, and podcast cover art & icons.
 */

window.PageRenderer = {
  /**
   * Generates SVG or IMG string for a page
   */
  createPageSvg(book, page, isFullRes = false) {
    if (page.src) {
      const resolvedSrc = window.APP_CONFIG ? window.APP_CONFIG.resolveMediaUrl(page.src) : page.src;
      return `
        <div class="page-img-wrapper">
          <img src="${resolvedSrc}" alt="${book.title} Page ${page.index}" class="page-real-img ${isFullRes ? 'fullres-img' : ''}" loading="lazy" onload="this.parentElement.classList.add('loaded')">
        </div>
      `;
    }
    return this.createSvgFallback(book, page, isFullRes);
  },

  createSvgFallback(book, page, isFullRes = false) {
    const palette = book.palette || { primary: "#6366f1", secondary: "#4f46e5", accent: "#a5b4fc" };
    const width = 600;
    const height = 800; // 3:4 aspect ratio
    
    const seed = (book.id * 7 + page.index * 13) % 4;

    let panelPaths = '';
    if (seed === 0) {
      panelPaths = `
        <rect x="40" y="50" width="245" height="320" rx="8" fill="var(--bg-surface)" stroke="${palette.primary}" stroke-width="2" opacity="0.4"/>
        <rect x="315" y="50" width="245" height="320" rx="8" fill="var(--bg-surface)" stroke="${palette.primary}" stroke-width="2" opacity="0.4"/>
        <rect x="40" y="400" width="245" height="330" rx="8" fill="var(--bg-surface)" stroke="${palette.primary}" stroke-width="2" opacity="0.4"/>
        <rect x="315" y="400" width="245" height="330" rx="8" fill="var(--bg-surface)" stroke="${palette.primary}" stroke-width="2" opacity="0.4"/>
      `;
    } else if (seed === 1) {
      panelPaths = `
        <rect x="40" y="50" width="520" height="380" rx="8" fill="var(--bg-surface)" stroke="${palette.primary}" stroke-width="2" opacity="0.5"/>
        <rect x="40" y="450" width="245" height="280" rx="8" fill="var(--bg-surface)" stroke="${palette.primary}" stroke-width="2" opacity="0.4"/>
        <rect x="315" y="450" width="245" height="280" rx="8" fill="var(--bg-surface)" stroke="${palette.primary}" stroke-width="2" opacity="0.4"/>
      `;
    } else if (seed === 2) {
      panelPaths = `
        <rect x="40" y="50" width="520" height="210" rx="8" fill="var(--bg-surface)" stroke="${palette.primary}" stroke-width="2" opacity="0.4"/>
        <rect x="40" y="285" width="520" height="210" rx="8" fill="var(--bg-surface)" stroke="${palette.primary}" stroke-width="2" opacity="0.4"/>
        <rect x="40" y="520" width="520" height="210" rx="8" fill="var(--bg-surface)" stroke="${palette.primary}" stroke-width="2" opacity="0.4"/>
      `;
    } else {
      panelPaths = `
        <rect x="40" y="50" width="520" height="680" rx="12" fill="var(--bg-surface)" stroke="${palette.primary}" stroke-width="3" opacity="0.6"/>
        <circle cx="300" cy="320" r="140" fill="${palette.primary}" opacity="0.12"/>
        <path d="M120 480 Q300 280 480 480" stroke="${palette.accent}" stroke-width="4" fill="none" opacity="0.5" stroke-dasharray="8 8"/>
      `;
    }

    const detailBadge = isFullRes 
      ? `<text x="300" y="770" text-anchor="middle" fill="${palette.accent}" font-size="14" font-weight="bold" font-family="monospace">FULL-RESOLUTION SOURCE (2400x3200 px)</text>`
      : `<text x="300" y="770" text-anchor="middle" fill="var(--text-muted)" font-size="12" font-family="monospace">${page.filename}</text>`;

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" class="page-svg-content" aria-label="Page ${page.index} Preview">
        <defs>
          <linearGradient id="grad-${book.id}-${page.index}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${palette.primary}" stop-opacity="0.15" />
            <stop offset="100%" stop-color="${palette.secondary}" stop-opacity="0.05" />
          </linearGradient>
          <pattern id="grid-${book.id}-${page.index}" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--border-color)" stroke-width="0.5" opacity="0.3"/>
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="var(--placeholder-bg)" />
        <rect width="100%" height="100%" fill="url(#grad-${book.id}-${page.index})" />
        <rect width="100%" height="100%" fill="url(#grid-${book.id}-${page.index})" />
        <rect x="20" y="20" width="560" height="760" rx="8" fill="none" stroke="var(--placeholder-border)" stroke-width="1" stroke-dasharray="4 4" opacity="0.6"/>

        ${panelPaths}

        <g transform="translate(300, 390)">
          <rect x="-80" y="-35" width="160" height="70" rx="12" fill="var(--bg-surface)" stroke="${palette.primary}" stroke-width="2" />
          <text x="0" y="-4" text-anchor="middle" fill="var(--text-primary)" font-size="20" font-weight="bold" font-family="sans-serif">PAGE ${page.index}</text>
          <text x="0" y="18" text-anchor="middle" fill="${palette.accent}" font-size="12" font-family="monospace">${page.rawName}</text>
        </g>

        <text x="40" y="42" fill="var(--text-muted)" font-size="12" font-weight="600" font-family="sans-serif" letter-spacing="1">${book.title.toUpperCase()} • PAGE ${page.index} OF ${book.pageCount}</text>
        ${detailBadge}
      </svg>
    `;
  },

  /**
   * Generates SVG or Image for Book Cover Thumbnail
   */
  createBookCoverSvg(book) {
    if (book.isMissing) {
      return this.createMissingBookCoverSvg(book);
    }

    if (book.coverSrc) {
      const resolvedCover = window.APP_CONFIG ? window.APP_CONFIG.resolveMediaUrl(book.coverSrc) : book.coverSrc;
      return `
        <div class="book-cover-img-box">
          <img src="${resolvedCover}" alt="${book.title} Cover" class="book-cover-real-img" loading="lazy">
          <div class="book-cover-real-overlay">
            <span class="cover-overlay-title">${book.title}</span>
            <span class="cover-overlay-pages">${book.pageCount} Pages</span>
          </div>
        </div>
      `;
    }

    const palette = book.palette;
    const width = 300;
    const height = 400;

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" class="book-cover-svg">
        <defs>
          <linearGradient id="cover-grad-${book.id}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${palette.primary}" />
            <stop offset="100%" stop-color="${palette.secondary}" />
          </linearGradient>
        </defs>

        <rect width="100%" height="100%" fill="url(#cover-grad-${book.id})" />
        <circle cx="230" cy="80" r="120" fill="#ffffff" opacity="0.1" />
        <circle cx="50" cy="320" r="90" fill="#000000" opacity="0.15" />
        <rect x="30" y="40" width="240" height="320" rx="8" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.25"/>
        <rect x="0" y="0" width="14" height="100%" fill="#ffffff" opacity="0.2" />

        <g transform="translate(150, 180)">
          <rect x="-100" y="-45" width="200" height="90" rx="10" fill="rgba(0,0,0,0.4)" backdrop-filter="blur(4px)"/>
          <text x="0" y="-10" text-anchor="middle" fill="#ffffff" font-size="24" font-weight="800" font-family="sans-serif">${book.title.toUpperCase()}</text>
          <text x="0" y="15" text-anchor="middle" fill="${palette.accent}" font-size="12" font-weight="600" font-family="sans-serif" letter-spacing="2">${book.genre.toUpperCase()}</text>
          <text x="0" y="32" text-anchor="middle" fill="#ffffff" font-size="11" opacity="0.8" font-family="sans-serif">${book.pageCount} PAGES</text>
        </g>

        <text x="150" y="375" text-anchor="middle" fill="#ffffff" font-size="10" font-family="monospace" opacity="0.7">REF: BOOK-${book.id.toString().padStart(2, '0')}</text>
      </svg>
    `;
  },

  createMissingBookCoverSvg(book) {
    const width = 300;
    const height = 400;

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" class="book-cover-svg missing-cover-svg">
        <defs>
          <linearGradient id="missing-grad-${book.id}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#1e293b" />
            <stop offset="100%" stop-color="#0f172a" />
          </linearGradient>
        </defs>

        <rect width="100%" height="100%" fill="url(#missing-grad-${book.id})" />
        <rect x="20" y="20" width="260" height="360" rx="12" fill="none" stroke="#f59e0b" stroke-width="2" stroke-dasharray="6 6" opacity="0.8"/>
        
        <!-- Google Drive / Warning Badge Icon -->
        <g transform="translate(150, 140)">
          <circle cx="0" cy="0" r="42" fill="rgba(245, 158, 11, 0.15)" stroke="#f59e0b" stroke-width="2" />
          <!-- Cloud / Drive Graphic -->
          <path d="M-16 10 C-22 10 -25 5 -22 -1 C-20 -6 -13 -8 -9 -5 C-6 -12 4 -12 7 -5 C12 -7 18 -4 18 2 C22 3 22 10 16 10 Z" fill="none" stroke="#fcd34d" stroke-width="2.5" stroke-linejoin="round"/>
          <path d="M-4 2 L0 -4 L4 2 M0 -4 L0 10" fill="none" stroke="#fcd34d" stroke-width="2.5" stroke-linecap="round"/>
        </g>

        <!-- Message Overlay -->
        <g transform="translate(150, 250)">
          <rect x="-115" y="-32" width="230" height="64" rx="10" fill="rgba(15, 23, 42, 0.9)" stroke="rgba(245, 158, 11, 0.6)" stroke-width="1.5"/>
          <text x="0" y="-8" text-anchor="middle" fill="#ffffff" font-size="16" font-weight="700" font-family="sans-serif">${book.title.toUpperCase()}</text>
          <text x="0" y="14" text-anchor="middle" fill="#fcd34d" font-size="11" font-weight="700" font-family="sans-serif" letter-spacing="1">PENDING DRIVE SHARE</text>
        </g>

        <text x="150" y="335" text-anchor="middle" fill="#94a3b8" font-size="11" font-family="sans-serif" font-weight="500">Needs to be shared to</text>
        <text x="150" y="352" text-anchor="middle" fill="#f59e0b" font-size="12" font-family="sans-serif" font-weight="700">Google Drive folder</text>
      </svg>
    `;
  },

  /**
   * Generates SVG for Podcast Cover Art
   */
  createPodcastCoverSvg(podcast) {
    const palette = podcast.palette || { primary: "#10b981", secondary: "#059669", accent: "#6ee7b7" };
    const width = 500;
    const height = 500; // Square cover art

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" class="podcast-cover-svg">
        <defs>
          <linearGradient id="pod-grad-${podcast.id}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${palette.primary}" />
            <stop offset="100%" stop-color="${palette.secondary}" />
          </linearGradient>
        </defs>

        <rect width="100%" height="100%" fill="url(#pod-grad-${podcast.id})" />
        
        <!-- Audio Waves Graphic -->
        <g stroke="${palette.accent}" stroke-width="4" stroke-linecap="round" opacity="0.4">
          <line x1="80" y1="200" x2="80" y2="300" />
          <line x1="120" y1="140" x2="120" y2="360" />
          <line x1="160" y1="100" x2="160" y2="400" />
          <line x1="200" y1="180" x2="200" y2="320" />
          <line x1="300" y1="160" x2="300" y2="340" />
          <line x1="340" y1="100" x2="340" y2="400" />
          <line x1="380" y1="150" x2="380" y2="350" />
          <line x1="420" y1="210" x2="420" y2="290" />
        </g>

        <!-- Central Microphone Icon Badge -->
        <g transform="translate(250, 210)">
          <circle cx="0" cy="0" r="60" fill="rgba(0, 0, 0, 0.4)" stroke="#ffffff" stroke-width="3"/>
          <path d="M-12 -15 a12 12 0 0 1 24 0 v20 a12 12 0 0 1 -24 0 z" fill="#ffffff"/>
          <path d="M-22 5 a22 22 0 0 0 44 0" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>
          <line x1="0" y1="27" x2="0" y2="40" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>
          <line x1="-15" y1="40" x2="15" y2="40" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>
        </g>

        <!-- Podcast Title Overlay -->
        <g transform="translate(250, 390)">
          <rect x="-210" y="-45" width="420" height="90" rx="16" fill="rgba(15, 23, 42, 0.85)" stroke="${palette.accent}" stroke-width="1.5"/>
          <text x="0" y="-8" text-anchor="middle" fill="#ffffff" font-size="22" font-weight="800" font-family="sans-serif">${podcast.podcastName.toUpperCase()}</text>
          <text x="0" y="20" text-anchor="middle" fill="${palette.accent}" font-size="13" font-weight="600" font-family="sans-serif" letter-spacing="2">HOSTED BY ${podcast.hostName.toUpperCase()}</text>
        </g>
      </svg>
    `;
  },

  /**
   * Helper SVG icons for Stream & Support logos
   */
  getSupportLogoSvg(logoName) {
    switch (logoName.toLowerCase()) {
      case 'patreon':
        return `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M15.386 0c-4.764 0-8.64 3.876-8.64 8.64 0 4.75 3.876 8.613 8.64 8.613 4.75 0 8.614-3.864 8.614-8.613C24 3.876 20.136 0 15.386 0zM0 24h3.6V0H0v24z"/></svg>`;
      case 'venmo':
        return `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19.5 2h-4.3c-.8 0-1.5.4-1.9 1.1L8.2 12.8 5.6 3.1C5.4 2.4 4.7 2 4 2H.8c-.5 0-.9.5-.7 1l4.9 17.5c.3 1.1 1.3 1.9 2.5 1.9h4.3c.8 0 1.5-.4 1.9-1.1l5.4-9.8 2.6 9.7c.2.7.9 1.2 1.6 1.2h3.3c.5 0 .9-.5.7-1L20.2 3c-.2-1-1.2-1-2.2-1z"/></svg>`;
      case 'cashapp':
        return `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm2.84 14.93c-.45.47-1.07.75-1.78.85v1.27h-2.12v-1.24c-1.23-.22-2.11-.96-2.3-2.06h1.94c.16.4.52.69 1.05.69.57 0 .98-.28.98-.67 0-.46-.38-.64-1.24-.87-1.39-.37-2.61-.84-2.61-2.3 0-1.08.79-1.91 2.18-2.15V8.18h2.12v1.28c1.07.2 1.83.87 2.05 1.84h-1.91c-.13-.39-.46-.64-.95-.64-.51 0-.85.24-.85.6 0 .42.34.58 1.17.8 1.54.41 2.67.92 2.67 2.38 0 1.18-.8 1.96-2.4 2.22z"/></svg>`;
      case 'paypal':
        return `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.77.77 0 0 1 .761-.643h6.611c2.408 0 4.298.547 5.253 1.62.903 1.013 1.127 2.457.666 4.294-.652 2.59-2.28 4.218-4.838 4.838-.636.155-1.353.228-2.13.228H8.814l-1.105 7.022a.641.641 0 0 1-.633.538z"/></svg>`;
      case 'coffee':
        return `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zm0 5h-2V5h2v3zM2 21h20v2H2z"/></svg>`;
      default:
        return `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 14.93V18h-2v-1.07c-1.84-.4-3-1.83-3-3.93h2c0 1.28.84 2 2 2s2-.72 2-2c0-2-3-2.25-3-4.5 0-1.9 1.14-3.3 3-3.7V5h2v1.07c1.7.34 2.8 1.66 2.8 3.43h-2c0-1.05-.72-1.7-1.8-1.7s-1.8.65-1.8 1.6c0 1.8 3 2.05 3 4.4 0 2.03-1.2 3.4-3.2 3.73z"/></svg>`;
    }
  }
};
