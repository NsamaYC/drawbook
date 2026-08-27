/**
 * LuminaVault SPA Router
 * Hash-based router supporting:
 * - Books Index: `/#/` or `""`
 * - Book Route: `/#/book/:id` (e.g. `/#/book/14`)
 * - Podcasts Hub: `/#/podcasts`
 * - Podcast Route: `/#/podcast/:id` or `/#/podcast/:slug` (e.g. `/#/podcast/1`)
 * - TAOC Index: `/#/taoc`
 * - TAOC Batch Route: `/#/taoc/:id` (e.g. `/#/taoc/3`)
 */

window.Router = {
  routes: {},
  currentRoute: null,

  init() {
    window.addEventListener('hashchange', () => this.handleRoute());
    window.addEventListener('load', () => this.handleRoute());
  },

  /**
   * Register route patterns and callback functions
   */
  register(pattern, callback) {
    this.routes[pattern] = callback;
  },

  /**
   * Parse hash URL and execute matching handler
   */
  handleRoute() {
    const hash = window.location.hash || '#/';
    const cleanHash = hash.replace(/^#/, '');

    // Check for Book Detail route pattern: `/book/:id`
    const bookMatch = cleanHash.match(/^\/book\/(\d+)$/);
    if (bookMatch) {
      const bookId = parseInt(bookMatch[1], 10);
      if (this.routes['/book/:id']) {
        this.currentRoute = { path: '/book/:id', params: { id: bookId } };
        this.routes['/book/:id'](bookId);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    // Check for TAOC Batch Detail route pattern: `/taoc/:id`
    const taocMatch = cleanHash.match(/^\/taoc\/(\d+)$/);
    if (taocMatch) {
      const batchId = parseInt(taocMatch[1], 10);
      if (this.routes['/taoc/:id']) {
        this.currentRoute = { path: '/taoc/:id', params: { id: batchId } };
        this.routes['/taoc/:id'](batchId);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    // Check for TAOC Index: `/taoc`
    if (cleanHash === '/taoc' && this.routes['/taoc']) {
      this.currentRoute = { path: '/taoc', params: {} };
      this.routes['/taoc']();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Check for Podcast Landing Page route pattern: `/podcast/:id`
    const podcastMatch = cleanHash.match(/^\/podcast\/([^\/]+)$/);
    if (podcastMatch) {
      const param = podcastMatch[1];
      if (this.routes['/podcast/:id']) {
        this.currentRoute = { path: '/podcast/:id', params: { id: param } };
        this.routes['/podcast/:id'](param);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    // Check for Podcasts Mainpage Hub: `/podcasts`
    if (cleanHash === '/podcasts' && this.routes['/podcasts']) {
      this.currentRoute = { path: '/podcasts', params: {} };
      this.routes['/podcasts']();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Default to Books Index / Library route
    if (this.routes['/']) {
      this.currentRoute = { path: '/', params: {} };
      this.routes['/']();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  },

  /**
   * Programmatically navigate to a route
   */
  navigate(path) {
    window.location.hash = path;
  }
};
