import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAnnotations } from './annotations.js';

const image = { width: 1000, height: 600 };
const fixture = () => ({
  image: { name: 'example.png', ...image },
  coordinate_system: { normalized: true, scale: 1000, origin: 'top-left' },
  groups: [{ name: 'Objects', color: '#63866a', boxes: [{ name: 'Small object', x_min: 100, y_min: 200, x_max: 400, y_max: 500, pixels: { x: 100.25, y: 120, width: 299.75, height: 180 } }] }, { name: 'Empty group', color: '#688db4', boxes: [] }],
});

test('imports names, colors, empty groups, and precise pixels instead of rounded edges', () => {
  const data = fixture(); const state = parseAnnotations(data, image);
  assert.equal(state.groups.length, 2); assert.equal(state.boxes.length, 1);
  assert.equal(state.groups[0].name, 'Objects'); assert.equal(state.groups[1].color, '#688db4');
  assert.equal(state.boxes[0].x, 100.25); assert.equal(state.boxes[0].w, 299.75);
  assert.equal(state.boxes[0].groupId, state.groups[0].id);
  assert.equal(state.normalized, true); assert.equal(state.normalizationPoints, 1000);
  assert.deepEqual(data, fixture(), 'the source data must not be mutated');
  assert.notEqual(state.groups[0].id, parseAnnotations(data, image).groups[0].id);
});
test('supports legacy scale-only exports and custom normalized coordinates without pixels', () => {
  const data = fixture(); delete data.coordinate_system.normalized; data.coordinate_system.scale = 2000;
  delete data.groups[0].boxes[0].pixels;
  const state = parseAnnotations(data, image);
  assert.equal(state.normalizationPoints, 2000);
  assert.deepEqual({ x: state.boxes[0].x, y: state.boxes[0].y, w: state.boxes[0].w, h: state.boxes[0].h }, { x: 50, y: 60, w: 150, h: 90 });
});
test('supports pixel exports with and without a pixels object', () => {
  const data = fixture(); data.coordinate_system = { normalized: false, units: 'pixels', origin: 'top-left' };
  assert.equal(parseAnnotations(data, image).normalized, false);
  delete data.groups[0].boxes[0].pixels;
  assert.equal(parseAnnotations(data, image).boxes[0].y, 200);
});
test('handles empty exports and normalized rounding that collapses tiny boxes', () => {
  const data = fixture(); data.groups = [];
  assert.equal(parseAnnotations(data, image).groups.length, 1);
  data.groups = fixture().groups; data.coordinate_system.scale = 1;
  Object.assign(data.groups[0].boxes[0], { x_min: 0, y_min: 0, x_max: 0, y_max: 0 });
  assert.equal(parseAnnotations(data, image).boxes[0].x, 100.25);
});
test('rejects invalid schemas, mismatched dimensions, unsupported formats, and invalid geometry', () => {
  for (const value of [null, [], {}, { image }, { image, groups: null }]) assert.throws(() => parseAnnotations(value, image), /Boxroom export/);
  const invalidCases = [
    data => { data.image.width = 800; },
    data => { data.image.height = '600'; },
    data => { data.coordinate_system = null; },
    data => { data.coordinate_system.origin = 'bottom-left'; },
    data => { data.coordinate_system.scale = 0; },
    data => { data.coordinate_system.scale = 1.5; },
    data => { data.coordinate_system.scale = 1000001; },
    data => { data.coordinate_system.normalized = 'yes'; },
    data => { data.coordinate_system = { normalized: false, units: 'inches' }; },
    data => { data.groups[0].color = 'red;display:none'; },
    data => { data.groups[0].name = ''; },
    data => { data.groups[0].boxes = null; },
    data => { data.groups[0].boxes[0].name = null; },
    data => { data.groups[0].boxes[0].pixels.x = -1; },
    data => { data.groups[0].boxes[0].pixels.width = 0; },
    data => { data.groups[0].boxes[0].pixels.height = '100'; },
    data => { data.groups[0].boxes[0].pixels.width = Infinity; },
    data => { data.groups[0].boxes[0].pixels.x = 999; },
    data => { delete data.groups[0].boxes[0].pixels; data.groups[0].boxes[0].x_max = 1001; },
  ];
  for (const invalidate of invalidCases) { const data = fixture(); invalidate(data); assert.throws(() => parseAnnotations(data, image)); }
});
