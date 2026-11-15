# PDFSplicer Pro

A privacy-friendly, browser-based PDF toolkit for merging, splitting, extracting, removing, and rotating PDF pages without uploading document contents to a backend server.

## Live App

```text
https://onkarpawar1.github.io/PDFSplicer/
```

## What PDFSplicer Pro Can Do

### Merge PDFs

- Add multiple PDF files
- Drag and drop files to reorder them
- Sort filenames numerically
- View total file count, page count, and selected file size
- Choose a custom output filename
- Merge everything into one downloadable PDF

### Split PDF

Split one PDF using any of these methods:

- **Every page** — one output PDF per page
- **Fixed-size chunks** — for example, 3 pages per output file
- **Custom ranges** — for example, `1-3,4-7,8-10`

All generated PDFs are packaged into one ZIP file for a clean single download.

### Page Tools

Work with selected page ranges such as `1-3,5,8-10`.

Supported operations:

- Extract selected pages
- Remove selected pages
- Rotate selected pages 90° left
- Rotate selected pages 90° right
- Save the result under a custom filename

## Privacy

PDFSplicer Pro is designed as a client-side web application.

The PDF files you select are read and processed inside your browser using `pdf-lib`. The application does not send the contents of your PDFs to its own backend server.

The page itself loads JavaScript libraries from public CDNs, so an internet connection is normally required when first loading the application unless those resources are already cached.

## Validation and Safety Checks

The application includes validation for common problems:

- No application-enforced file-size cap; large PDFs remain subject to browser memory and device limitations
- Invalid or unsupported PDF files
- Encrypted/password-protected PDFs that cannot be opened by `pdf-lib`
- Page selections outside the document's page count
- Invalid range syntax
- Preventing removal of every page from a PDF
- Limiting very large split operations to avoid accidentally producing hundreds of files

## Built With

- HTML5
- CSS3
- Vanilla JavaScript
- [pdf-lib](https://pdf-lib.js.org/)
- [SortableJS](https://sortablejs.github.io/Sortable/)
- [JSZip](https://stuk.github.io/jszip/)
- [Lucide Icons](https://lucide.dev/)

## Project Structure

```text
PDFSplicer/
├── index.html      # Application layout and tool panels
├── styles.css      # Responsive interface and component styling
├── app.js          # Merge, split, page-processing and validation logic
└── README.md
```

## Run Locally

Clone the repository:

```bash
git clone https://github.com/OnkarPawar1/PDFSplicer.git
cd PDFSplicer
```

If the repository defaults to another branch, switch to the Pages branch:

```bash
git checkout gh-pages
```

Start a simple local server:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

You can also open `index.html` directly in many modern browsers, although using a local HTTP server is recommended during development.

## GitHub Pages Deployment

The current production application is published from the `gh-pages` branch.

Expected URL:

```text
https://onkarpawar1.github.io/PDFSplicer/
```

## Browser Support

A current version of Chrome, Edge, Firefox, or Safari is recommended. Large or complex PDF operations can consume significant memory because processing happens locally in the browser.

## Large PDF Files

PDFSplicer does not impose a fixed per-file size limit. Files larger than 50 MB can be selected, but successful processing depends on browser memory, device resources, document complexity and output size. The application reads PDF data into memory, and merge/split operations can require multiple copies. This is not a guarantee of unlimited file sizes.

## Current Limitations

- Password-protected/encrypted PDFs may not be supported.
- This is not a full PDF editor for modifying existing text or images inside PDF pages.
- Browser memory limits may affect very large PDFs or very large merge jobs.
- Compression is limited to what the generated PDF structure naturally provides; this is not an advanced image-compression engine.
- CDN-hosted libraries mean the initial app load generally requires internet access.

## Future Ideas

Potential upgrades include:

- Visual page thumbnails
- Drag-and-drop page reordering inside a single PDF
- Duplicate-page support
- Watermarks and page numbers
- Image-to-PDF conversion
- PDF metadata editing
- Offline/PWA support
- Optional local compression workflows

## Author

**Onkar Pawar**  
GitHub: `OnkarPawar1`

---

If PDFSplicer Pro is useful to you, consider starring the repository.
