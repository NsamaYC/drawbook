/**
 * LuminaVault Application Configuration
 * Manages S3/CloudFront media base URL for offloading large image collections.
 */

window.APP_CONFIG = {
  _STORAGE_KEY: 'lumina_s3_base_url',

  /**
   * Get the currently configured S3 media base URL
   * @returns {string|null} The base URL or null if using local paths
   */
  getMediaBaseUrl() {
    return localStorage.getItem(this._STORAGE_KEY) || null;
  },

  /**
   * Set the S3 media base URL
   * @param {string} url - The base URL (e.g. https://bucket.s3.amazonaws.com)
   */
  setMediaBaseUrl(url) {
    const cleanUrl = url.replace(/\/+$/, ''); // strip trailing slashes
    localStorage.setItem(this._STORAGE_KEY, cleanUrl);
  },

  /**
   * Reset to local file paths (remove S3 config)
   */
  resetMediaBaseUrl() {
    localStorage.removeItem(this._STORAGE_KEY);
  },

  /**
   * Resolve a relative media path to full URL
   * If S3 base URL is set, prepends it; otherwise returns the local relative path.
   * @param {string} relativePath - e.g. "book1/book1p113.JPG" or "theartofceilings/TAOC-0001.jpg"
   * @returns {string} Resolved URL or local path
   */
  resolveMediaUrl(relativePath) {
    const baseUrl = this.getMediaBaseUrl();
    if (baseUrl) {
      return `${baseUrl}/${relativePath}`;
    }
    return relativePath;
  }
};
