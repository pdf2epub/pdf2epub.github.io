/**
 * PDF to EPUB Pro - PDF Extractor Engine
 * Uses Mozilla PDF.js to extract structured text, headings, layout, and images
 */

class PDFExtractor {
  constructor() {
    // Ensure pdfjsLib worker is configured
    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
  }

  /**
   * Parse PDF file and return structured document object
   * @param {File|Blob|ArrayBuffer} fileInput 
   * @param {Object} options - { extractImages, chapterStrategy, fontSizeThreshold }
   * @param {Function} onProgress - callback (current, total, statusText)
   */
  async extract(fileInput, options = {}, onProgress = () => {}) {
    if (!window.pdfjsLib) {
      throw new Error('PDF.js library is not loaded. Please check your network connection.');
    }

    let arrayBuffer;
    if (fileInput instanceof ArrayBuffer) {
      arrayBuffer = fileInput;
    } else if (fileInput instanceof Blob || fileInput instanceof File) {
      arrayBuffer = await fileInput.arrayBuffer();
    } else {
      throw new Error('Invalid file input format.');
    }

    onProgress(0, 100, 'Loading PDF document structure...');
    const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;

    // Extract metadata
    let docMetadata = {
      title: 'Untitled Document',
      author: 'Unknown Author',
      subject: '',
      creator: 'PDF to EPUB Pro'
    };

    try {
      const meta = await pdfDoc.getMetadata();
      if (meta && meta.info) {
        if (meta.info.Title && meta.info.Title.trim()) {
          docMetadata.title = meta.info.Title.trim();
        }
        if (meta.info.Author && meta.info.Author.trim()) {
          docMetadata.author = meta.info.Author.trim();
        }
        if (meta.info.Subject) docMetadata.subject = meta.info.Subject;
      }
    } catch (e) {
      console.warn('Could not read PDF metadata, using defaults:', e);
    }

    // Extract page 1 as Cover image preview
    let coverDataUrl = null;
    try {
      coverDataUrl = await this.renderPageToThumbnail(pdfDoc, 1);
    } catch (e) {
      console.warn('Cover generation failed:', e);
    }

    const pagesData = [];
    const allFontSizes = [];

    // First pass: extract text items & coordinates
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      onProgress(pageNum, numPages, `Extracting text & layout from page ${pageNum} of ${numPages}...`);
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1.0 });

      const pageItems = [];
      for (const item of textContent.items) {
        if (!item.str || !item.str.trim()) continue;

        // Approximate font size from transform matrix [sx, ky, kx, sy, tx, ty]
        const fontSize = Math.hypot(item.transform[2], item.transform[3]) || item.height || 12;
        allFontSizes.push(fontSize);

        pageItems.push({
          text: item.str,
          x: item.transform[4],
          y: viewport.height - item.transform[5], // Convert to top-down Y
          fontSize: Math.round(fontSize * 10) / 10,
          fontName: item.fontName,
          hasEOL: item.hasEOL
        });
      }

      pagesData.push({
        pageNum,
        width: viewport.width,
        height: viewport.height,
        items: pageItems
      });
    }

    // Calculate statistical body font size (mode or median)
    const bodyFontSize = this.calculateBodyFontSize(allFontSizes);
    const headingThreshold = options.fontSizeThreshold || (bodyFontSize * 1.28);

    onProgress(numPages, numPages, 'Analyzing typography & building chapter structure...');

    // Structure into chapters and coherent paragraphs
    const chapters = this.structureIntoChapters(pagesData, {
      bodyFontSize,
      headingThreshold,
      strategy: options.chapterStrategy || 'auto', // 'auto', 'page', 'heading'
      titleFallback: docMetadata.title
    });

    return {
      metadata: docMetadata,
      numPages,
      bodyFontSize,
      coverDataUrl,
      chapters
    };
  }

  /**
   * Determine the most common body text font size
   */
  calculateBodyFontSize(fontSizes) {
    if (!fontSizes.length) return 12;
    const freq = {};
    let maxCount = 0;
    let mostFrequent = 12;

    for (const size of fontSizes) {
      const rounded = Math.round(size);
      freq[rounded] = (freq[rounded] || 0) + 1;
      if (freq[rounded] > maxCount) {
        maxCount = freq[rounded];
        mostFrequent = rounded;
      }
    }
    return mostFrequent;
  }

  /**
   * Structure pages into chapters with headings and reflowable paragraphs
   */
  structureIntoChapters(pagesData, config) {
    const { bodyFontSize, headingThreshold, strategy, titleFallback } = config;

    // Strategy 1: Page by page (Every page is a separate chapter)
    if (strategy === 'page') {
      return pagesData.map(page => {
        const lines = this.assembleLines(page.items);
        const htmlContent = this.linesToHtml(lines, bodyFontSize);
        return {
          title: `Page ${page.pageNum}`,
          contentHtml: htmlContent,
          pageStart: page.pageNum
        };
      });
    }

    // Strategy 2: Auto / Heading detection
    const chapters = [];
    let currentChapter = {
      title: titleFallback || 'Introduction',
      paragraphs: [],
      pageStart: 1
    };

    const chapterRegex = /^(chapter\s+\d+|part\s+\d+|book\s+\d+|prologue|epilogue|introduction|preface|conclusion|\d+\.\s+[A-Z])/i;

    for (const page of pagesData) {
      const lines = this.assembleLines(page.items);

      for (const line of lines) {
        const isHeadingByFont = line.fontSize >= headingThreshold && line.text.length < 120;
        const isHeadingByRegex = chapterRegex.test(line.text.trim()) && line.text.length < 80;

        if ((isHeadingByFont || isHeadingByRegex) && strategy !== 'single') {
          // If current chapter has substantial content, start a new chapter
          if (currentChapter.paragraphs.length > 0) {
            chapters.push(this.finalizeChapter(currentChapter, bodyFontSize));
            currentChapter = {
              title: line.text.trim(),
              paragraphs: [],
              pageStart: page.pageNum
            };
            continue;
          } else {
            // First heading of the document
            currentChapter.title = line.text.trim();
            continue;
          }
        }

        // Add line to current chapter
        currentChapter.paragraphs.push(line);
      }
    }

    if (currentChapter.paragraphs.length > 0 || chapters.length === 0) {
      chapters.push(this.finalizeChapter(currentChapter, bodyFontSize));
    }

    return chapters;
  }

  /**
   * Group sorted text tokens into coherent lines
   */
  assembleLines(items) {
    if (!items.length) return [];

    // Sort tokens top-down, then left-to-right
    const sorted = [...items].sort((a, b) => {
      const yDiff = a.y - b.y;
      if (Math.abs(yDiff) > 4) {
        return yDiff; // vertical difference
      }
      return a.x - b.x; // horizontal order
    });

    const lines = [];
    let currentLine = null;

    for (const item of sorted) {
      if (!currentLine) {
        currentLine = {
          y: item.y,
          x: item.x,
          fontSize: item.fontSize,
          text: item.text,
          maxFontSize: item.fontSize
        };
        continue;
      }

      // Check if item belongs to the same horizontal line (within 4px delta)
      if (Math.abs(item.y - currentLine.y) <= 4) {
        // Add spacing if there is a gap between items
        const needsSpace = !currentLine.text.endsWith(' ') && !item.text.startsWith(' ');
        currentLine.text += (needsSpace ? ' ' : '') + item.text;
        if (item.fontSize > currentLine.maxFontSize) {
          currentLine.maxFontSize = item.fontSize;
          currentLine.fontSize = item.fontSize;
        }
      } else {
        lines.push(currentLine);
        currentLine = {
          y: item.y,
          x: item.x,
          fontSize: item.fontSize,
          text: item.text,
          maxFontSize: item.fontSize
        };
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Convert raw lines into semantic XHTML paragraphs & headings
   */
  finalizeChapter(chapter, bodyFontSize) {
    const htmlContent = this.linesToHtml(chapter.paragraphs, bodyFontSize);
    return {
      title: chapter.title || 'Chapter',
      contentHtml: htmlContent,
      pageStart: chapter.pageStart
    };
  }

  /**
   * Smart Reflow: unwrap hard line-breaks while respecting paragraph boundaries
   */
  linesToHtml(lines, bodyFontSize) {
    if (!lines.length) return '<p></p>';

    let html = '';
    let currentPara = '';
    const headingThreshold = bodyFontSize * 1.25;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const text = line.text.trim();
      if (!text) continue;

      // Filter out pure page numbers (e.g., lone digit "14")
      if (/^\d{1,4}$/.test(text) && (line.y < 50 || line.y > 750)) {
        continue;
      }

      // Subheading check
      if (line.fontSize >= headingThreshold && text.length < 100) {
        if (currentPara) {
          html += `<p>${this.escapeXml(currentPara)}</p>\n`;
          currentPara = '';
        }
        html += `<h2>${this.escapeXml(text)}</h2>\n`;
        continue;
      }

      // Sentence continuation check
      if (!currentPara) {
        currentPara = text;
      } else {
        // Hyphenated word wrap at end of line (e.g. "connec-", "tion")
        if (currentPara.endsWith('-') && !currentPara.endsWith(' -')) {
          currentPara = currentPara.slice(0, -1) + text;
        } else {
          // If previous line ended with period, question mark, or colon, start new paragraph if indent exists
          const endsWithPunct = /[.!?:"']$/.test(currentPara);
          if (endsWithPunct && line.x > 70) {
            html += `<p>${this.escapeXml(currentPara)}</p>\n`;
            currentPara = text;
          } else {
            currentPara += ' ' + text;
          }
        }
      }
    }

    if (currentPara) {
      html += `<p>${this.escapeXml(currentPara)}</p>\n`;
    }

    return html || '<p></p>';
  }

  /**
   * Escape XML entities for standard-compliant EPUB XHTML
   */
  escapeXml(unsafe) {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Render first page to PNG Data URL for cover art
   */
  async renderPageToThumbnail(pdfDoc, pageNum = 1) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 0.8 });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvasContext: ctx,
      viewport: viewport
    }).promise;

    return canvas.toDataURL('image/jpeg', 0.85);
  }
}

// Export as global
window.PDFExtractor = PDFExtractor;
