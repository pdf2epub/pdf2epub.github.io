/**
 * PDF to EPUB Pro - Main Application Controller
 * High-performance, client-side batch converter with instant previewing
 */

document.addEventListener('DOMContentLoaded', () => {
  const app = new PDFToEPUBApp();
  window.pdfApp = app;
});

class PDFToEPUBApp {
  constructor() {
    this.extractor = new window.PDFExtractor();
    this.builder = new window.EPUBBuilder();
    this.previewer = new window.EPUBPreviewer();

    this.filesQueue = []; // array of { id, file, status, progress, pages, result, options }
    this.currentOptions = {
      epubVersion: '3.0',
      chapterStrategy: 'auto',
      includeCover: true,
      customTitle: '',
      customAuthor: '',
      fontSizeThreshold: null
    };

    this.initDOM();
    this.bindEvents();
  }

  initDOM() {
    // Dropzone & File Input
    this.dropzone = document.getElementById('dropzone');
    this.fileInput = document.getElementById('fileInput');
    this.selectFilesBtn = document.getElementById('selectFilesBtn');
    this.samplePdfBtn = document.getElementById('samplePdfBtn');

    // Queue Container
    this.queueContainer = document.getElementById('queueContainer');
    this.queueList = document.getElementById('queueList');
    this.queueBadge = document.getElementById('queueBadge');
    this.convertAllBtn = document.getElementById('convertAllBtn');
    this.downloadAllBtn = document.getElementById('downloadAllBtn');
    this.clearAllBtn = document.getElementById('clearAllBtn');

    // Quick Settings
    this.autoConvertSwitch = document.getElementById('autoConvertSwitch');
    this.extractCoverSwitch = document.getElementById('extractCoverSwitch');
    this.btnOpenOptions = document.getElementById('btnOpenOptions');

    // Options Modal
    this.optionsModal = document.getElementById('optionsModal');
    this.optionsCloseBtn = document.getElementById('optionsCloseBtn');
    this.optionsCancelBtn = document.getElementById('optionsCancelBtn');
    this.optionsSaveBtn = document.getElementById('optionsSaveBtn');

    // Form fields
    this.optEpubVersion = document.getElementById('optEpubVersion');
    this.optChapterStrategy = document.getElementById('optChapterStrategy');
    this.optCustomTitle = document.getElementById('optCustomTitle');
    this.optCustomAuthor = document.getElementById('optCustomAuthor');
    this.optCoverExtract = document.getElementById('optCoverExtract');

    // Theme Toggle
    this.themeToggleBtn = document.getElementById('themeToggleBtn');

    // FAQ items
    this.faqItems = document.querySelectorAll('.faq-item');

    // E-reader tabs
    this.readerTabBtns = document.querySelectorAll('.ereader-tab-btn');
    this.readerPanes = document.querySelectorAll('.ereader-pane');
  }

  bindEvents() {
    // File Selection
    this.selectFilesBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.fileInput.click();
    });

    this.dropzone.addEventListener('click', () => {
      this.fileInput.click();
    });

    this.fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        this.handleFiles(Array.from(e.target.files));
        this.fileInput.value = ''; // Reset
      }
    });

    // Drag & Drop
    ['dragenter', 'dragover'].forEach(eventName => {
      this.dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.dropzone.classList.add('drag-active');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      this.dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.dropzone.classList.remove('drag-active');
      }, false);
    });

    this.dropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      if (dt && dt.files && dt.files.length > 0) {
        const files = Array.from(dt.files).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
        if (files.length > 0) {
          this.handleFiles(files);
        } else {
          this.showToast('Please upload valid PDF documents (.pdf)', 'error');
        }
      }
    });

    // Sample PDF Generator
    if (this.samplePdfBtn) {
      this.samplePdfBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.loadSamplePdf();
      });
    }

    // Queue Batch Actions
    this.convertAllBtn.addEventListener('click', () => this.convertAll());
    this.downloadAllBtn.addEventListener('click', () => this.downloadAllAsZip());
    this.clearAllBtn.addEventListener('click', () => this.clearQueue());

    // Quick Switches
    this.extractCoverSwitch.addEventListener('change', (e) => {
      this.currentOptions.includeCover = e.target.checked;
      this.optCoverExtract.checked = e.target.checked;
    });

    // Options Modal
    this.btnOpenOptions.addEventListener('click', () => this.openOptionsModal());
    this.optionsCloseBtn.addEventListener('click', () => this.closeOptionsModal());
    this.optionsCancelBtn.addEventListener('click', () => this.closeOptionsModal());
    this.optionsSaveBtn.addEventListener('click', () => this.saveOptions());

    // Theme Toggle is handled globally by cookie-consent.js

    // FAQ Accordions
    this.faqItems.forEach(item => {
      const questionBtn = item.querySelector('.faq-question');
      questionBtn.addEventListener('click', () => {
        const isActive = item.classList.contains('active');
        this.faqItems.forEach(i => i.classList.remove('active'));
        if (!isActive) {
          item.classList.add('active');
        }
      });
    });

    // E-Reader Tabs
    this.readerTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        this.readerTabBtns.forEach(b => b.classList.remove('active'));
        this.readerPanes.forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`pane-${target}`)?.classList.add('active');
      });
    });
  }

  /* Theme handling delegated to global cookie-consent.js */
  toggleTheme() {
    if (window.toggleAppTheme) {
      window.toggleAppTheme();
    }
  }

  /* Files and Queue */
  handleFiles(files) {
    const newItems = files.map(file => ({
      id: 'file_' + Math.random().toString(36).substr(2, 9),
      file: file,
      name: file.name,
      size: this.formatBytes(file.size),
      status: 'queued', // queued, extracting, building, completed, error
      progress: 0,
      statusMessage: 'Ready to convert',
      pages: '...',
      result: null,
      options: { ...this.currentOptions }
    }));

    this.filesQueue.push(...newItems);
    this.renderQueue();

    this.showToast(`Added ${files.length} document${files.length > 1 ? 's' : ''} to queue.`, 'success');

    // Auto-convert if switched on
    if (this.autoConvertSwitch && this.autoConvertSwitch.checked) {
      this.convertAll();
    }
  }

  renderQueue() {
    if (this.filesQueue.length === 0) {
      this.queueContainer.style.display = 'none';
      return;
    }

    this.queueContainer.style.display = 'block';
    this.queueBadge.textContent = `${this.filesQueue.length} File${this.filesQueue.length > 1 ? 's' : ''}`;
    this.queueList.innerHTML = '';

    this.filesQueue.forEach(item => {
      const itemEl = document.createElement('div');
      itemEl.className = 'file-item';
      itemEl.id = item.id;

      // Status buttons based on state
      let actionButtons = '';
      if (item.status === 'completed') {
        actionButtons = `
          <button class="btn-file-action btn-file-preview" data-action="preview" data-id="${item.id}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
            Preview
          </button>
          <button class="btn-file-action btn-file-download" data-action="download" data-id="${item.id}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download
          </button>
        `;
      } else if (item.status === 'queued' || item.status === 'error') {
        actionButtons = `
          <button class="btn-file-action btn-file-convert" data-action="convert" data-id="${item.id}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Convert
          </button>
        `;
      } else {
        // Converting
        actionButtons = `<span style="font-size:0.85rem; color:var(--accent-cyan);">Converting...</span>`;
      }

      const thumbHtml = item.result && item.result.coverDataUrl
        ? `<img src="${item.result.coverDataUrl}" alt="Cover"/>`
        : `PDF`;

      itemEl.innerHTML = `
        <div class="file-thumb">${thumbHtml}</div>
        <div class="file-info">
          <div class="file-name" title="${item.name}">${this.escapeHtml(item.name)}</div>
          <div class="file-meta">
            <span>${item.size}</span>
            <span>•</span>
            <span>${item.pages !== '...' ? `${item.pages} Pages` : 'PDF'}</span>
            <span>•</span>
            <span class="file-status-text" id="status-${item.id}">${item.statusMessage}</span>
          </div>
          <div class="file-progress-bar-wrap">
            <div class="file-progress-bar" id="progress-${item.id}" style="width: ${item.progress}%"></div>
          </div>
        </div>
        <div class="file-actions">
          ${actionButtons}
          <button class="btn-file-remove" data-action="remove" data-id="${item.id}" title="Remove file">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      `;

      // Item Actions
      itemEl.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const action = btn.dataset.action;
          const id = btn.dataset.id;
          this.handleItemAction(action, id);
        });
      });

      this.queueList.appendChild(itemEl);
    });

    const anyCompleted = this.filesQueue.some(i => i.status === 'completed');
    this.downloadAllBtn.style.display = anyCompleted ? 'inline-flex' : 'none';
  }

  handleItemAction(action, id) {
    const item = this.filesQueue.find(i => i.id === id);
    if (!item) return;

    if (action === 'convert') {
      this.convertFile(item);
    } else if (action === 'preview') {
      if (item.result) {
        this.previewer.open(item.result);
      }
    } else if (action === 'download') {
      if (item.result && item.result.blob) {
        const epubFilename = item.name.replace(/\.[^/.]+$/, "") + '.epub';
        this.saveBlob(item.result.blob, epubFilename);
      }
    } else if (action === 'remove') {
      this.filesQueue = this.filesQueue.filter(i => i.id !== id);
      this.renderQueue();
    }
  }

  async convertFile(item) {
    if (item.status === 'extracting' || item.status === 'building') return;

    try {
      item.status = 'extracting';
      this.updateItemProgress(item, 10, 'Reading PDF structure...');

      // 1. Extract from PDF
      const extracted = await this.extractor.extract(
        item.file,
        item.options,
        (current, total, statusText) => {
          const pct = Math.min(80, Math.round((current / (total || 1)) * 70) + 10);
          this.updateItemProgress(item, pct, statusText);
        }
      );

      item.pages = extracted.numPages;

      // 2. Build EPUB
      item.status = 'building';
      this.updateItemProgress(item, 85, 'Compiling valid EPUB container & navigation...');

      const bookTitle = item.options.customTitle || extracted.metadata.title || item.name.replace(/\.[^/.]+$/, "");
      const bookAuthor = item.options.customAuthor || extracted.metadata.author || 'Author';

      const epubResult = await this.builder.build({
        metadata: {
          title: bookTitle,
          author: bookAuthor,
          language: 'en'
        },
        chapters: extracted.chapters,
        coverDataUrl: extracted.coverDataUrl,
        options: item.options
      });

      item.status = 'completed';
      item.result = epubResult;
      this.updateItemProgress(item, 100, `Done! ${extracted.chapters.length} chapters created.`);
      this.renderQueue();

      this.showToast(`Converted "${item.name}" successfully!`, 'success');
    } catch (err) {
      console.error('Conversion error:', err);
      item.status = 'error';
      this.updateItemProgress(item, 0, 'Conversion failed: ' + (err.message || 'Unknown error'));
      this.renderQueue();
      this.showToast(`Error converting "${item.name}": ${err.message}`, 'error');
    }
  }

  updateItemProgress(item, pct, msg) {
    item.progress = pct;
    item.statusMessage = msg;
    const progressEl = document.getElementById(`progress-${item.id}`);
    const statusEl = document.getElementById(`status-${item.id}`);
    if (progressEl) progressEl.style.width = `${pct}%`;
    if (statusEl) statusEl.textContent = msg;
  }

  async convertAll() {
    const uncompleted = this.filesQueue.filter(i => i.status === 'queued' || i.status === 'error');
    if (uncompleted.length === 0) {
      this.showToast('All items are already converted.', 'info');
      return;
    }

    for (const item of uncompleted) {
      await this.convertFile(item);
    }
  }

  async downloadAllAsZip() {
    const completed = this.filesQueue.filter(i => i.status === 'completed' && i.result && i.result.blob);
    if (completed.length === 0) {
      this.showToast('No converted EPUBs ready for download.', 'info');
      return;
    }

    if (completed.length === 1) {
      const item = completed[0];
      const epubFilename = item.name.replace(/\.[^/.]+$/, "") + '.epub';
      this.saveBlob(item.result.blob, epubFilename);
      return;
    }

    this.showToast('Zipping all EPUBs...', 'info');
    const zip = new window.JSZip();
    completed.forEach(item => {
      const epubFilename = item.name.replace(/\.[^/.]+$/, "") + '.epub';
      zip.file(epubFilename, item.result.blob);
    });

    const bundleBlob = await zip.generateAsync({ type: 'blob' });
    this.saveBlob(bundleBlob, 'converted_epubs.zip');
    this.showToast('Downloaded all EPUBs in a single ZIP!', 'success');
  }

  clearQueue() {
    this.filesQueue = [];
    this.renderQueue();
  }

  /* Options Modal */
  openOptionsModal() {
    this.optEpubVersion.value = this.currentOptions.epubVersion;
    this.optChapterStrategy.value = this.currentOptions.chapterStrategy;
    this.optCustomTitle.value = this.currentOptions.customTitle;
    this.optCustomAuthor.value = this.currentOptions.customAuthor;
    this.optCoverExtract.checked = this.currentOptions.includeCover;

    this.optionsModal.classList.add('active');
  }

  closeOptionsModal() {
    this.optionsModal.classList.remove('active');
  }

  saveOptions() {
    this.currentOptions.epubVersion = this.optEpubVersion.value;
    this.currentOptions.chapterStrategy = this.optChapterStrategy.value;
    this.currentOptions.customTitle = this.optCustomTitle.value.trim();
    this.currentOptions.customAuthor = this.optCustomAuthor.value.trim();
    this.currentOptions.includeCover = this.optCoverExtract.checked;
    this.extractCoverSwitch.checked = this.currentOptions.includeCover;

    this.closeOptionsModal();
    this.showToast('Conversion settings updated.', 'success');
  }

  /* Sample PDF Generator for Instant Demo */
  async loadSamplePdf() {
    this.showToast('Generating sample ebook PDF...', 'info');

    // Create a rich multi-page test PDF in pure binary using minimal PDF structure
    const samplePdfBytes = this.generateSamplePdfBinary();
    const sampleFile = new File([samplePdfBytes], "Sample_Reflow_Ebook.pdf", { type: "application/pdf" });

    this.handleFiles([sampleFile]);
  }

  generateSamplePdfBinary() {
    // Minimal valid multi-page PDF generator
    const title = "The Art of Digital Typography";
    const author = "Antigravity Research";
    
    const page1Text = "BT /F1 24 Tf 50 720 Td (Chapter 1: The Evolution of E-Books) Tj ET " +
      "BT /F1 12 Tf 50 670 Td (For decades, the Portable Document Format reigned supreme as the gold standard) Tj ET " +
      "BT /F1 12 Tf 50 650 Td (for fixed-layout desktop printing and document fidelity.) Tj ET " +
      "BT /F1 12 Tf 50 610 Td (However, when reading on modern handheld mobile screens, Kindle e-readers, and tablets,) Tj ET " +
      "BT /F1 12 Tf 50 590 Td (fixed PDFs cause frustrating horizontal scrolling and pinch-to-zoom fatigue.) Tj ET " +
      "BT /F1 12 Tf 50 550 Td (EPUB solves this by introducing dynamic reflowable typography.) Tj ET";

    const page2Text = "BT /F1 24 Tf 50 720 Td (Chapter 2: The Freedom of Reflowable Text) Tj ET " +
      "BT /F1 12 Tf 50 670 Td (With an EPUB document, readers can adjust font size, margins, and typeface freely.) Tj ET " +
      "BT /F1 12 Tf 50 640 Td (The text automatically reflows to fit any screen size perfectly, from a compact) Tj ET " +
      "BT /F1 12 Tf 50 620 Td (smartphone display to an expansive e-ink tablet.) Tj ET " +
      "BT /F1 12 Tf 50 580 Td (Converting static PDFs into clean, validated EPUB files delivers the optimal) Tj ET " +
      "BT /F1 12 Tf 50 560 Td (reading experience across Kindle, Apple Books, Kobo, and Google Play Books.) Tj ET";

    const pdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 5 0 R /Resources << /Font << /F1 7 0 R >> >> >> endobj
4 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 6 0 R /Resources << /Font << /F1 7 0 R >> >> >> endobj
5 0 obj << /Length ${page1Text.length} >> stream
${page1Text}
endstream
endobj
6 0 obj << /Length ${page2Text.length} >> stream
${page2Text}
endstream
endobj
7 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 8
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000224 00000 n 
0000000333 00000 n 
0000000450 00000 n 
0000000567 00000 n 
trailer << /Size 8 /Root 1 0 R >>
startxref
640
%%EOF`;

    const encoder = new TextEncoder();
    return encoder.encode(pdf);
  }

  saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
      <span>${this.escapeHtml(message)}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
