/**
 * PDF to EPUB Pro - In-Browser EPUB Previewer & Reader
 * Allows instant verification, chapter inspection, and reflow checking
 */

class EPUBPreviewer {
  constructor() {
    this.currentBook = null;
    this.currentChapterIndex = 0;
    this.fontSize = 18; // px
    this.theme = 'dark'; // dark, sepia, light

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.modal = document.getElementById('previewModal');
    this.bookTitleEl = document.getElementById('readerBookTitle');
    this.tocListEl = document.getElementById('readerTocList');
    this.viewportEl = document.getElementById('readerViewport');
    this.sheetEl = document.getElementById('readerSheet');
    this.pageIndicatorEl = document.getElementById('readerPageIndicator');
    this.prevBtn = document.getElementById('readerPrevChapter');
    this.nextBtn = document.getElementById('readerNextChapter');
    this.closeBtn = document.getElementById('readerCloseBtn');
    this.tocToggleBtn = document.getElementById('readerToggleToc');
    this.tocSidebar = document.getElementById('readerTocSidebar');

    this.fontSmallerBtn = document.getElementById('readerFontSmaller');
    this.fontLargerBtn = document.getElementById('readerFontLarger');
  }

  bindEvents() {
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }

    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', () => this.navigateChapter(-1));
    }

    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', () => this.navigateChapter(1));
    }

    if (this.tocToggleBtn) {
      this.tocToggleBtn.addEventListener('click', () => {
        this.tocSidebar.classList.toggle('collapsed');
      });
    }

    if (this.fontSmallerBtn) {
      this.fontSmallerBtn.addEventListener('click', () => {
        if (this.fontSize > 13) {
          this.fontSize -= 2;
          this.sheetEl.style.fontSize = `${this.fontSize}px`;
        }
      });
    }

    if (this.fontLargerBtn) {
      this.fontLargerBtn.addEventListener('click', () => {
        if (this.fontSize < 32) {
          this.fontSize += 2;
          this.sheetEl.style.fontSize = `${this.fontSize}px`;
        }
      });
    }

    // Theme switches
    const themePills = document.querySelectorAll('.theme-pill');
    themePills.forEach(pill => {
      pill.addEventListener('click', (e) => {
        const theme = e.target.dataset.theme;
        this.setTheme(theme);
        themePills.forEach(p => p.classList.remove('active'));
        e.target.classList.add('active');
      });
    });

    // Keyboard navigation
    window.addEventListener('keydown', (e) => {
      if (!this.modal || !this.modal.classList.contains('active')) return;
      if (e.key === 'Escape') this.close();
      if (e.key === 'ArrowRight') this.navigateChapter(1);
      if (e.key === 'ArrowLeft') this.navigateChapter(-1);
    });
  }

  setTheme(themeName) {
    this.theme = themeName;
    this.viewportEl.className = `reader-viewport-container theme-${themeName}`;
  }

  /**
   * Open and display book in previewer
   * @param {Object} bookData - { title, chapters, coverDataUrl, hasCover }
   */
  open(bookData) {
    this.currentBook = bookData;
    this.currentChapterIndex = 0;

    if (this.bookTitleEl) {
      this.bookTitleEl.textContent = bookData.title || 'EPUB Preview';
    }

    this.renderToc();
    this.renderCurrentChapter();

    if (this.modal) {
      this.modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  close() {
    if (this.modal) {
      this.modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  renderToc() {
    if (!this.tocListEl || !this.currentBook) return;
    this.tocListEl.innerHTML = '';

    const items = [];
    if (this.currentBook.hasCover) {
      items.push({ type: 'cover', title: 'Cover Page' });
    }

    this.currentBook.chapters.forEach((chap, idx) => {
      items.push({ type: 'chapter', title: chap.title || `Chapter ${idx + 1}`, index: idx });
    });

    items.forEach((item, displayIdx) => {
      const li = document.createElement('li');
      li.className = `toc-item ${displayIdx === 0 ? 'active' : ''}`;
      li.textContent = item.title;
      li.addEventListener('click', () => {
        this.currentChapterIndex = item.type === 'cover' ? -1 : item.index;
        this.renderCurrentChapter();
        this.updateActiveTocItem();
      });
      this.tocListEl.appendChild(li);
    });
  }

  updateActiveTocItem() {
    const items = this.tocListEl.querySelectorAll('.toc-item');
    items.forEach(item => item.classList.remove('active'));

    const offset = this.currentBook.hasCover ? 1 : 0;
    const targetIdx = this.currentChapterIndex === -1 ? 0 : this.currentChapterIndex + offset;
    if (items[targetIdx]) {
      items[targetIdx].classList.add('active');
      items[targetIdx].scrollIntoView({ block: 'nearest' });
    }
  }

  renderCurrentChapter() {
    if (!this.sheetEl || !this.currentBook) return;

    this.viewportEl.scrollTop = 0;
    const totalChapters = this.currentBook.chapters.length;

    // Cover Page
    if (this.currentChapterIndex === -1) {
      this.sheetEl.innerHTML = `
        <div style="text-align:center; padding: 20px 0;">
          <h1 style="margin-bottom: 24px;">${this.escapeHtml(this.currentBook.title)}</h1>
          ${this.currentBook.coverDataUrl ? `<img src="${this.currentBook.coverDataUrl}" alt="Cover" style="max-height: 540px; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); margin: 0 auto;"/>` : '<p style="color:var(--text-muted)">Cover Image</p>'}
        </div>
      `;
      this.pageIndicatorEl.textContent = `Cover`;
      this.prevBtn.disabled = true;
      this.nextBtn.disabled = totalChapters === 0;
      this.updateActiveTocItem();
      return;
    }

    const chapter = this.currentBook.chapters[this.currentChapterIndex];
    if (!chapter) return;

    this.sheetEl.innerHTML = `
      <h1>${this.escapeHtml(chapter.title)}</h1>
      <div class="chapter-body-content">
        ${chapter.contentHtml}
      </div>
    `;

    this.pageIndicatorEl.textContent = `Chapter ${this.currentChapterIndex + 1} of ${totalChapters}`;
    
    // Update button states
    const hasCover = this.currentBook.hasCover;
    this.prevBtn.disabled = !hasCover && this.currentChapterIndex === 0;
    this.nextBtn.disabled = this.currentChapterIndex >= totalChapters - 1;

    this.updateActiveTocItem();
  }

  navigateChapter(delta) {
    const totalChapters = this.currentBook.chapters.length;
    const minIndex = this.currentBook.hasCover ? -1 : 0;
    const nextIndex = this.currentChapterIndex + delta;

    if (nextIndex >= minIndex && nextIndex < totalChapters) {
      this.currentChapterIndex = nextIndex;
      this.renderCurrentChapter();
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

window.EPUBPreviewer = EPUBPreviewer;
