var DB_NAME = 'clamshell-reader';
var DB_VERSION = 1;
var STORE = 'books';

function openDB() {
  return new Promise(function(resolve, reject) {
    var req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = function() {
      var db = req.result;
      if (!db.objectStoreNames.contains(STORE))
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = function() { resolve(req.result); };
    req.onerror = function() { reject(req.error); };
  });
}
async function saveBook(title, text) {
  var db = await openDB();
  return new Promise(function(resolve, reject) {
    var tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).add({ title: title, text: text, addedAt: Date.now() });
    tx.oncomplete = function() { resolve(); };
    tx.onerror = function() { reject(tx.error); };
  });
}
async function getAllBooks() {
  var db = await openDB();
  return new Promise(function(resolve, reject) {
    var tx = db.transaction(STORE, 'readonly');
    var req = tx.objectStore(STORE).getAll();
    req.onsuccess = function() { resolve(req.result); };
    req.onerror = function() { reject(req.error); };
  });
}
async function deleteBook(id) {
  var db = await openDB();
  return new Promise(function(resolve, reject) {
    var tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = function() { resolve(); };
    tx.onerror = function() { reject(tx.error); };
  });
}
function getLastReadId() { try { return parseInt(localStorage.getItem('lastReadId')) || null; } catch(e) { return null; } }
function setLastReadId(id) { try { localStorage.setItem('lastReadId', String(id)); } catch(e) {} }
function getScrollPos(id) { try { return parseFloat(localStorage.getItem('scroll_' + id)) || 0; } catch(e) { return 0; } }
function saveScrollPos(id, pos) { try { localStorage.setItem('scroll_' + id, String(pos)); } catch(e) {} }

var grainSVG = (function() {
  var svg = "<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='200' height='200' filter='url(%23n)' opacity='0.06'/></svg>";
  return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
})();

var CIRCLE_D = 330, CIRCLE_R = 165, BEZEL = 4;
var RECT_W = Math.floor(CIRCLE_R * 1.55);
var RECT_H = Math.floor(Math.sqrt(CIRCLE_R * CIRCLE_R - (RECT_W / 2) * (RECT_W / 2)) * 2 * 0.9);
var HINGE_AREA_H = 50;
var HINGE_BAR_W = 180;

var currentBook = null, scrollOffset = 0, maxScroll = 0, totalTextHeight = 0;
var libraryOpen = false, books = [];
var topText, bottomText, measureDiv, overlay, bookList, fileInput;
var topScreenEl, bottomScreenEl, hingeBarEl, shellEl;

var DEFAULT_TEXT = 'Open in safari, then Share->Add to Home Screen. Download txt files from https://www.gutenberg.org. Insert via book icon on the bottom right.';

function el(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }

function buildReader() {
  shellEl = document.getElementById('shell');
  shellEl.innerHTML = '';

  shellEl.appendChild(el('div', 'shell-vignette'));

  topScreenEl = buildScreen('top');
  shellEl.appendChild(topScreenEl);

  var hingeArea = el('div', 'hinge-area');
  hingeArea.style.height = HINGE_AREA_H + 'px';
  hingeBarEl = el('div', 'hinge');
  hingeBarEl.style.width = HINGE_BAR_W + 'px';
  hingeArea.appendChild(hingeBarEl);
  shellEl.appendChild(hingeArea);

  bottomScreenEl = buildScreen('bottom');
  shellEl.appendChild(bottomScreenEl);

  var libBtn = document.createElement('button');
  libBtn.className = 'library-btn';
  libBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/></svg>';
  libBtn.addEventListener('click', toggleLibrary);
  shellEl.appendChild(libBtn);

  overlay = el('div', 'library-overlay');
  overlay.addEventListener('click', function(e) { if (e.target === overlay) toggleLibrary(); });
  var panel = el('div', 'library-panel');
  var h2 = document.createElement('h2'); h2.textContent = 'Library'; panel.appendChild(h2);
  var hint = document.createElement('p'); hint.textContent = 'Upload .txt files. Books are stored on this device.'; panel.appendChild(hint);
  var uploadBtn = document.createElement('button'); uploadBtn.className = 'upload-btn'; uploadBtn.textContent = '+ Upload a text file';
  uploadBtn.addEventListener('click', function() { fileInput.click(); }); panel.appendChild(uploadBtn);
  bookList = el('div', 'book-list'); panel.appendChild(bookList);
  var closeBtn = document.createElement('button'); closeBtn.className = 'close-library'; closeBtn.textContent = 'Close';
  closeBtn.addEventListener('click', toggleLibrary); panel.appendChild(closeBtn);
  overlay.appendChild(panel); shellEl.appendChild(overlay);

  fileInput = document.createElement('input'); fileInput.type = 'file'; fileInput.accept = '.txt,text/plain';
  fileInput.style.display = 'none'; fileInput.addEventListener('change', handleFileUpload); shellEl.appendChild(fileInput);

  topText = document.getElementById('top-text');
  bottomText = document.getElementById('bottom-text');
  measureDiv = document.getElementById('measure');

  document.querySelectorAll('.bezel').forEach(function(b) { b.style.width = (CIRCLE_D + BEZEL * 2) + 'px'; b.style.height = (CIRCLE_D + BEZEL * 2) + 'px'; });
  document.querySelectorAll('.screen').forEach(function(s) { s.style.width = CIRCLE_D + 'px'; s.style.height = CIRCLE_D + 'px'; });
  document.querySelectorAll('.screen-grain').forEach(function(g) { g.style.backgroundImage = grainSVG; });
  document.querySelectorAll('.text-clip').forEach(function(c) { c.style.width = RECT_W + 'px'; c.style.height = RECT_H + 'px'; });
  document.querySelectorAll('.text-body').forEach(function(t) { t.style.width = RECT_W + 'px'; });
  measureDiv.style.width = RECT_W + 'px';
}

function buildScreen(id) {
  var bezel = el('div', 'bezel');
  bezel.appendChild(el('div', 'bezel-glow'));
  var screen = el('div', 'screen');
  screen.appendChild(el('div', 'screen-hotspot'));
  screen.appendChild(el('div', 'screen-grain'));
  var clip = el('div', 'text-clip');
  var textDiv = document.createElement('div'); textDiv.className = 'text-body'; textDiv.id = id + '-text';
  clip.appendChild(textDiv); screen.appendChild(clip); bezel.appendChild(screen);
  return bezel;
}

function buildWedges() {
  var existing = document.getElementById('wedge-svg');
  if (existing) existing.remove();

  var shellRect = shellEl.getBoundingClientRect();
  var topRect = topScreenEl.getBoundingClientRect();
  var botRect = bottomScreenEl.getBoundingClientRect();
  var hingeRect = hingeBarEl.getBoundingClientRect();

  var topY = topRect.top + topRect.height * 3/4 - shellRect.top;
  var botY = botRect.top + botRect.height * 1/4 - shellRect.top;
  var hingeY = hingeRect.top + hingeRect.height / 2 - shellRect.top;
  var hingeLeft = hingeRect.left - shellRect.left;
  var hingeRight = hingeRect.right - shellRect.left;
  var sw = shellRect.width;

  var svgNS = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(svgNS, 'svg');
  svg.id = 'wedge-svg';
  svg.style.position = 'absolute';
  svg.style.top = '0';
  svg.style.left = '0';
  svg.style.width = '100%';
  svg.style.height = '100%';
  svg.style.pointerEvents = 'none';
  svg.style.zIndex = '4';

  var left = document.createElementNS(svgNS, 'polygon');
  left.setAttribute('points', '0,' + topY + ' 0,' + botY + ' ' + hingeLeft + ',' + hingeY);
  left.setAttribute('fill', '#0a0a0a');
  svg.appendChild(left);

  var right = document.createElementNS(svgNS, 'polygon');
  right.setAttribute('points', sw + ',' + topY + ' ' + sw + ',' + botY + ' ' + hingeRight + ',' + hingeY);
  right.setAttribute('fill', '#0a0a0a');
  svg.appendChild(right);

  shellEl.appendChild(svg);
}

function setText(text) {
  topText.textContent = text;
  bottomText.textContent = text;
  measureDiv.textContent = text;
  requestAnimationFrame(function() {
    totalTextHeight = measureDiv.scrollHeight;
    maxScroll = Math.max(0, totalTextHeight - RECT_H * 2);
    applyScroll();
  });
}

function applyScroll() {
  topText.style.transform = 'translateY(-' + scrollOffset + 'px)';
  bottomText.style.transform = 'translateY(-' + (scrollOffset + RECT_H) + 'px)';
}

var touchStartYVal = 0, touchScrollStartVal = 0;
function onTouchStart(e) { if (libraryOpen) return; touchStartYVal = e.touches[0].clientY; touchScrollStartVal = scrollOffset; }
function onTouchMove(e) { if (libraryOpen) return; e.preventDefault(); var delta = touchStartYVal - e.touches[0].clientY; scrollOffset = Math.max(0, Math.min(touchScrollStartVal + delta, maxScroll)); applyScroll(); }
function onTouchEnd() { if (currentBook) saveScrollPos(currentBook.id, scrollOffset); }
function onWheel(e) { if (libraryOpen) return; e.preventDefault(); scrollOffset = Math.max(0, Math.min(scrollOffset + e.deltaY * 0.5, maxScroll)); applyScroll(); if (currentBook) saveScrollPos(currentBook.id, scrollOffset); }

function toggleLibrary() { libraryOpen = !libraryOpen; overlay.classList.toggle('open', libraryOpen); if (libraryOpen) renderBookList(); }

async function renderBookList() {
  books = await getAllBooks(); bookList.innerHTML = '';
  if (books.length === 0) return;
  books.forEach(function(book) {
    var item = el('div', 'book-item');
    var title = document.createElement('span'); title.className = 'book-title'; title.textContent = book.title; item.appendChild(title);
    var del = document.createElement('button'); del.className = 'book-delete'; del.textContent = '\u00d7';
    del.addEventListener('click', async function(e) { e.stopPropagation(); await deleteBook(book.id); if (currentBook && currentBook.id === book.id) { currentBook = null; setText(DEFAULT_TEXT); scrollOffset = 0; } renderBookList(); });
    item.appendChild(del);
    item.addEventListener('click', async function() { await loadBook(book); toggleLibrary(); });
    bookList.appendChild(item);
  });
}

async function loadBook(book) { currentBook = book; setLastReadId(book.id); scrollOffset = getScrollPos(book.id); setText(book.text); }

async function handleFileUpload(e) {
  var file = e.target.files[0]; if (!file) return;
  var text = await file.text(); var title = file.name.replace(/\.txt$/i, '');
  await saveBook(title, text); var allBooks = await getAllBooks(); var added = allBooks[allBooks.length - 1];
  await loadBook(added); renderBookList(); fileInput.value = '';
}

async function init() {
  buildReader();
  shellEl.addEventListener('touchstart', onTouchStart, { passive: true });
  shellEl.addEventListener('touchmove', onTouchMove, { passive: false });
  shellEl.addEventListener('touchend', onTouchEnd, { passive: true });
  shellEl.addEventListener('wheel', onWheel, { passive: false });

  var lastId = getLastReadId(); books = await getAllBooks();
  if (lastId) { var book = books.find(function(b) { return b.id === lastId; }); if (book) { await loadBook(book); requestAnimationFrame(buildWedges); return; } }
  if (books.length > 0) { await loadBook(books[books.length - 1]); } else { setText(DEFAULT_TEXT); }
  requestAnimationFrame(buildWedges);
}

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(function() {});
document.addEventListener('DOMContentLoaded', init);
