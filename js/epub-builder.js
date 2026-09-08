/**
 * PDF to EPUB Pro - EPUB 3.0 & 2.0 Standard Compiler
 * Generates standards-compliant, validated EPUB files using JSZip
 */

class EPUBBuilder {
  constructor() {
    if (!window.JSZip) {
      console.warn('JSZip is not yet loaded.');
    }
  }

  /**
   * Build complete EPUB archive from structured book data
   * @param {Object} bookData - { metadata, chapters, coverDataUrl, options }
   * @returns {Promise<Blob>} - EPUB file as Blob
   */
  async build(bookData) {
    if (!window.JSZip) {
      throw new Error('JSZip library is missing. Cannot package EPUB.');
    }

    const zip = new window.JSZip();
    const metadata = bookData.metadata || {};
    const chapters = bookData.chapters || [];
    const options = bookData.options || {};

    const bookTitle = metadata.title || 'Converted Document';
    const bookAuthor = metadata.author || 'Anonymous';
    const bookLang = metadata.language || 'en';
    const bookUuid = metadata.uuid || this.generateUuid();
    const isoDate = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
    const isEpub3 = options.epubVersion !== '2.0';

    // 1. mimetype file: MUST be the first file and stored uncompressed
    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

    // 2. META-INF/container.xml
    zip.file('META-INF/container.xml', this.buildContainerXml());

    // 3. OEBPS Folder contents
    const oebps = zip.folder('OEBPS');

    // 4. Stylesheet
    oebps.file('styles.css', this.buildStylesheet());

    // 5. Cover Image & Cover Page (if available)
    let hasCover = false;
    let coverMime = 'image/jpeg';
    if (bookData.coverDataUrl && options.includeCover !== false) {
      hasCover = true;
      const base64Data = bookData.coverDataUrl.split(',')[1];
      if (bookData.coverDataUrl.includes('image/png')) {
        coverMime = 'image/png';
        oebps.file('images/cover.png', base64Data, { base64: true });
      } else {
        oebps.file('images/cover.jpg', base64Data, { base64: true });
      }

      // Cover XHTML
      oebps.file('cover.xhtml', this.buildCoverXhtml(bookTitle, coverMime));
    }

    // 6. Chapter XHTML files
    chapters.forEach((chapter, index) => {
      const filename = `chapter_${index + 1}.xhtml`;
      const xhtmlContent = this.buildChapterXhtml(chapter.title, chapter.contentHtml, bookTitle);
      oebps.file(filename, xhtmlContent);
    });

    // 7. Navigation Document (EPUB 3: nav.xhtml)
    oebps.file('nav.xhtml', this.buildNavXhtml(bookTitle, chapters, hasCover));

    // 8. NCX Table of Contents (EPUB 2 backward compatibility)
    oebps.file('toc.ncx', this.buildTocNcx(bookTitle, bookAuthor, bookUuid, chapters, hasCover));

    // 9. Package Document (content.opf)
    oebps.file('content.opf', this.buildContentOpf({
      title: bookTitle,
      author: bookAuthor,
      lang: bookLang,
      uuid: bookUuid,
      modified: isoDate,
      isEpub3,
      hasCover,
      coverMime,
      chapters
    }));

    // Generate blob
    const epubBlob = await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/epub+zip',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 }
    });

    return {
      blob: epubBlob,
      title: bookTitle,
      chapters: chapters,
      hasCover: hasCover,
      coverDataUrl: bookData.coverDataUrl
    };
  }

  /**
   * Generates container.xml pointing to root OEBPS/content.opf
   */
  buildContainerXml() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
  }

  /**
   * Default CSS stylesheet for clean e-reader reading experience
   */
  buildStylesheet() {
    return `@charset "utf-8";

body {
  margin: 5% 6%;
  font-family: serif;
  line-height: 1.6;
  text-align: justify;
  text-justify: inter-word;
  hyphens: auto;
  -webkit-hyphens: auto;
}

h1, h2, h3, h4, h5, h6 {
  font-family: sans-serif;
  text-align: left;
  font-weight: bold;
  page-break-after: avoid;
  break-after: avoid;
}

h1 {
  font-size: 1.8em;
  margin-top: 1.5em;
  margin-bottom: 0.8em;
  border-bottom: 1px solid #ccc;
  padding-bottom: 0.2em;
}

h2 {
  font-size: 1.35em;
  margin-top: 1.2em;
  margin-bottom: 0.6em;
}

p {
  margin: 0;
  text-indent: 1.5em;
}

/* First paragraph after header should not be indented */
h1 + p, h2 + p, h3 + p {
  text-indent: 0;
}

img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1em auto;
}

.cover-container {
  text-align: center;
  margin: 0;
  padding: 0;
  height: 100vh;
}

.cover-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
`;
  }

  /**
   * Generates valid cover.xhtml page
   */
  buildCoverXhtml(title, coverMime) {
    const ext = coverMime === 'image/png' ? 'png' : 'jpg';
    return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en">
<head>
  <title>Cover - ${this.escapeXml(title)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
  <meta name="viewport" content="width=device-width, height=device-height, initial-scale=1.0"/>
</head>
<body style="margin:0; padding:0; text-align:center;">
  <div class="cover-container">
    <img class="cover-img" src="images/cover.${ext}" alt="Cover Image"/>
  </div>
</body>
</html>`;
  }

  /**
   * Generates Chapter XHTML file
   */
  buildChapterXhtml(chapterTitle, contentHtml, bookTitle) {
    return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en">
<head>
  <title>${this.escapeXml(chapterTitle)} - ${this.escapeXml(bookTitle)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <section epub:type="chapter">
    <h1>${this.escapeXml(chapterTitle)}</h1>
    ${contentHtml}
  </section>
</body>
</html>`;
  }

  /**
   * Generates EPUB 3 Navigation Document (nav.xhtml)
   */
  buildNavXhtml(bookTitle, chapters, hasCover) {
    let tocItems = '';
    if (hasCover) {
      tocItems += `    <li><a href="cover.xhtml">Cover</a></li>\n`;
    }
    chapters.forEach((chapter, index) => {
      tocItems += `    <li><a href="chapter_${index + 1}.xhtml">${this.escapeXml(chapter.title)}</a></li>\n`;
    });

    return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en">
<head>
  <title>Table of Contents</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Table of Contents</h1>
    <ol>
${tocItems}    </ol>
  </nav>
</body>
</html>`;
  }

  /**
   * Generates EPUB 2 NCX Document (toc.ncx) for legacy e-readers
   */
  buildTocNcx(bookTitle, bookAuthor, bookUuid, chapters, hasCover) {
    let playOrder = 1;
    let navPoints = '';

    if (hasCover) {
      navPoints += `  <navPoint id="navPoint-${playOrder}" playOrder="${playOrder}">
    <navLabel><text>Cover</text></navLabel>
    <content src="cover.xhtml"/>
  </navPoint>\n`;
      playOrder++;
    }

    chapters.forEach((chapter, index) => {
      navPoints += `  <navPoint id="navPoint-${playOrder}" playOrder="${playOrder}">
    <navLabel><text>${this.escapeXml(chapter.title)}</text></navLabel>
    <content src="chapter_${index + 1}.xhtml"/>
  </navPoint>\n`;
      playOrder++;
    });

    return `<?xml version="1.0" encoding="utf-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${bookUuid}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${this.escapeXml(bookTitle)}</text></docTitle>
  <docAuthor><text>${this.escapeXml(bookAuthor)}</text></docAuthor>
  <navMap>
${navPoints}  </navMap>
</ncx>`;
  }

  /**
   * Generates Package Document (content.opf)
   */
  buildContentOpf(config) {
    const { title, author, lang, uuid, modified, isEpub3, hasCover, coverMime, chapters } = config;
    const coverExt = coverMime === 'image/png' ? 'png' : 'jpg';

    let manifest = '';
    let spine = '';

    // Stylesheet & nav docs
    manifest += `    <item id="css" href="styles.css" media-type="text/css"/>\n`;
    manifest += `    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>\n`;
    manifest += `    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>\n`;

    // Cover
    if (hasCover) {
      manifest += `    <item id="cover-image" href="images/cover.${coverExt}" media-type="${coverMime}" properties="cover-image"/>\n`;
      manifest += `    <item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>\n`;
      spine += `    <itemref idref="cover" linear="yes"/>\n`;
    }

    // Chapters
    chapters.forEach((chapter, index) => {
      const id = `chap_${index + 1}`;
      const href = `chapter_${index + 1}.xhtml`;
      manifest += `    <item id="${id}" href="${href}" media-type="application/xhtml+xml"/>\n`;
      spine += `    <itemref idref="${id}"/>\n`;
    });

    return `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="${isEpub3 ? '3.0' : '2.0'}">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:identifier id="BookId">urn:uuid:${uuid}</dc:identifier>
    <dc:title>${this.escapeXml(title)}</dc:title>
    <dc:creator id="creator">${this.escapeXml(author)}</dc:creator>
    <dc:language>${lang}</dc:language>
    <dc:publisher>PDF to EPUB Pro</dc:publisher>
    <dc:date>${new Date().toISOString().split('T')[0]}</dc:date>
    <meta property="dcterms:modified">${modified}</meta>
    ${hasCover ? '<meta name="cover" content="cover-image"/>' : ''}
  </metadata>
  <manifest>
${manifest}  </manifest>
  <spine toc="ncx">
${spine}  </spine>
  <guide>
    ${hasCover ? '<reference type="cover" title="Cover" href="cover.xhtml"/>' : ''}
    <reference type="toc" title="Table of Contents" href="nav.xhtml"/>
  </guide>
</package>`;
  }

  generateUuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  escapeXml(unsafe) {
    if (!unsafe) return '';
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

window.EPUBBuilder = EPUBBuilder;
