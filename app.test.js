import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Exercise the actual app event handlers with a small DOM/pointer-capture fixture.
// Layout below models the scroll surface; real browser rendering is a separate check.
class Node {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase(); this.children = []; this.dataset = {}; this.style = { setProperty() {} };
    this.handlers = {}; this.captured = new Set(); this.classes = new Set(); this.value = ''; this.hidden = false;
    this.classList = {
      add: name => this.classes.add(name), remove: name => this.classes.delete(name),
      toggle: (name, on = !this.classes.has(name)) => on ? this.classes.add(name) : this.classes.delete(name),
    };
  }
  set className(value) { this.classes = new Set(value.split(' ')); }
  get className() { return [...this.classes].join(' '); }
  append(...nodes) { for (const node of nodes) { node.parentElement = this; this.children.push(node); } }
  replaceChildren(...nodes) { this.children = []; this.append(...nodes); }
  setAttribute() {}
  addEventListener(type, handler) { (this.handlers[type] ??= []).push(handler); }
  closest(selector) {
    const matches = selector === '.box' ? this.classes.has('box') : selector === '[data-handle]' ? !!this.dataset.handle : selector.split(',').includes(this.tagName.toLowerCase());
    return matches ? this : this.parentElement?.closest(selector) ?? null;
  }
  setPointerCapture(id) { this.captured.add(id); }
  hasPointerCapture(id) { return this.captured.has(id); }
  releasePointerCapture(id) { this.captured.delete(id); }
  getBoundingClientRect() { return this.rect?.() ?? { left: 0, top: 0, width: 800, height: 500 }; }
}

test('resizing in draw mode, zoom, scrolling, and pointer cancellation', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const ids = [...(await readFile(new URL('./index.html', import.meta.url), 'utf8')).matchAll(/id="([^"]+)"/g)].map(m => m[1]);
  const nodes = Object.fromEntries(ids.map(id => [id, new Node()]));
  nodes['box-name'].tagName = 'INPUT';
  const doc = new Node();
  doc.getElementById = id => nodes[id]; doc.createElement = tag => new Node(tag); doc.querySelectorAll = () => [];
  const previous = Object.fromEntries(['document', 'window', 'ResizeObserver', 'Image'].map(key => [key, globalThis[key]]));
  globalThis.document = doc; globalThis.window = new Node();
  globalThis.ResizeObserver = class { observe() {} };
  globalThis.Image = class { naturalWidth = 1000; naturalHeight = 600; async decode() {} };
  const view = nodes.viewport, surface = nodes['canvas-content'], stage = nodes.stage, overlay = nodes.overlay;
  view.clientWidth = 800; view.clientHeight = 500;
  let scrollLeft = 0, scrollTop = 0;
  Object.defineProperties(view, {
    scrollLeft: { get: () => scrollLeft, set: value => { scrollLeft = Math.max(0, Math.min(value, parseFloat(surface.style.width) - view.clientWidth)); } },
    scrollTop: { get: () => scrollTop, set: value => { scrollTop = Math.max(0, Math.min(value, parseFloat(surface.style.height) - view.clientHeight)); } },
  });
  stage.rect = () => ({ left: (parseFloat(surface.style.width) - parseFloat(stage.style.width)) / 2 - scrollLeft, top: (parseFloat(surface.style.height) - parseFloat(stage.style.height)) / 2 - scrollTop, width: parseFloat(stage.style.width), height: parseFloat(stage.style.height) });
  const emit = (node, type, options = {}) => {
    const event = { button: 0, pointerId: 1, target: node, preventDefault() {}, ...options };
    for (const handler of node.handlers[type] ?? []) handler(event);
  };
  const pointer = (node, type, x, y, options = {}) => {
    const rect = stage.getBoundingClientRect();
    emit(overlay, type, { target: node, clientX: rect.left + x * rect.width / 1000, clientY: rect.top + y * rect.height / 600, ...options });
  };
  const coords = () => Object.fromEntries(nodes.coordinates.children.map(cell => cell.children.map(n => n.textContent)));
  const draw = (x, y, right, bottom) => { pointer(overlay, 'pointerdown', x, y); pointer(overlay, 'pointermove', right, bottom); pointer(overlay, 'pointerup', right, bottom); };
  try {
    await import('./app.js');
    const file = new Blob(['fixture'], { type: 'image/png' }); file.name = 'fixture.png';
    await nodes.file.onchange({ target: { files: [file] } });
    // File input callback starts async decode; flush it before interacting.
    await new Promise(resolve => setImmediate(resolve));
    await t.test('draw-mode resize changes the box instead of creating another', () => {
      draw(100, 100, 300, 300);
      const box = overlay.children[0], handle = box.children.find(n => n.dataset.handle === 'se');
      pointer(handle, 'pointerdown', 300, 300); pointer(overlay, 'pointermove', 400, 350); pointer(overlay, 'pointerup', 400, 350);
      assert.equal(overlay.children.length, 1);
      assert.deepEqual(coords(), { x_min: 100, y_min: 167, x_max: 400, y_max: 583 });
      assert.equal(overlay.hasPointerCapture(1), false);
    });
    await t.test('existing box moves in draw mode and undo/redo retain its size', () => {
      pointer(overlay.children[0], 'pointerdown', 200, 200); pointer(overlay, 'pointermove', 250, 230); pointer(overlay, 'pointerup', 250, 230);
      assert.equal(overlay.children.length, 1); assert.equal(coords().x_min, 150);
      nodes.undo.onclick(); assert.equal(coords().x_min, 100);
      nodes.redo.onclick(); assert.equal(coords().x_min, 150);
    });
    await t.test('zoom enlarges the scroll surface without changing coordinates', () => {
      const before = coords();
      nodes['zoom-actual'].onclick();
      assert.equal(stage.style.width, '1000px'); assert.equal(nodes['zoom-level'].textContent, '100%');
      nodes['zoom-in'].onclick();
      assert.equal(stage.style.width, '1250px'); assert.ok(parseFloat(surface.style.width) > view.clientWidth);
      assert.deepEqual(coords(), before);
      emit(view, 'wheel', { shiftKey: true, deltaY: 70, deltaX: 0, deltaMode: 0 });
      assert.ok(scrollLeft > 0);
    });
    await t.test('resizing after zoom and horizontal scroll uses original image units', () => {
      const handle = overlay.children[0].children.find(n => n.dataset.handle === 'e');
      pointer(handle, 'pointerdown', 450, 250); pointer(overlay, 'pointermove', 500, 250); pointer(overlay, 'pointerup', 500, 250);
      assert.equal(coords().x_max, 500); assert.equal(overlay.children.length, 1);
    });
    await t.test('cancel and unexpected capture loss restore geometry', () => {
      const before = coords();
      pointer(overlay.children[0], 'pointerdown', 200, 200); pointer(overlay, 'pointermove', 700, 500);
      emit(overlay, 'pointercancel'); assert.deepEqual(coords(), before);
      pointer(overlay.children[0], 'pointerdown', 200, 200); pointer(overlay, 'pointermove', 700, 500);
      emit(overlay, 'lostpointercapture'); assert.deepEqual(coords(), before);
    });
    await t.test('space-drag pans without drawing, and fit resets the view', () => {
      const before = coords(), oldLeft = scrollLeft;
      emit(doc, 'keydown', { key: ' ', target: overlay });
      pointer(overlay, 'pointerdown', 20, 20);
      emit(view, 'pointerdown', { clientX: 300, clientY: 250 });
      emit(view, 'pointermove', { clientX: 200, clientY: 200 });
      assert.equal(scrollLeft, oldLeft + 100);
      emit(view, 'pointerup'); emit(doc, 'keyup', { key: ' ' });
      assert.equal(overlay.children.length, 1); assert.deepEqual(coords(), before);
      nodes['zoom-fit'].onclick(); assert.equal(scrollLeft, 0); assert.equal(scrollTop, 0);
      assert.ok(parseFloat(surface.style.width) <= view.clientWidth);
    });
    await t.test('wheel zoom stays anchored at the pointer', () => {
      nodes['zoom-actual'].onclick();
      const before = stage.getBoundingClientRect(), x = 400, y = 250;
      const imageX = (x - before.left) / (before.width / 1000);
      emit(view, 'wheel', { ctrlKey: true, deltaY: -80, deltaMode: 0, clientX: x, clientY: y });
      const after = stage.getBoundingClientRect();
      assert.ok(Math.abs((x - after.left) / (after.width / 1000) - imageX) < .0001);
    });
    await t.test('coordinate settings update display, clipboard, and JSON without moving boxes', async () => {
      const geometryBefore = overlay.children[0].style.cssText;
      nodes['normalization-points'].value = '2000'; nodes['normalization-points'].onchange();
      assert.equal(coords().x_min, 300); assert.equal(coords().x_max, 1000);
      assert.equal(nodes['coordinate-unit'].textContent, '0–2000');
      const navDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
      const createURL = URL.createObjectURL;
      let copied, exported;
      Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: { async writeText(value) { copied = value; } } } });
      URL.createObjectURL = blob => { exported = blob; return createURL(blob); };
      const createElement = doc.createElement;
      doc.createElement = tag => { const node = createElement(tag); node.click = () => {}; return node; };
      try {
        await nodes.copy.onclick();
        assert.equal(copied, Object.entries(coords()).map(([key, value]) => `${key}: ${value}`).join(', '));
        assert.equal(/["{}\[\]]/.test(copied), false);
        nodes.export.onclick();
        let data = JSON.parse(await exported.text());
        assert.equal(data.coordinate_system.normalized, true); assert.equal(data.coordinate_system.scale, 2000);
        assert.equal(data.groups[0].boxes[0].x_max, 1000);
        nodes.normalize.checked = false; nodes.normalize.onchange();
        assert.equal(nodes['normalization-points'].disabled, true);
        assert.equal(nodes['coordinate-unit'].textContent, 'Pixels');
        assert.equal(coords().x_min, 150); assert.equal(coords().x_max, 500);
        await nodes.copy.onclick();
        const copiedPixels = Object.fromEntries(copied.split(', ').map(pair => { const [key, value] = pair.split(': '); return [key, Number(value)]; }));
        assert.equal(Math.round(copiedPixels.x_min), 150);
        nodes.export.onclick(); data = JSON.parse(await exported.text());
        assert.deepEqual(data.coordinate_system, { normalized: false, units: 'pixels', origin: 'top-left', rounding: 'none' });
        assert.equal(data.groups[0].boxes[0].x_min, data.groups[0].boxes[0].pixels.x);
        assert.equal(data.groups[0].boxes[0].x_min, copiedPixels.x_min);
        nodes.normalize.checked = true; nodes.normalize.onchange();
        assert.equal(coords().x_min, 300); assert.equal(nodes['normalization-points'].disabled, false);
        assert.equal(overlay.children[0].style.cssText, geometryBefore);
      } finally {
        URL.createObjectURL = createURL; doc.createElement = createElement;
        if (navDescriptor) Object.defineProperty(globalThis, 'navigator', navDescriptor); else delete globalThis.navigator;
      }
    });
    await t.test('invalid normalization scales retain the last valid scale', () => {
      for (const value of ['', '0', '-1', '2.5', 'NaN', '1000001']) {
        nodes['normalization-points'].value = value; nodes['normalization-points'].onchange();
        assert.equal(nodes['normalization-points'].value, 2000); assert.equal(coords().x_min, 300);
      }
    });
    const groupCheckbox = index => nodes.groups.children[index].children[0].children.find(node => node.className === 'group-visibility').children[0];
    const showGroup = (index, checked) => { const checkbox = groupCheckbox(index); checkbox.checked = checked; emit(checkbox, 'change'); };
    await t.test('group visibility hides overlapping boxes, clears selection, and restores geometry', () => {
      nodes['add-group'].onclick(); draw(100, 100, 300, 300);
      assert.equal(overlay.children.length, 2);
      const before = overlay.children.map(node => [node.dataset.id, node.style.cssText]);
      showGroup(0, false);
      assert.equal(overlay.children.length, 1);
      assert.ok(nodes.groups.children[1].classes.has('active'), 'hiding a group must not activate it');
      assert.equal(nodes['box-count'].textContent, '2 boxes · 1 visible');
      showGroup(1, false);
      assert.equal(overlay.children.length, 0);
      assert.equal(nodes.properties.hidden, true);
      for (const group of nodes.groups.children) assert.ok(group.children.find(node => node.className.includes('box-row')).disabled);
      showGroup(0, true); showGroup(1, true);
      assert.deepEqual(overlay.children.map(node => [node.dataset.id, node.style.cssText]), before);
      assert.equal(nodes['box-count'].textContent, '2 boxes');
    });
    await t.test('annotation undo/redo leaves group visibility preferences intact', () => {
      showGroup(1, false);
      nodes.undo.onclick();
      assert.equal(groupCheckbox(1).checked, false);
      assert.equal(overlay.children.length, 1);
      nodes.redo.onclick();
      assert.equal(groupCheckbox(1).checked, false);
      assert.equal(overlay.children.length, 1);
      showGroup(1, true);
      assert.equal(overlay.children.length, 2);
    });
    await t.test('JSON export still includes hidden groups and their boxes', async () => {
      showGroup(0, false);
      const createURL = URL.createObjectURL, createElement = doc.createElement;
      let exported;
      URL.createObjectURL = blob => { exported = blob; return createURL(blob); };
      doc.createElement = tag => { const node = createElement(tag); node.click = () => {}; return node; };
      try {
        nodes.export.onclick();
        const data = JSON.parse(await exported.text());
        assert.equal(data.groups.length, 2);
        assert.equal(data.groups[0].boxes.length, 1);
        assert.equal(data.groups[1].boxes.length, 1);
        assert.equal(overlay.children.length, 1);
      } finally { URL.createObjectURL = createURL; doc.createElement = createElement; }
    });
    await t.test('drawing in a hidden active group makes its new box visible', () => {
      showGroup(1, false); assert.equal(overlay.children.length, 0);
      draw(400, 400, 500, 500);
      assert.equal(groupCheckbox(1).checked, true);
      assert.equal(groupCheckbox(0).checked, false);
      assert.equal(overlay.children.length, 2);
      assert.equal(nodes['box-count'].textContent, '3 boxes · 2 visible');
    });
    const importFixture = () => ({ image: { width: 1000, height: 600 }, coordinate_system: { normalized: true, scale: 300, origin: 'top-left' }, groups: [{ name: 'Imported group', color: '#123456', boxes: [{ name: 'Imported box', pixels: { x: 50, y: 60, width: 200, height: 180 } }] }] });
    const importJSON = text => nodes['json-file'].onchange({ target: { files: [{ text: async () => text }], value: 'annotations.json' } });
    await t.test('imports annotations and coordinate settings with reversible replacement', async () => {
      const before = overlay.children.map(node => [node.dataset.id, node.style.cssText]);
      assert.equal(nodes.import.disabled, false);
      await importJSON(JSON.stringify(importFixture()));
      assert.equal(nodes['group-count'].textContent, 1); assert.equal(overlay.children.length, 1);
      assert.equal(nodes.groups.children[0].children[0].children.find(node => node.className === 'group-name').value, 'Imported group');
      assert.equal(nodes['normalization-points'].value, 300);
      assert.equal(groupCheckbox(0).checked, true);
      const row = nodes.groups.children[0].children.find(node => node.className.includes('box-row')); row.onclick();
      assert.equal(nodes['box-name'].value, 'Imported box');
      assert.deepEqual(coords(), { x_min: 15, y_min: 30, x_max: 75, y_max: 120 });
      nodes.undo.onclick();
      assert.deepEqual(overlay.children.map(node => [node.dataset.id, node.style.cssText]), before);
      assert.equal(nodes['normalization-points'].value, 2000);
      nodes.redo.onclick(); assert.equal(overlay.children.length, 1); assert.equal(nodes['normalization-points'].value, 300);
    });
    await t.test('invalid JSON, bad geometry, and image mismatch leave current work untouched', async () => {
      const before = overlay.children.map(node => [node.dataset.id, node.style.cssText]);
      for (const text of ['{broken', 'null', JSON.stringify({ ...importFixture(), image: { width: 400, height: 600 } }), JSON.stringify({ ...importFixture(), groups: [{}] })]) {
        await importJSON(text);
        assert.deepEqual(overlay.children.map(node => [node.dataset.id, node.style.cssText]), before);
        assert.equal(nodes['normalization-points'].value, 300);
      }
    });
    await t.test('group and individual colors support undo, inheritance, reset, and JSON round trips', async () => {
      const getGroupColor = () => nodes.groups.children[0].children[0].children.find(node => node.className === 'group-color');
      let picker = getGroupColor(); picker.value = '#abcdef'; emit(picker, 'change');
      assert.ok(overlay.children[0].style.cssText.includes('--color:#abcdef'));
      nodes.undo.onclick(); assert.ok(overlay.children[0].style.cssText.includes('--color:#123456'));
      nodes.redo.onclick();
      const row = nodes.groups.children[0].children.find(node => node.className.includes('box-row')); row.onclick();
      assert.equal(nodes['box-color'].value, '#abcdef'); assert.equal(nodes['reset-box-color'].disabled, true);
      nodes['box-color'].value = '#ff0000'; nodes['box-color'].onchange();
      assert.ok(overlay.children[0].style.cssText.includes('--color:#ff0000'));
      picker = getGroupColor(); picker.value = '#00ff00'; emit(picker, 'change');
      assert.ok(overlay.children[0].style.cssText.includes('--color:#ff0000'), 'overridden box keeps its color');
      const createURL = URL.createObjectURL, createElement = doc.createElement;
      let exported;
      URL.createObjectURL = blob => { exported = blob; return createURL(blob); };
      doc.createElement = tag => { const node = createElement(tag); node.click = () => {}; return node; };
      try {
        nodes.export.onclick(); const data = JSON.parse(await exported.text());
        assert.equal(data.groups[0].color, '#00ff00'); assert.equal(data.groups[0].boxes[0].color, '#ff0000');
        await importJSON(JSON.stringify(data)); assert.ok(overlay.children[0].style.cssText.includes('--color:#ff0000'));
      } finally { URL.createObjectURL = createURL; doc.createElement = createElement; }
      nodes.groups.children[0].children.find(node => node.className.includes('box-row')).onclick();
      nodes['reset-box-color'].onclick(); assert.ok(overlay.children[0].style.cssText.includes('--color:#00ff00'));
      nodes.undo.onclick(); assert.ok(overlay.children[0].style.cssText.includes('--color:#ff0000'));
    });
    await t.test('label checkbox and PNG download honor visibility, label choice, and original dimensions', async () => {
      nodes['include-labels'].checked = false; nodes['include-labels'].onchange();
      assert.equal(overlay.children[0].children.filter(node => node.className === 'box-label').length, 0);
      const createURL = URL.createObjectURL, createElement = doc.createElement;
      let canvas, downloaded, textCalls = 0, strokeCalls = 0, fillCalls = 0;
      const context = { clearRect() {}, drawImage() {}, save() {}, restore() {}, fillRect() { fillCalls++; }, strokeRect() { strokeCalls++; }, fillText() { textCalls++; }, measureText: text => ({ width: text.length * 8 }) };
      URL.createObjectURL = blob => { assert.equal(blob.type, 'image/png'); return createURL(blob); };
      doc.createElement = tag => {
        const node = createElement(tag);
        if (tag === 'canvas') { canvas = node; node.getContext = () => context; node.toBlob = callback => callback(new Blob(['png-fixture'], { type: 'image/png' })); }
        node.click = () => { downloaded = node.download; }; return node;
      };
      try {
        await nodes['save-image'].onclick();
        assert.equal(canvas.width, 1000); assert.equal(canvas.height, 600);
        assert.equal(downloaded, 'fixture.annotated.png'); assert.equal(textCalls, 0); assert.equal(strokeCalls, 1);
        assert.equal(fillCalls, 0); assert.equal(overlay.children[0].classes.has('filled'), false);
        nodes['fill-boxes'].checked = true; nodes['fill-boxes'].onchange();
        assert.equal(overlay.children[0].classes.has('filled'), true);
        await nodes['save-image'].onclick(); assert.equal(fillCalls, 1);
        nodes['fill-boxes'].checked = false; nodes['fill-boxes'].onchange();
        assert.equal(overlay.children[0].classes.has('filled'), false);
        nodes['include-labels'].checked = true; nodes['include-labels'].onchange();
        assert.equal(overlay.children[0].children.filter(node => node.className === 'box-label').length, 1);
        await nodes['save-image'].onclick(); assert.equal(textCalls, 1);
        showGroup(0, false); strokeCalls = 0; textCalls = 0;
        await nodes['save-image'].onclick(); assert.equal(strokeCalls, 0); assert.equal(textCalls, 0);
      } finally { URL.createObjectURL = createURL; doc.createElement = createElement; }
    });
  } finally {
    t.mock.timers.tick(3000);
    for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete globalThis[key]; else globalThis[key] = value; }
  }
});
