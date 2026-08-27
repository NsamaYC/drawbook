/**
 * LuminaVault / Drawbook Window Virtualization Grid Engine
 * 
 * High-performance vanilla JavaScript virtual grid for large collections (300+ images).
 * Features:
 * - Dynamic responsive columns (1-col single mode, 2-col mobile, 3-col tablet, 4-col desktop)
 * - Overscan buffering (renders extra rows above/below viewport to eliminate scroll pop-in)
 * - Absolute positioning with GPU-accelerated translate3d transforms
 * - Lightweight skeleton & shimmer placeholder states for rapid scrubbing
 * - Direct scrollToOffset & scrollToIndex mapping for precision touch scrubbing
 * - 60fps requestAnimationFrame scroll scheduling
 */

class VirtualGrid {
  /**
   * @param {Object} options
   * @param {HTMLElement} options.container - The wrapper DOM element
   * @param {Array} options.items - Array of item data objects
   * @param {Function} options.renderItem - Callback returning HTML string for an item
   * @param {Function} [options.onItemClick] - Click handler callback (item, index, event)
   * @param {string} [options.viewMode='grid'] - 'grid' or 'single'
   * @param {number} [options.overscan=3] - Number of extra rows to render above and below
   * @param {number} [options.aspectRatio=0.75] - Width/Height ratio of image box (3/4 = 0.75)
   * @param {number} [options.footerHeight=44] - Approximate footer height in px
   * @param {number} [options.gap=16] - Gap between grid items in px
   */
  constructor(options) {
    this.container = options.container;
    this.items = options.items || [];
    this.renderItem = options.renderItem;
    this.onItemClick = options.onItemClick || null;
    this.viewMode = options.viewMode || 'grid';
    this.overscan = options.overscan !== undefined ? options.overscan : 3;
    this.aspectRatio = options.aspectRatio || 0.75; // 3:4
    this.footerHeight = options.footerHeight || 44;
    this.gap = options.gap || 16;

    this.cols = 4;
    this.colWidth = 250;
    this.cardHeight = 350;
    this.rowHeight = 366;
    this.totalRows = 0;
    this.totalHeight = 0;

    this.renderedIndices = new Set();
    this.domNodes = new Map(); // index -> HTMLElement

    this.isTicking = false;
    this.resizeObserver = null;
    this.onScrollBound = this.onScroll.bind(this);
    this.onResizeBound = this.onResize.bind(this);

    this.init();
  }

  init() {
    this.container.classList.add('virtual-grid-container');
    this.container.innerHTML = `
      <div class="virtual-grid-spacer" style="position: relative; width: 100%; min-height: 100px;">
        <div class="virtual-grid-content" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0;"></div>
      </div>
    `;

    this.spacer = this.container.querySelector('.virtual-grid-spacer');
    this.content = this.container.querySelector('.virtual-grid-content');

    this.measure();
    this.render();

    window.addEventListener('scroll', this.onScrollBound, { passive: true });
    window.addEventListener('resize', this.onResizeBound, { passive: true });

    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(() => {
        this.measure();
        this.render(true);
      });
      this.resizeObserver.observe(this.container);
    }
  }

  /**
   * Measure dimensions and compute column count & item dimensions
   */
  measure() {
    const width = this.container.clientWidth || window.innerWidth;
    const isSingle = this.viewMode === 'single';

    if (isSingle) {
      this.cols = 1;
      this.gap = 20;
    } else if (width <= 540) {
      this.cols = 2;
      this.gap = 12;
    } else if (width <= 840) {
      this.cols = 2;
      this.gap = 16;
    } else if (width <= 1140) {
      this.cols = 3;
      this.gap = 18;
    } else {
      this.cols = 4;
      this.gap = 20;
    }

    const totalGaps = (this.cols - 1) * this.gap;
    this.colWidth = Math.floor((width - totalGaps) / this.cols);
    
    // Image height based on 3:4 aspect ratio (width / 0.75) + footer height
    const imgHeight = Math.round(this.colWidth / this.aspectRatio);
    this.cardHeight = imgHeight + this.footerHeight;
    this.rowHeight = this.cardHeight + this.gap;

    this.totalRows = Math.ceil(this.items.length / this.cols);
    this.totalHeight = Math.max(100, this.totalRows * this.rowHeight - this.gap);

    if (this.spacer) {
      this.spacer.style.height = `${this.totalHeight}px`;
    }
  }

  /**
   * Main virtual rendering loop
   * @param {boolean} force - Whether to force re-render of all items
   */
  render(force = false) {
    if (!this.container || !this.items.length) return;

    const containerRect = this.container.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    // Calculate container relative scroll offset
    const scrollTop = Math.max(0, -containerRect.top);
    const scrollBottom = scrollTop + viewportHeight;

    const startRow = Math.max(0, Math.floor(scrollTop / this.rowHeight) - this.overscan);
    const endRow = Math.min(this.totalRows - 1, Math.ceil(scrollBottom / this.rowHeight) + this.overscan);

    const startIndex = Math.max(0, startRow * this.cols);
    const endIndex = Math.min(this.items.length - 1, (endRow + 1) * this.cols - 1);

    const nextIndices = new Set();
    for (let i = startIndex; i <= endIndex; i++) {
      nextIndices.add(i);
    }

    // Remove nodes that are no longer in the visible range
    if (force) {
      this.content.innerHTML = '';
      this.domNodes.clear();
      this.renderedIndices.clear();
    } else {
      for (const idx of this.renderedIndices) {
        if (!nextIndices.has(idx)) {
          const node = this.domNodes.get(idx);
          if (node && node.parentNode) {
            node.parentNode.removeChild(node);
          }
          this.domNodes.delete(idx);
        }
      }
    }

    // Mount or update nodes in the visible range
    const fragment = document.createDocumentFragment();

    for (let idx = startIndex; idx <= endIndex; idx++) {
      const row = Math.floor(idx / this.cols);
      const col = idx % this.cols;
      const x = col * (this.colWidth + this.gap);
      const y = row * this.rowHeight;

      if (!this.domNodes.has(idx)) {
        const item = this.items[idx];
        const itemHtml = this.renderItem(item, idx);

        const temp = document.createElement('div');
        temp.innerHTML = itemHtml.trim();
        const node = temp.firstElementChild;

        if (node) {
          node.style.position = 'absolute';
          node.style.top = '0';
          node.style.left = '0';
          node.style.width = `${this.colWidth}px`;
          node.style.height = `${this.cardHeight}px`;
          node.style.transform = `translate3d(${x}px, ${y}px, 0)`;
          node.style.willChange = 'transform';
          node.setAttribute('data-virtual-index', idx);

          if (this.onItemClick) {
            const handleItemClick = (e) => {
              this.onItemClick(item, idx, e);
            };
            node.addEventListener('click', handleItemClick);
            node.addEventListener('keydown', (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleItemClick(e);
              }
            });
          }

          this.domNodes.set(idx, node);
          fragment.appendChild(node);
        }
      } else {
        const node = this.domNodes.get(idx);
        if (node) {
          node.style.width = `${this.colWidth}px`;
          node.style.height = `${this.cardHeight}px`;
          node.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        }
      }
    }

    if (fragment.childNodes.length > 0) {
      this.content.appendChild(fragment);
    }

    this.renderedIndices = nextIndices;
  }

  onScroll() {
    if (!this.isTicking) {
      this.isTicking = true;
      requestAnimationFrame(() => {
        this.render();
        this.isTicking = false;
      });
    }
  }

  onResize() {
    this.measure();
    this.render(true);
  }

  /**
   * Set view mode ('grid' or 'single')
   */
  setViewMode(mode) {
    if (this.viewMode === mode) return;
    this.viewMode = mode;
    this.measure();
    this.render(true);
  }

  /**
   * Scroll to a specific item index
   * @param {number} index - 0-based item index
   * @param {string} [behavior='auto'] - 'auto' or 'smooth'
   */
  scrollToIndex(index, behavior = 'auto') {
    const clampedIndex = Math.max(0, Math.min(this.items.length - 1, index));
    const row = Math.floor(clampedIndex / this.cols);
    const itemTop = row * this.rowHeight;
    const containerTop = this.container.getBoundingClientRect().top + window.scrollY;
    const targetScrollY = Math.max(0, containerTop + itemTop - 80); // 80px offset for header

    window.scrollTo({
      top: targetScrollY,
      behavior
    });

    this.render();
  }

  /**
   * Scroll directly to a pixel offset within the virtual container
   * @param {number} offsetInContainer - Y pixel offset from top of virtual list
   */
  scrollToOffset(offsetInContainer) {
    const containerTop = this.container.getBoundingClientRect().top + window.scrollY;
    const targetScrollY = Math.max(0, containerTop + offsetInContainer - 80);

    window.scrollTo({
      top: targetScrollY,
      behavior: 'auto'
    });

    this.render();
  }

  /**
   * Calculate current scroll percentage (0.0 to 1.0)
   */
  getScrollProgress() {
    const containerRect = this.container.getBoundingClientRect();
    const scrollTop = Math.max(0, -containerRect.top);
    const maxScroll = Math.max(1, this.totalHeight - window.innerHeight + 160);
    return Math.max(0, Math.min(1, scrollTop / maxScroll));
  }

  /**
   * Get total virtual height
   */
  getTotalHeight() {
    return this.totalHeight;
  }

  /**
   * Get item count
   */
  getItemCount() {
    return this.items.length;
  }

  /**
   * Destroy instance & clean listeners
   */
  destroy() {
    window.removeEventListener('scroll', this.onScrollBound);
    window.removeEventListener('resize', this.onResizeBound);
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    this.domNodes.clear();
    this.renderedIndices.clear();
    if (this.container) {
      this.container.innerHTML = '';
      this.container.classList.remove('virtual-grid-container');
    }
  }
}

window.VirtualGrid = VirtualGrid;
