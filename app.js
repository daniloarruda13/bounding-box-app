import { clamp, normalize, rectangle, move, resize } from './geometry.js';

const $ = id => document.getElementById(id);
const colors = ['#63866a', '#c59152', '#688db4', '#b47791', '#8f80b3', '#4f9c9a'];
let groups = [{ id: crypto.randomUUID(), name: 'Group 1', color: colors[0] }];
let boxes = [], activeGroup = groups[0].id, selected = null, mode = 'select';
let width = 0, height = 0, imageName = '', objectURL, gesture, history = [], future = [];
let toastTimer;
let zoom = 1, fitting = true, spaceHeld = false, pan = null;
let normalized = true, normalizationPoints = 1000;
// Group visibility is a view preference, independent of annotation undo history.
const hiddenGroups = new Set();
const snapshot = () => structuredClone({ groups, boxes, activeGroup, selected });
function checkpoint() { history.push(snapshot()); if (history.length > 100) history.shift(); future = []; }
function restore(state) { ({ groups, boxes, activeGroup, selected } = structuredClone(state)); render(); }
function undo() { if (!history.length || gesture) return; future.push(snapshot()); restore(history.pop()); }
function redo() { if (!future.length || gesture) return; history.push(snapshot()); restore(future.pop()); }
function toast(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').hidden = true, 2800); }
function setMode(next) { mode = next; $('select-tool').classList.toggle('active', mode === 'select'); $('draw-tool').classList.toggle('active', mode === 'draw'); $('stage').classList.toggle('drawing', mode === 'draw'); updateHint(); }
function updateHint() { $('hint').textContent = !width ? 'Open an image to get started' : mode === 'draw' ? 'Drag empty image to draw · Handles resize · Space + drag to pan' : 'Drag box to move · Handles resize · Space + drag to pan'; }
function element(tag, className, text) { const el = document.createElement(tag); if (className) el.className = className; if (text !== undefined) el.textContent = text; return el; }
function renderBoxes() {
  $('overlay').replaceChildren();
  for (const box of boxes) {
    if (hiddenGroups.has(box.groupId)) continue;
    const group = groups.find(g => g.id === box.groupId);
    const node = element('div', 'box' + (box.id === selected ? ' selected' : ''));
    node.dataset.id = box.id;
    node.style.cssText = `left:${box.x / width * 100}%;top:${box.y / height * 100}%;width:${box.w / width * 100}%;height:${box.h / height * 100}%;--color:${group.color}`;
    node.append(element('span', 'box-label', box.name));
    if (box.id === selected) for (const handle of ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']) {
      const dot = element('span', 'handle'); dot.dataset.handle = handle; node.append(dot);
    }
    $('overlay').append(node);
  }
}
function render() {
  if (boxes.some(box => box.id === selected && hiddenGroups.has(box.groupId))) selected = null;
  renderBoxes();
  $('groups').replaceChildren();
  for (const group of groups) {
    const groupBoxes = boxes.filter(b => b.groupId === group.id);
    const isHidden = hiddenGroups.has(group.id);
    const section = element('div', 'group' + (group.id === activeGroup ? ' active' : '') + (isHidden ? ' is-hidden' : ''));
    section.style.setProperty('--color', group.color);
    const head = element('div', 'group-head');
    head.addEventListener('click', () => { activeGroup = group.id; render(); });
    head.append(element('span', 'swatch'));
    const name = element('input', 'group-name'); name.value = group.name; name.maxLength = 100; name.setAttribute('aria-label', 'Group name');
    name.addEventListener('click', e => { e.stopPropagation(); activeGroup = group.id; document.querySelectorAll('.group').forEach(n => n.classList.toggle('active', n === section)); });
    name.addEventListener('change', () => { checkpoint(); group.name = name.value.trim() || group.name; render(); });
    head.append(name, element('span', 'count', groupBoxes.length));
    const visibilityLabel = element('label', 'group-visibility');
    const visibility = element('input'); visibility.type = 'checkbox'; visibility.checked = !isHidden;
    visibility.setAttribute('aria-label', `Show boxes in ${group.name}`);
    visibility.title = isHidden ? 'Show this group’s boxes' : 'Hide this group’s boxes';
    visibilityLabel.append(visibility, element('span', '', 'Show'));
    visibilityLabel.addEventListener('click', event => event.stopPropagation());
    visibility.addEventListener('change', () => {
      finishGesture(true);
      if (visibility.checked) hiddenGroups.delete(group.id); else hiddenGroups.add(group.id);
      render();
    });
    head.append(visibilityLabel);
    if (groups.length > 1) {
      const remove = element('button', 'remove-group', '×'); remove.title = 'Delete group and its boxes'; remove.setAttribute('aria-label', `Delete ${group.name}`);
      remove.onclick = e => { e.stopPropagation(); checkpoint(); groups = groups.filter(g => g.id !== group.id); boxes = boxes.filter(b => b.groupId !== group.id); if (activeGroup === group.id) activeGroup = groups[0].id; if (!boxes.some(b => b.id === selected)) selected = null; render(); };
      head.append(remove);
    }
    section.append(head);
    if (!groupBoxes.length) section.append(element('div', 'group-empty', 'No boxes yet'));
    for (const box of groupBoxes) {
      const row = element('button', 'box-row' + (box.id === selected ? ' active' : ''));
      row.disabled = isHidden;
      if (isHidden) row.title = 'Check Show to display and edit this group’s boxes';
      row.append(element('span', '', '▧'), element('span', '', box.name));
      row.onclick = () => { selected = box.id; activeGroup = group.id; setMode('select'); render(); };
      section.append(row);
    }
    $('groups').append(section);
  }
  $('group-count').textContent = groups.length;
  $('box-count').textContent = `${boxes.length} ${boxes.length === 1 ? 'box' : 'boxes'}`;
  const visibleCount = boxes.filter(box => !hiddenGroups.has(box.groupId)).length;
  if (visibleCount !== boxes.length) $('box-count').textContent += ` · ${visibleCount} visible`;
  $('undo').disabled = !history.length; $('redo').disabled = !future.length; $('export').disabled = !width;
  const box = boxes.find(b => b.id === selected);
  $('properties').hidden = !box; $('no-selection').hidden = !!box;
  if (box) {
    $('box-name').value = box.name;
    $('box-group').replaceChildren(...groups.map(g => { const option = element('option', '', g.name); option.value = g.id; return option; }));
    $('box-group').value = box.groupId;
    renderCoordinates(box);
  }
  updateHint();
}
function renderCoordinates(box) {
  $('coordinates').replaceChildren(...Object.entries(boxCoordinates(box)).map(([key, value]) => {
    const displayValue = normalized ? value : Number(value.toFixed(2));
    const cell = element('div', 'coordinate'); cell.append(element('span', '', key), element('strong', '', displayValue)); return cell;
  }));
}
function boxCoordinates(box) {
  if (normalized) return normalize(box, width, height, normalizationPoints);
  return { x_min: box.x, y_min: box.y, x_max: box.x + box.w, y_max: box.y + box.h };
}
function updateCoordinateSettings() {
  $('normalize').checked = normalized;
  $('normalization-points').disabled = !normalized;
  $('coordinate-unit').textContent = normalized ? `0–${normalizationPoints}` : 'Pixels';
  $('coordinate-title').textContent = normalized ? 'Normalized coordinates' : 'Pixel coordinates';
  $('coordinate-note').textContent = normalized ? 'Origin at top left. Values rounded to integers.' : 'Origin at top left. Pixels shown to 2 decimals; Copy and export preserve full precision.';
  const box = boxes.find(b => b.id === selected);
  if (box) renderCoordinates(box);
}
$('normalize').onchange = () => { normalized = $('normalize').checked; updateCoordinateSettings(); };
$('normalization-points').onchange = () => {
  const points = Number($('normalization-points').value);
  if (!Number.isInteger(points) || points < 1 || points > 1000000) {
    $('normalization-points').value = normalizationPoints;
    toast('Enter a whole number from 1 to 1,000,000.'); return;
  }
  normalizationPoints = points; updateCoordinateSettings();
};
function fitScale() {
  const view = $('viewport');
  return Math.max(.001, Math.min((view.clientWidth - 72) / width, (view.clientHeight - 72) / height, 1));
}
function layoutCanvas() {
  if (!width) return;
  const view = $('viewport');
  $('stage').style.width = `${width * zoom}px`;
  $('stage').style.height = `${height * zoom}px`;
  // A separate content surface keeps every image edge reachable when zoomed.
  $('canvas-content').style.width = `${Math.max(view.clientWidth, width * zoom + 72)}px`;
  $('canvas-content').style.height = `${Math.max(view.clientHeight, height * zoom + 72)}px`;
  $('zoom-level').textContent = `${Math.round(zoom * 100)}%`;
  for (const id of ['zoom-out', 'zoom-in', 'zoom-fit', 'zoom-actual']) $(id).disabled = false;
  $('zoom-out').disabled = zoom <= Math.min(.1, fitScale());
  $('zoom-in').disabled = zoom >= 8;
}
function fit() {
  if (!width || gesture || pan) return;
  fitting = true; zoom = fitScale(); layoutCanvas();
  $('viewport').scrollLeft = 0; $('viewport').scrollTop = 0;
}
function zoomAt(next, clientX, clientY) {
  if (!width || gesture || pan) return;
  const view = $('viewport'), bounds = view.getBoundingClientRect();
  clientX ??= bounds.left + view.clientWidth / 2;
  clientY ??= bounds.top + view.clientHeight / 2;
  const oldRect = $('stage').getBoundingClientRect();
  const imageX = (clientX - oldRect.left) / zoom, imageY = (clientY - oldRect.top) / zoom;
  zoom = clamp(next, Math.min(.1, fitScale()), 8); fitting = false;
  layoutCanvas();
  const newRect = $('stage').getBoundingClientRect();
  view.scrollLeft += newRect.left + imageX * zoom - clientX;
  view.scrollTop += newRect.top + imageY * zoom - clientY;
}
async function openFile(file) {
  if (!file) return;
  if (file.type !== 'image/png' && !file.name.toLowerCase().endsWith('.png')) { toast('Please choose a PNG image.'); return; }
  const url = URL.createObjectURL(file);
  const probe = new Image(); probe.src = url;
  try { await probe.decode(); } catch { URL.revokeObjectURL(url); toast('This image could not be opened. Please try another PNG.'); return; }
  if (objectURL) URL.revokeObjectURL(objectURL);
  objectURL = url; width = probe.naturalWidth; height = probe.naturalHeight; imageName = file.name;
  finishGesture(true); finishPan();
  boxes = []; selected = null; history = []; future = [];
  $('image').src = url; $('filename').textContent = file.name; $('image-size').textContent = `${width} × ${height} px`;
  $('empty').hidden = true; $('stage').hidden = false;
  fit(); setMode('draw'); render();
}
function point(event) {
  const rect = $('stage').getBoundingClientRect();
  return { x: clamp((event.clientX - rect.left) / rect.width * width, 0, width), y: clamp((event.clientY - rect.top) / rect.height * height, 0, height) };
}
$('overlay').addEventListener('pointerdown', event => {
  if (event.button !== 0 || gesture || spaceHeld || pan) return;
  event.preventDefault();
  const start = point(event), target = event.target.closest('.box');
  const before = snapshot();
  // Existing boxes and handles always win over the drawing tool.
  if (target) {
    selected = target.dataset.id;
    const box = boxes.find(b => b.id === selected); activeGroup = box.groupId;
    const handle = event.target.closest('[data-handle]')?.dataset.handle;
    gesture = { type: handle ? 'resize' : 'move', handle, start, id: box.id, original: { ...box }, before };
  } else if (mode === 'draw') {
    // Newly drawn boxes must be visible, even if their active group was hidden.
    hiddenGroups.delete(activeGroup);
    const box = { id: crypto.randomUUID(), name: `Box ${boxes.length + 1}`, groupId: activeGroup, x: start.x, y: start.y, w: 0, h: 0 };
    boxes.push(box); selected = box.id; gesture = { type: 'draw', start, id: box.id, before };
  } else { selected = null; render(); return; }
  gesture.pointerId = event.pointerId;
  $('overlay').setPointerCapture(event.pointerId);
  render();
});
$('overlay').addEventListener('pointermove', event => {
  if (!gesture || event.pointerId !== gesture.pointerId) return;
  const p = point(event), dx = p.x - gesture.start.x, dy = p.y - gesture.start.y;
  const index = boxes.findIndex(b => b.id === gesture.id);
  if (gesture.type === 'draw') Object.assign(boxes[index], rectangle(gesture.start, p));
  else boxes[index] = gesture.type === 'move' ? move(gesture.original, dx, dy, width, height) : resize(gesture.original, gesture.handle, dx, dy, width, height);
  renderBoxes(); renderCoordinates(boxes[index]);
});
function finishGesture(cancel = false) {
  if (!gesture) return;
  const current = gesture; gesture = null;
  if ($('overlay').hasPointerCapture(current.pointerId)) $('overlay').releasePointerCapture(current.pointerId);
  const box = boxes.find(b => b.id === current.id);
  if (cancel || (current.type === 'draw' && (box.w < 1 || box.h < 1))) { restore(current.before); return; }
  if (current.type === 'draw' || JSON.stringify(box) !== JSON.stringify(current.original)) {
    history.push(current.before); if (history.length > 100) history.shift(); future = [];
  }
  render();
}
$('overlay').addEventListener('pointerup', event => { if (event.pointerId === gesture?.pointerId) finishGesture(); });
$('overlay').addEventListener('pointercancel', event => { if (event.pointerId === gesture?.pointerId) finishGesture(true); });
$('overlay').addEventListener('lostpointercapture', event => { if (event.pointerId === gesture?.pointerId) finishGesture(true); });
$('zoom-in').onclick = () => zoomAt(zoom * 1.25);
$('zoom-out').onclick = () => zoomAt(zoom / 1.25);
$('zoom-fit').onclick = fit;
$('zoom-actual').onclick = () => zoomAt(1);
$('viewport').addEventListener('wheel', event => {
  if (!width) return;
  if (event.ctrlKey || event.metaKey) {
    event.preventDefault();
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? $('viewport').clientHeight : 1);
    zoomAt(zoom * Math.exp(-clamp(delta, -100, 100) * .005), event.clientX, event.clientY);
  } else if (event.shiftKey && !event.deltaX) {
    event.preventDefault();
    $('viewport').scrollLeft += event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? $('viewport').clientWidth : 1);
  }
}, { passive: false });
$('viewport').addEventListener('pointerdown', event => {
  if (!width || gesture || pan || !(event.button === 1 || (event.button === 0 && spaceHeld))) return;
  event.preventDefault();
  pan = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, left: $('viewport').scrollLeft, top: $('viewport').scrollTop };
  $('viewport').setPointerCapture(event.pointerId); $('viewport').classList.add('panning');
});
$('viewport').addEventListener('pointermove', event => {
  if (event.pointerId !== pan?.pointerId) return;
  $('viewport').scrollLeft = pan.left - (event.clientX - pan.x);
  $('viewport').scrollTop = pan.top - (event.clientY - pan.y);
});
function finishPan() {
  if (!pan) return;
  const id = pan.pointerId; pan = null;
  if ($('viewport').hasPointerCapture(id)) $('viewport').releasePointerCapture(id);
  $('viewport').classList.remove('panning');
}
for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) $('viewport').addEventListener(name, event => { if (event.pointerId === pan?.pointerId) finishPan(); });
$('viewport').addEventListener('auxclick', event => { if (event.button === 1) event.preventDefault(); });
$('select-tool').onclick = () => setMode('select');
$('draw-tool').onclick = () => setMode('draw');
$('upload').onclick = $('empty-upload').onclick = () => $('file').click();
$('file').onchange = event => { openFile(event.target.files[0]); event.target.value = ''; };
$('undo').onclick = undo; $('redo').onclick = redo;
$('add-group').onclick = () => { checkpoint(); const group = { id: crypto.randomUUID(), name: `Group ${groups.length + 1}`, color: colors[groups.length % colors.length] }; groups.push(group); activeGroup = group.id; render(); };
$('box-name').onchange = () => { const box = boxes.find(b => b.id === selected); if (!box) return; checkpoint(); box.name = $('box-name').value.trim() || box.name; render(); };
$('box-group').onchange = () => { const box = boxes.find(b => b.id === selected); if (!box) return; checkpoint(); box.groupId = $('box-group').value; activeGroup = box.groupId; render(); };
function deleteBox() { if (!selected) return; checkpoint(); boxes = boxes.filter(b => b.id !== selected); selected = null; render(); }
$('delete-box').onclick = deleteBox;
$('copy').onclick = async () => {
  const box = boxes.find(b => b.id === selected); if (!box) return;
  const text = Object.entries(boxCoordinates(box)).map(([key, value]) => `${key}: ${value}`).join(', ');
  try { await navigator.clipboard.writeText(text); toast('Coordinates copied'); } catch { toast('Clipboard unavailable. Use Export JSON to save coordinates.'); }
};
$('export').onclick = () => {
  const data = { image: { name: imageName, width, height }, coordinate_system: normalized ? { normalized: true, scale: normalizationPoints, origin: 'top-left', rounding: 'nearest integer' } : { normalized: false, units: 'pixels', origin: 'top-left', rounding: 'none' }, groups: groups.map(group => ({ name: group.name, color: group.color, boxes: boxes.filter(b => b.groupId === group.id).map(box => ({ name: box.name, ...boxCoordinates(box), pixels: { x: box.x, y: box.y, width: box.w, height: box.h } })) })) };
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const link = element('a'); link.href = url; link.download = imageName.replace(/\.png$/i, '') + '.boxes.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast('Annotations exported');
};
document.addEventListener('keydown', event => {
  if (event.target.closest('input,select,textarea') || event.altKey) return;
  const key = event.key.toLowerCase();
  if (key === ' ') { event.preventDefault(); spaceHeld = true; $('viewport').classList.add('pan-ready'); return; }
  if (key === 'escape') { finishPan(); if (gesture) finishGesture(true); else { selected = null; setMode('select'); render(); } return; }
  if (gesture || pan) return;
  if ((event.ctrlKey || event.metaKey) && key === 'z') { event.preventDefault(); event.shiftKey ? redo() : undo(); return; }
  if (event.ctrlKey || event.metaKey) return;
  if (key === 'b') setMode('draw');
  if (key === 'v') setMode('select');
  if (key === 'delete' || key === 'backspace') { event.preventDefault(); deleteBox(); }
  if (selected && ['arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(key)) {
    event.preventDefault(); checkpoint(); const step = event.shiftKey ? 10 : 1;
    boxes = boxes.map(b => b.id === selected ? move(b, key === 'arrowleft' ? -step : key === 'arrowright' ? step : 0, key === 'arrowup' ? -step : key === 'arrowdown' ? step : 0, width, height) : b); render();
  }
});
document.addEventListener('keyup', event => { if (event.key === ' ') { spaceHeld = false; $('viewport').classList.remove('pan-ready'); } });
window.addEventListener('blur', () => { spaceHeld = false; $('viewport').classList.remove('pan-ready'); finishPan(); finishGesture(true); });
let dragDepth = 0;
document.addEventListener('dragover', event => event.preventDefault());
document.addEventListener('dragenter', event => { event.preventDefault(); if (event.dataTransfer.types.includes('Files')) { dragDepth++; $('drop-overlay').hidden = false; } });
document.addEventListener('dragleave', () => { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) $('drop-overlay').hidden = true; });
document.addEventListener('drop', event => { event.preventDefault(); dragDepth = 0; $('drop-overlay').hidden = true; openFile(event.dataTransfer.files[0]); });
new ResizeObserver(() => { if (fitting) fit(); else layoutCanvas(); }).observe($('viewport'));
updateCoordinateSettings();
render();
