/**
 * LuminaVault / Drawbook Precision Touch-Scrubber
 * 
 * iOS Keyboard "Trackpad Mode" inspired precision vertical scrubber for mobile web image galleries.
 * 
 * Features:
 * - Mobile-Only: Initialized and rendered only on touch-capable devices
 * - Floating Trigger: Pill-shaped handle & subtle vertical track on the right edge
 * - Touch Hijacking: Disables standard scroll (touch-action: none, e.preventDefault()) while scrubbing
 * - Precision Math: Maps touch Y percentage (0-100%) directly to virtualized gallery offset/index
 * - Precision HUD: Magnifier / floating tooltip displaying current image number, title, and progress
 * - 60fps rAF: Smooth animation frame throttling preventing frame drops during rapid sweeps
 * - Haptic feedback integration
 */

class PrecisionTouchScrubber {
  /**
   * @param {Object} options
   * @param {VirtualGrid} options.virtualGrid - The active VirtualGrid instance
   * @param {string} [options.title='Gallery'] - Gallery or Book/Batch title for the HUD
   * @param {Array} options.items - Array of items to display metadata in HUD
   */
  constructor(options) {
    this.virtualGrid = options.virtualGrid;
    this.title = options.title || 'Gallery';
    this.items = options.items || [];

    this.isTouchDevice = this.checkTouchDevice();
    this.isScrubbing = false;
    this.currentPercentage = 0;
    this.currentIndex = 0;
    this.lastHapticIndex = -1;

    this.rAFId = null;
    this.pendingTouchY = null;

    // Bound event handlers
    this.onTouchStartBound = this.onTouchStart.bind(this);
    this.onTouchMoveBound = this.onTouchMove.bind(this);
    this.onTouchEndBound = this.onTouchEnd.bind(this);
    this.onWindowScrollBound = this.onWindowScroll.bind(this);

    if (this.isTouchDevice && this.items.length > 0) {
      this.init();
    }
  }

  /**
   * Detect if device supports touch
   */
  checkTouchDevice() {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(hover: none) and (pointer: coarse)').matches
    );
  }

  init() {
    // Clean up any existing scrubber element
    this.removeDom();

    // Create Floating Scrubber UI & Precision HUD Elements
    this.element = document.createElement('div');
    this.element.className = 'precision-scrubber-container';
    this.element.setAttribute('aria-hidden', 'true');
    this.element.innerHTML = `
      <div class="precision-scrubber-track" id="scrubber-track">
        <div class="precision-scrubber-track-line"></div>
        <div class="precision-scrubber-thumb" id="scrubber-thumb">
          <div class="scrubber-thumb-handle">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>

      <div class="precision-hud-indicator" id="precision-hud">
        <div class="precision-hud-card">
          <div class="precision-hud-header">
            <span class="precision-hud-badge">PRECISION SCRUBBER</span>
            <span class="precision-hud-pct" id="hud-pct">0%</span>
          </div>
          <div class="precision-hud-main">
            <div class="precision-hud-index" id="hud-index">#1</div>
            <div class="precision-hud-total" id="hud-total">/ ${this.items.length}</div>
          </div>
          <div class="precision-hud-meta" id="hud-meta">
            <span class="precision-hud-title">${escapeHtml(this.title)}</span>
            <span class="precision-hud-filename" id="hud-filename">${this.items[0] ? this.items[0].filename || this.items[0].title || '' : ''}</span>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.element);

    this.track = this.element.querySelector('#scrubber-track');
    this.thumb = this.element.querySelector('#scrubber-thumb');
    this.hud = this.element.querySelector('#precision-hud');
    this.hudPct = this.element.querySelector('#hud-pct');
    this.hudIndex = this.element.querySelector('#hud-index');
    this.hudFilename = this.element.querySelector('#hud-filename');

    // Attach touch listeners to the track and handle (passive: false for touchmove)
    this.track.addEventListener('touchstart', this.onTouchStartBound, { passive: false });
    window.addEventListener('touchmove', this.onTouchMoveBound, { passive: false });
    window.addEventListener('touchend', this.onTouchEndBound, { passive: false });
    window.addEventListener('touchcancel', this.onTouchEndBound, { passive: false });

    // Sync thumb position on regular page scrolling
    window.addEventListener('scroll', this.onWindowScrollBound, { passive: true });
    this.updateThumbPositionFromScroll();
  }

  /**
   * Touch Start Handler
   */
  onTouchStart(e) {
    if (!this.track || e.touches.length === 0) return;

    this.isScrubbing = true;
    document.body.classList.add('precision-scrubbing-active');
    this.element.classList.add('active');

    // Light haptic pulse
    this.triggerHaptic(12);

    // Initial position calculation
    const touch = e.touches[0];
    this.processTouch(touch.clientY);

    // Prevent default scroll behavior
    e.preventDefault();
  }

  /**
   * Touch Move Handler
   */
  onTouchMove(e) {
    if (!this.isScrubbing || e.touches.length === 0) return;

    // Disable native scroll completely while scrubbing
    e.preventDefault();

    const touch = e.touches[0];
    this.pendingTouchY = touch.clientY;

    if (!this.rAFId) {
      this.rAFId = requestAnimationFrame(() => {
        if (this.pendingTouchY !== null) {
          this.processTouch(this.pendingTouchY);
          this.pendingTouchY = null;
        }
        this.rAFId = null;
      });
    }
  }

  /**
   * Touch End / Cancel Handler
   */
  onTouchEnd(e) {
    if (!this.isScrubbing) return;

    this.isScrubbing = false;
    document.body.classList.remove('precision-scrubbing-active');
    this.element.classList.remove('active');

    if (this.rAFId) {
      cancelAnimationFrame(this.rAFId);
      this.rAFId = null;
    }

    this.triggerHaptic(8);
  }

  /**
   * Calculate touch percentage and map directly to virtual grid scroll & index
   */
  processTouch(clientY) {
    const trackRect = this.track.getBoundingClientRect();
    const trackHeight = trackRect.height;
    
    // Calculate percentage along the track (clamped 0.0 to 1.0)
    const relativeY = clientY - trackRect.top;
    const pct = Math.max(0, Math.min(1, relativeY / trackHeight));
    this.currentPercentage = pct;

    const itemCount = this.items.length;
    if (itemCount === 0) return;

    // Calculate targeted item index
    const targetIndex = Math.min(itemCount - 1, Math.floor(pct * itemCount));
    this.currentIndex = targetIndex;

    // Haptic tick on index milestone change
    if (targetIndex !== this.lastHapticIndex && targetIndex % 5 === 0) {
      this.triggerHaptic(4);
      this.lastHapticIndex = targetIndex;
    }

    // Move thumb visual
    const thumbY = pct * (trackHeight - 48); // 48px thumb height
    this.thumb.style.transform = `translate3d(0, ${thumbY}px, 0)`;

    // Move HUD indicator alongside finger Y (clamped within viewport)
    const hudY = Math.max(80, Math.min(window.innerHeight - 140, clientY - 50));
    this.hud.style.transform = `translate3d(0, ${hudY}px, 0)`;

    // Update HUD feedback text
    const currentItem = this.items[targetIndex];
    const imageNumber = currentItem ? (currentItem.imageNumber || currentItem.index || targetIndex + 1) : targetIndex + 1;
    const filename = currentItem ? (currentItem.filename || currentItem.title || '') : '';
    const status = currentItem && currentItem.status ? (currentItem.status === 'sold' ? ' • SOLD' : ' • FOR SALE') : '';

    this.hudPct.textContent = `${Math.round(pct * 100)}%`;
    this.hudIndex.textContent = `#${imageNumber}`;
    this.hudFilename.textContent = `${filename}${status}`;

    // Map percentage directly to VirtualGrid scrollToOffset or scrollToIndex
    if (this.virtualGrid) {
      const totalVirtualHeight = this.virtualGrid.getTotalHeight();
      const maxScroll = Math.max(1, totalVirtualHeight - window.innerHeight + 160);
      const targetOffset = pct * maxScroll;
      
      this.virtualGrid.scrollToOffset(targetOffset);
    }
  }

  /**
   * Sync the scrubber thumb with standard page scrolling
   */
  onWindowScroll() {
    if (this.isScrubbing) return;
    this.updateThumbPositionFromScroll();
  }

  updateThumbPositionFromScroll() {
    if (!this.track || !this.thumb || !this.virtualGrid) return;
    const progress = this.virtualGrid.getScrollProgress();
    const trackHeight = this.track.clientHeight || (window.innerHeight * 0.7);
    const thumbY = progress * (trackHeight - 48);
    this.thumb.style.transform = `translate3d(0, ${thumbY}px, 0)`;
  }

  /**
   * Haptic vibration feedback
   */
  triggerHaptic(ms = 5) {
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(ms);
      } catch (e) {
        // Ignore haptic errors on unsupported environments
      }
    }
  }

  removeDom() {
    const existing = document.querySelector('.precision-scrubber-container');
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }
  }

  /**
   * Clean up and destroy scrubber
   */
  destroy() {
    window.removeEventListener('touchmove', this.onTouchMoveBound);
    window.removeEventListener('touchend', this.onTouchEndBound);
    window.removeEventListener('touchcancel', this.onTouchEndBound);
    window.removeEventListener('scroll', this.onWindowScrollBound);

    if (this.track) {
      this.track.removeEventListener('touchstart', this.onTouchStartBound);
    }

    if (this.rAFId) {
      cancelAnimationFrame(this.rAFId);
      this.rAFId = null;
    }

    document.body.classList.remove('precision-scrubbing-active');
    this.removeDom();
  }
}

window.PrecisionTouchScrubber = PrecisionTouchScrubber;
