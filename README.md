# PDFSplicer

A lightweight, privacy-friendly PDF merger that runs entirely in the browser.

PDFSplicer lets you add multiple PDF files, reorder them with drag-and-drop, sort them by number in the filename, remove unwanted files, and merge everything into a single PDF without uploading documents to a server.

## Features

- Merge multiple PDF files directly in the browser
- Drag-and-drop file upload
- Drag-and-drop reordering before merging
- Numerical sorting based on filenames
- Individual file removal and clear-all option
- 50 MB maximum file size per PDF
- Automatic download of the merged PDF
- No backend or server required
- No PDF files are uploaded during processing
- Responsive interface built with Tailwind CSS

## Privacy

All PDF processing happens locally in your browser using `pdf-lib`. Your selected documents are not uploaded to a remote server by this application.

The page loads its frontend libraries from public CDNs, but the PDF contents themselves are processed locally in the browser.

## Built With

- HTML5
- JavaScript
- Tailwind CSS
- pdf-lib
- SortableJS
- Lucide Icons

## How to Use

1. Open the deployed PDFSplicer web app.
2. Click the upload area or drag PDF files into it.
3. Reorder files by dragging them using the handle.
4. Optionally use **Sort by Number** to order filenames numerically.
5. Remove any files you do not want included.
6. Click **Merge PDFs**.
7. The merged file will download automatically as `merged_document.pdf`.

## Local Usage

Because PDFSplicer is a static web app, no installation is required.

Clone the repository:

```bash
git clone https://github.com/OnkarPawar1/PDFSplicer.git
cd PDFSplicer
```

Then open `index.html` in a modern browser.

For a simple local web server, you can also run:

```bash
python -m http.server 8000
```

Then visit:

```text
http://localhost:8000
```

## Deployment

This repository is configured around the `gh-pages` branch and can be served using GitHub Pages.

Expected project URL:

```text
https://onkarpawar1.github.io/PDFSplicer/
```

## Limitations

- Password-protected or encrypted PDFs may not merge successfully.
- Very large PDFs may require significant browser memory.
- The app depends on CDN-hosted frontend libraries, so an internet connection is normally required when loading the page unless those assets are cached.

## Project Structure

```text
PDFSplicer/
├── index.html
└── README.md
```

## License

No license has been added yet. If you plan to make the project openly reusable, consider adding an MIT License.

## Author

**Onkar Pawar**

GitHub: `OnkarPawar1`

---

If you find PDFSplicer useful, consider starring the repository.
