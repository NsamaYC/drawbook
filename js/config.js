/**
 * LuminaVault Application Configuration
 * Manages media storage settings (AWS S3 / CloudFront CDN URL)
 */
(function() {
  const STORAGE_KEY = 'lumina_s3_base_url';

  window.APP_CONFIG = {
    // Default S3 Base URL pre-configured for your bucket:
    defaultMediaBaseUrl: 'https://drawbook-016355331017-us-east-1-an.s3.us-east-1.amazonaws.com',

    /**
     * Get active Media Base URL (checks LocalStorage first, then default configuration)
     */
    getMediaBaseUrl() {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null && stored.trim() !== '') {
        return stored.trim().replace(/\/+$/, '');
      }
      return this.defaultMediaBaseUrl ? this.defaultMediaBaseUrl.trim().replace(/\/+$/, '') : '';
    },

    /**
     * Set Media Base URL in LocalStorage
     */
    setMediaBaseUrl(url) {
      if (!url || url.trim() === '') {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        const cleaned = url.trim().replace(/\/+$/, '');
        localStorage.setItem(STORAGE_KEY, cleaned);
      }
    },

    /**
     * Reset Media Base URL to default
     */
    resetMediaBaseUrl() {
      localStorage.removeItem(STORAGE_KEY);
    },

    /**
     * Resolve full URL for a media asset relative path
     * e.g., 'book1/book1p113.JPG' -> 'https://drawbook-016355331017-us-east-1-an.s3.us-east-1.amazonaws.com/book1/book1p113.JPG'
     */
    resolveMediaUrl(relativePath) {
      if (!relativePath) return '';
      // If path is already absolute, return as-is
      if (/^(https?:)?\/\//i.test(relativePath)) {
        return relativePath;
      }
      const baseUrl = this.getMediaBaseUrl();
      if (!baseUrl) {
        return relativePath;
      }
      const cleanBase = baseUrl.replace(/\/+$/, '');
      const cleanPath = relativePath.replace(/^\/+/, '');
      return `${cleanBase}/${cleanPath}`;
    }
  };
})();
