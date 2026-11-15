const { PDFDocument, degrees } = PDFLib;

const mergeState = { files: [], counter: 0 };
const splitState = { file: null, pages: 0 };
const pageState = { file: null, pages: 0 };

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

function formatBytes(bytes, decimals = 2) {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function sanitizeBaseName(value, fallback = 'document') {
  const cleaned = String(value || '')
    .replace(/\.pdf$/i, '')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || fallback;
}

function isPdfFile(file) {
  return file && (file.type === 'application/pdf' || /\.pdf$/i.test(file.name));
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadBytes(filename, bytes) {
  downloadBlob(filename, new Blob([bytes], { type: 'application/pdf' }));
}

function toast(message, type = 'info', timeout = 3600) {
  const wrap = $('#toast-wrap');
  const item = document.createElement('div');
  item.className = `toast ${type}`;
  item.textContent = message;
  wrap.appendChild(item);
  setTimeout(() => item.remove(), timeout);
}

function setLoading(button, loading, label, icon = 'loader-circle') {
  if (!button) return;
  if (loading) {
    button.dataset.original = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `<i data-lucide="${icon}" class="spin-icon"></i><span>${escapeHtml(label)}</span>`;
  } else {
    button.innerHTML = button.dataset.original || button.innerHTML;
    button.disabled = false;
  }
  lucide.createIcons();
}

async function loadPdfInfo(file) {
  if (!isPdfFile(file)) throw new Error('Please choose a PDF file.');
  try {
    const bytes = await file.arrayBuffer();
    const pdf = await PDFDocument.load(bytes);
    return { pages: pdf.getPageCount() };
  } catch (error) {
    if (error instanceof RangeError || /memory|allocation|array buffer/i.test(error.message || '')) {
      throw new Error('Not enough browser memory to open this PDF. Try a device with more available RAM.');
    }
    throw error;
  }
}

function parsePageSelection(input, maxPages) {
  const text = String(input || '').trim();
  if (!text) throw new Error('Enter at least one page or page range.');

  const result = new Set();
  const tokens = text.split(',').map(t => t.trim()).filter(Boolean);
  if (!tokens.length) throw new Error('Enter a valid page selection.');

  for (const token of tokens) {
    const range = token.match(/^(\d+)\s*-\s*(\d+)$/);
    const single = token.match(/^\d+$/);

    if (range) {
      let start = Number(range[1]);
      let end = Number(range[2]);
      if (start > end) [start, end] = [end, start];
      if (start < 1 || end > maxPages) {
        throw new Error(`Page range ${token} is outside 1-${maxPages}.`);
      }
      for (let page = start; page <= end; page++) result.add(page - 1);
    } else if (single) {
      const page = Number(token);
      if (page < 1 || page > maxPages) {
        throw new Error(`Page ${page} is outside 1-${maxPages}.`);
      }
      result.add(page - 1);
    } else {
      throw new Error(`Invalid page selection: ${token}`);
    }
  }

  return Array.from(result).sort((a, b) => a - b);
}

function parseSplitGroups(input, maxPages) {
  const text = String(input || '').trim();
  if (!text) throw new Error('Enter custom ranges, for example 1-3,4-6,7-10.');
  const tokens = text.split(',').map(t => t.trim()).filter(Boolean);
  if (!tokens.length) throw new Error('Enter at least one custom range.');

  return tokens.map(token => {
    const range = token.match(/^(\d+)\s*-\s*(\d+)$/);
    const single = token.match(/^\d+$/);
    let start;
    let end;

    if (range) {
      start = Number(range[1]);
      end = Number(range[2]);
      if (start > end) [start, end] = [end, start];
    } else if (single) {
      start = Number(token);
      end = start;
    } else {
      throw new Error(`Invalid custom range: ${token}`);
    }

    if (start < 1 || end > maxPages) {
      throw new Error(`Range ${token} is outside 1-${maxPages}.`);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start - 1 + i);
  });
}

function describePages(indices) {
  if (indices.length === 1) return `page-${indices[0] + 1}`;
  return `pages-${indices[0] + 1}-${indices[indices.length - 1] + 1}`;
}

function setupDropzone(zone, input, handler) {
  ['dragenter', 'dragover'].forEach(eventName => {
    zone.addEventListener(eventName, event => {
      event.preventDefault();
      zone.classList.add('dragging');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    zone.addEventListener(eventName, event => {
      event.preventDefault();
      zone.classList.remove('dragging');
    });
  });

  zone.addEventListener('drop', event => handler(Array.from(event.dataTransfer?.files || [])));
  input.addEventListener('change', event => {
    handler(Array.from(event.target.files || []));
    input.value = '';
  });
}

function switchTool(tool) {
  $$('.tool-tab').forEach(button => button.classList.toggle('active', button.dataset.tool === tool));
  $$('.tool-panel').forEach(panel => panel.classList.toggle('active', panel.id === `panel-${tool}`));
  window.scrollTo({ top: Math.max(0, $('.tool-tabs').offsetTop - 90), behavior: 'smooth' });
  lucide.createIcons();
}

function updateMergeStats() {
  const files = mergeState.files.length;
  const pages = mergeState.files.reduce((sum, item) => sum + item.pages, 0);
  const bytes = mergeState.files.reduce((sum, item) => sum + item.file.size, 0);
  $('#merge-files-stat').textContent = `${files} file${files === 1 ? '' : 's'}`;
  $('#merge-pages-stat').textContent = `${pages} page${pages === 1 ? '' : 's'}`;
  $('#merge-size-stat').textContent = formatBytes(bytes);
  $('#merge-run').disabled = files < 2;
  $('#merge-sort').disabled = files < 2;
  $('#merge-clear').disabled = files === 0;
}

function renderMergeList() {
  const list = $('#merge-list');
  const empty = $('#merge-empty');
  list.innerHTML = '';

  if (!mergeState.files.length) {
    empty.hidden = false;
    updateMergeStats();
    return;
  }

  empty.hidden = true;
  mergeState.files.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'file-row';
    row.dataset.id = item.id;
    row.innerHTML = `
      <div class="file-drag" title="Drag to reorder"><i data-lucide="grip-vertical"></i></div>
      <div class="file-main">
        <div class="file-name" title="${escapeHtml(item.file.name)}">${escapeHtml(item.file.name)}</div>
        <div class="file-meta">#${index + 1} · ${item.pages} page${item.pages === 1 ? '' : 's'} · ${formatBytes(item.file.size)}</div>
      </div>
      <button class="icon-button remove-merge" data-id="${item.id}" aria-label="Remove ${escapeHtml(item.file.name)}"><i data-lucide="x"></i></button>`;
    list.appendChild(row);
  });

  $$('.remove-merge', list).forEach(button => {
    button.addEventListener('click', () => {
      mergeState.files = mergeState.files.filter(item => item.id !== button.dataset.id);
      renderMergeList();
    });
  });

  updateMergeStats();
  lucide.createIcons();
}

async function addMergeFiles(files) {
  if (!files.length) return;
  let added = 0;
  let rejected = 0;

  for (const file of files) {
    try {
      const info = await loadPdfInfo(file);
      mergeState.files.push({ id: `merge-${mergeState.counter++}`, file, pages: info.pages });
      added++;
    } catch (error) {
      rejected++;
      toast(`${file.name || 'File'}: ${error.message}`, 'error', 4800);
    }
  }

  if (added) {
    renderMergeList();
    const currentName = $('#merge-name').value.trim();
    if (!currentName || currentName === 'merged-document') $('#merge-name').value = 'merged-document';
    toast(`${added} PDF${added === 1 ? '' : 's'} added.`, 'success');
  }
  if (rejected && !added) updateMergeStats();
}

async function mergePdfs() {
  if (mergeState.files.length < 2) return;
  const button = $('#merge-run');
  const note = $('#merge-progress');

  try {
    setLoading(button, true, 'Merging PDFs…');
    const output = await PDFDocument.create();

    for (let i = 0; i < mergeState.files.length; i++) {
      note.textContent = `Processing ${i + 1} of ${mergeState.files.length}: ${mergeState.files[i].file.name}`;
      const bytes = await mergeState.files[i].file.arrayBuffer();
      const source = await PDFDocument.load(bytes);
      const pages = await output.copyPages(source, source.getPageIndices());
      pages.forEach(page => output.addPage(page));
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    note.textContent = 'Preparing download…';
    const bytes = await output.save({ useObjectStreams: true });
    const name = `${sanitizeBaseName($('#merge-name').value, 'merged-document')}.pdf`;
    downloadBytes(name, bytes);
    toast(`Merged ${mergeState.files.length} PDFs successfully.`, 'success');
  } catch (error) {
    console.error(error);
    toast(error.message || 'Could not merge these PDFs.', 'error', 5000);
  } finally {
    note.textContent = '';
    setLoading(button, false);
    updateMergeStats();
  }
}

function updateSingleSummary(prefix, state) {
  const summary = $(`#${prefix}-summary`);
  if (!state.file) {
    summary.classList.remove('show');
    $(`#${prefix}-run`).disabled = true;
    return;
  }
  summary.classList.add('show');
  $(`#${prefix}-summary-name`).textContent = state.file.name;
  $(`#${prefix}-summary-meta`).textContent = `${state.pages} page${state.pages === 1 ? '' : 's'} · ${formatBytes(state.file.size)}`;
  $(`#${prefix}-run`).disabled = false;
  lucide.createIcons();
}

async function setSinglePdf(files, state, prefix) {
  const file = files.find(isPdfFile) || files[0];
  if (!file) return;

  try {
    const info = await loadPdfInfo(file);
    state.file = file;
    state.pages = info.pages;
    updateSingleSummary(prefix, state);
    const base = sanitizeBaseName(file.name, 'document');

    if (prefix === 'split') {
      $('#split-name').value = `${base}-split`;
      $('#split-custom').placeholder = `Example: 1-${Math.min(3, info.pages)},${Math.min(4, info.pages)}-${Math.min(6, info.pages)}`;
    } else {
      updatePageOutputName();
      $('#pages-selection').placeholder = `Example: 1-${Math.min(3, info.pages)}, 5`;
    }

    toast(`${file.name} loaded (${info.pages} pages).`, 'success');
  } catch (error) {
    state.file = null;
    state.pages = 0;
    updateSingleSummary(prefix, state);
    toast(error.message || 'Could not read that PDF.', 'error', 5000);
  }
}

function updateSplitOptions() {
  const mode = $('input[name="split-mode"]:checked')?.value || 'each';
  $('#split-chunk-wrap').classList.toggle('show', mode === 'chunk');
  $('#split-custom-wrap').classList.toggle('show', mode === 'custom');
}

function buildSplitGroups() {
  const mode = $('input[name="split-mode"]:checked')?.value || 'each';
  const max = splitState.pages;

  if (mode === 'each') {
    return Array.from({ length: max }, (_, index) => [index]);
  }

  if (mode === 'chunk') {
    const size = Number($('#split-chunk').value);
    if (!Number.isInteger(size) || size < 1) throw new Error('Pages per file must be at least 1.');
    const groups = [];
    for (let start = 0; start < max; start += size) {
      groups.push(Array.from({ length: Math.min(size, max - start) }, (_, i) => start + i));
    }
    return groups;
  }

  return parseSplitGroups($('#split-custom').value, max);
}

async function splitPdf() {
  if (!splitState.file) return;
  const button = $('#split-run');
  const note = $('#split-progress');

  try {
    const groups = buildSplitGroups();
    if (groups.length > 250) throw new Error('This split would create more than 250 files. Use larger chunks.');

    setLoading(button, true, 'Creating split files…');
    const sourceBytes = await splitState.file.arrayBuffer();
    const source = await PDFDocument.load(sourceBytes);
    const zip = new JSZip();
    const base = sanitizeBaseName($('#split-name').value, `${sanitizeBaseName(splitState.file.name)}-split`);

    for (let i = 0; i < groups.length; i++) {
      const indices = groups[i];
      note.textContent = `Creating file ${i + 1} of ${groups.length}…`;
      const doc = await PDFDocument.create();
      const pages = await doc.copyPages(source, indices);
      pages.forEach(page => doc.addPage(page));
      const bytes = await doc.save({ useObjectStreams: true });
      const number = String(i + 1).padStart(2, '0');
      zip.file(`${base}-${number}-${describePages(indices)}.pdf`, bytes);
      if (i % 5 === 0) await new Promise(resolve => setTimeout(resolve, 0));
    }

    note.textContent = 'Packaging PDFs into a ZIP…';
    const blob = await zip.generateAsync(
      { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
      meta => { note.textContent = `Packaging ZIP… ${Math.round(meta.percent)}%`; }
    );
    downloadBlob(`${base}.zip`, blob);
    toast(`Created ${groups.length} PDF file${groups.length === 1 ? '' : 's'} in a ZIP.`, 'success');
  } catch (error) {
    console.error(error);
    toast(error.message || 'Could not split this PDF.', 'error', 5200);
  } finally {
    note.textContent = '';
    setLoading(button, false);
    updateSingleSummary('split', splitState);
  }
}

function pageAction() {
  return $('input[name="page-action"]:checked')?.value || 'extract';
}

function updatePageOutputName() {
  if (!pageState.file) return;
  const base = sanitizeBaseName(pageState.file.name, 'document');
  const suffixMap = {
    extract: 'extracted',
    remove: 'trimmed',
    rotateLeft: 'rotated-left',
    rotateRight: 'rotated-right'
  };
  $('#pages-name').value = `${base}-${suffixMap[pageAction()]}`;
}

async function processPages() {
  if (!pageState.file) return;
  const button = $('#pages-run');
  const note = $('#pages-progress');

  try {
    const selected = parsePageSelection($('#pages-selection').value, pageState.pages);
    const action = pageAction();
    setLoading(button, true, 'Processing pages…');
    note.textContent = `Applying ${action} to ${selected.length} selected page${selected.length === 1 ? '' : 's'}…`;

    const sourceBytes = await pageState.file.arrayBuffer();
    const source = await PDFDocument.load(sourceBytes);
    const output = await PDFDocument.create();

    if (action === 'extract') {
      const pages = await output.copyPages(source, selected);
      pages.forEach(page => output.addPage(page));
    } else if (action === 'remove') {
      const selectedSet = new Set(selected);
      const keep = source.getPageIndices().filter(index => !selectedSet.has(index));
      if (!keep.length) throw new Error('You cannot remove every page from the PDF.');
      const pages = await output.copyPages(source, keep);
      pages.forEach(page => output.addPage(page));
    } else {
      const allIndices = source.getPageIndices();
      const pages = await output.copyPages(source, allIndices);
      const selectedSet = new Set(selected);
      const delta = action === 'rotateLeft' ? -90 : 90;

      pages.forEach((page, index) => {
        if (selectedSet.has(index)) {
          const current = page.getRotation().angle || 0;
          const normalized = ((current + delta) % 360 + 360) % 360;
          page.setRotation(degrees(normalized));
        }
        output.addPage(page);
      });
    }

    const bytes = await output.save({ useObjectStreams: true });
    const filename = `${sanitizeBaseName($('#pages-name').value, 'processed-document')}.pdf`;
    downloadBytes(filename, bytes);
    toast('Page operation completed successfully.', 'success');
  } catch (error) {
    console.error(error);
    toast(error.message || 'Could not process these pages.', 'error', 5200);
  } finally {
    note.textContent = '';
    setLoading(button, false);
    updateSingleSummary('pages', pageState);
  }
}

function initialize() {
  lucide.createIcons();

  $$('.tool-tab').forEach(button => button.addEventListener('click', () => switchTool(button.dataset.tool)));

  setupDropzone($('#merge-dropzone'), $('#merge-input'), addMergeFiles);
  setupDropzone($('#split-dropzone'), $('#split-input'), files => setSinglePdf(files, splitState, 'split'));
  setupDropzone($('#pages-dropzone'), $('#pages-input'), files => setSinglePdf(files, pageState, 'pages'));

  new Sortable($('#merge-list'), {
    animation: 160,
    ghostClass: 'sortable-ghost',
    handle: '.file-drag',
    onEnd: () => {
      const order = $$('.file-row', $('#merge-list')).map(row => row.dataset.id);
      mergeState.files = order.map(id => mergeState.files.find(item => item.id === id)).filter(Boolean);
      renderMergeList();
    }
  });

  $('#merge-sort').addEventListener('click', () => {
    const firstNumber = name => Number(name.match(/\d+/)?.[0] ?? Number.MAX_SAFE_INTEGER);
    mergeState.files.sort((a, b) => {
      const diff = firstNumber(a.file.name) - firstNumber(b.file.name);
      return diff || a.file.name.localeCompare(b.file.name, undefined, { numeric: true, sensitivity: 'base' });
    });
    renderMergeList();
    toast('Files sorted by the first number in each filename.', 'info');
  });

  $('#merge-clear').addEventListener('click', () => {
    mergeState.files = [];
    renderMergeList();
    toast('Merge list cleared.', 'info');
  });
  $('#merge-run').addEventListener('click', mergePdfs);

  $$('input[name="split-mode"]').forEach(input => input.addEventListener('change', updateSplitOptions));
  $('#split-run').addEventListener('click', splitPdf);

  $$('input[name="page-action"]').forEach(input => input.addEventListener('change', updatePageOutputName));
  $('#pages-run').addEventListener('click', processPages);

  window.addEventListener('dragover', event => event.preventDefault());
  window.addEventListener('drop', event => event.preventDefault());

  renderMergeList();
  updateSplitOptions();
  updateSingleSummary('split', splitState);
  updateSingleSummary('pages', pageState);
}

document.addEventListener('DOMContentLoaded', initialize);
