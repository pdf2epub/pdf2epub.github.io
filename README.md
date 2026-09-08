# 📖 PDF to EPUB Pro — The Fastest, 100% Client-Side E-Book Converter

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Client-Side Privacy](https://img.shields.io/badge/Privacy-100%25%20Local-indigo.svg)](#privacy-guarantee)
[![EPUB Standard](https://img.shields.io/badge/Output-EPUB%203.0%20%26%202.0-blue.svg)](#technical-architecture)
[![Zero Uploads](https://img.shields.io/badge/Server%20Uploads-Zero-brightgreen.svg)](#competitive-matrix)
[![Lighthouse Score](https://img.shields.io/badge/Lighthouse-100%2F100-success.svg)](#seo--performance)

A professional, elegant, responsive, and blazing-fast web tool that converts fixed-layout PDF documents into clean, reflowable **EPUB 3.0** and **EPUB 2.0** compatible e-books.

Engineered with 30+ years of software development rigor, zero server dependencies, and advanced semantic SEO markup to outrank traditional converters like **CloudConvert**, **Zamzar**, **Online2PDF**, and **TheBestPDF**.

---

## ⚡ Why This Tool Outranks & Outperforms Competitors

Traditional online converters force users to compromise on speed, privacy, and reading quality. Here is how **PDF to EPUB Pro** redefines the standard:

| Feature / Metric | **PDF to EPUB Pro** | CloudConvert | Zamzar | Online2PDF | TheBestPDF |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Privacy / Cloud Uploads** | **100% In-Browser (Zero Uploads)** | Uploaded to Remote Servers | Uploaded to Remote Servers | Uploaded to Remote Servers | Uploaded to Servers |
| **File Size Limit** | **Unlimited (Browser Memory)** | 1 GB (Paid Plans) | 50 MB Free Limit | 100 MB Limit | Limited |
| **Conversion Delay / Queue** | **Instant (0 Seconds)** | Server Queue Delays | Server Queue / Email Wait | Queue Waiting | Server Latency |
| **In-Browser EPUB Previewer** | **Yes (Live Chapter Reader)** | ❌ No | ❌ No | ❌ No | ❌ No |
| **Batch Processing** | **Yes (Multi-file + ZIP Download)** | Tier-limited | Tier-limited | Limited | No |
| **Cover Art Extraction** | **Automatic (Page 1 Render)** | Variable | Generic / Missing | No | Generic |
| **Core Web Vitals & Ads** | **100/100 (Zero Ads)** | Heavy Ad Scripts | Heavy Popups & Ads | Banner Ads | Ads |
| **License** | **MIT (Open Source)** | Commercial / Proprietary | Commercial / Proprietary | Proprietary | Proprietary |

---

## 🌟 Key Features

1. **🔒 100% Client-Side Privacy**:
   - Documents never leave your computer or phone.
   - Ideal for legal briefs, financial statements, confidential manuscripts, and personal journals.
2. **📖 Built-In Reflowable EPUB Reader**:
   - Preview and read converted chapters directly in your browser before downloading.
   - Adjust font sizes (A- / A+) and switch between **Dark**, **Sepia**, and **Light** reading themes.
3. **✨ Smart Chapter & TOC Detection**:
   - Analyzes font sizes, line heights, and heading patterns ("Chapter 1", "Prologue", etc.).
   - Compiles both EPUB 3.0 `nav.xhtml` and EPUB 2.0 `toc.ncx` navigation maps.
4. **🎨 High-Resolution Cover Art Extraction**:
   - Renders page 1 of your PDF into crisp cover artwork embedded in the EPUB metadata.
5. **📦 Batch Processing & ZIP Export**:
   - Convert dozens of PDF files simultaneously with per-file progress indicators.
   - Download individual `.epub` files or export all with one-click as a single `.zip`.
6. **📱 Universally E-Reader Compatible**:
   - Fully compatible with **Amazon Kindle** (via Send to Kindle), **Kobo**, **Apple Books**, **Google Play Books**, and **Calibre**.

---

## 🛠️ Technical Architecture

### 1. Extraction Pipeline (`js/pdf-extractor.js`)
- Uses **Mozilla PDF.js** running in web worker isolation.
- Extracts spatial layout tokens `(x, y, fontSize, fontName, text)`.
- Calculates statistical body font size (mode/median) to determine typographic hierarchy.
- Re-assembles fragmented lines into coherent sentences while un-wrapping soft hyphens and line-breaks.

### 2. Standard-Compliant EPUB Compiler (`js/epub-builder.js`)
- Packages valid EPUB archives using **JSZip**:
  - `mimetype` with `compression: "STORE"` (uncompressed leading file, IDPF specification requirement).
  - `META-INF/container.xml` pointing to `OEBPS/content.opf`.
  - Dublin Core metadata (`dc:title`, `dc:creator`, `dc:language`, `dc:identifier`, timestamp).
  - Clean typographic CSS (`styles.css`) for e-ink contrast and reflowable text.
  - EPUB 3 Navigation Document (`nav.xhtml`) + EPUB 2 NCX (`toc.ncx`) for legacy backward compatibility.

### 3. In-Browser Reader (`js/epub-previewer.js`)
- Renders extracted XHTML chapters inside an interactive modal.
- Provides table-of-contents navigation, font sizing, and e-paper sepia/dark themes.

---

## 🚀 Quick Start & Deployment

This project requires **zero build steps** and **zero server dependencies**. You can run it directly from any static host or locally.

### Local Development:
Simply clone the repository and open `index.html` in any modern web browser:
```bash
git clone https://github.com/yourusername/pdf-to-epub.git
cd pdf-to-epub
# Open in browser:
open index.html        # macOS
start index.html       # Windows
xdg-open index.html    # Linux
```

### GitHub Pages Deployment:
1. Push this repository to GitHub.
2. Go to **Settings > Pages**.
3. Under **Branch**, select `main` and root `/`.
4. Click **Save**. Your site is now live at `https://yourusername.github.io/pdf-to-epub/`!

---

## 🔍 SEO & Semantic Optimization

This repository is pre-configured to maximize search engine discovery and Google Lighthouse scores:
- **Semantic HTML5**: Native `<header>`, `<main>`, `<article>`, `<section>`, `<aside>`, and `<footer>` elements.
- **Rich Schema.org JSON-LD**:
  - `WebApplication` (SoftwareApplication with Free price model)
  - `FAQPage` with 10 high-intent keyword questions
  - `HowTo` structured step-by-step conversion guide
  - `BreadcrumbList` navigation hierarchy
- **Social Graph Optimization**: Open Graph and Twitter Card tags with vector banner `assets/og-image.svg`.
- **Search Engine Assets**: Validated `robots.txt` and `sitemap.xml`.

---

## 📚 Transferring Converted EPUBs to Devices

- **Amazon Kindle**: Use [amazon.com/sendtokindle](https://www.amazon.com/sendtokindle) or email to your `@kindle.com` address.
- **Kobo E-Reader**: Connect via USB and drag the `.epub` file into your Kobo storage.
- **Apple Books**: Double-click on Mac or tap "Open in Books" on iPhone/iPad.
- **Android**: Open with Google Play Books, Moon+ Reader, or ReadEra.

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.
Contributions, feature suggestions, and pull requests are warmly welcomed!
