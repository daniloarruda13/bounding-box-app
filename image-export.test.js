import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drawAnnotatedImage, labelTextColor } from './image-export.js';

function contextFixture() {
  const calls = [];
  const context = { calls, measureText: text => ({ width: text.length * 8 }) };
  for (const method of ['clearRect', 'drawImage', 'save', 'restore', 'fillRect', 'strokeRect', 'fillText']) {
    context[method] = (...args) => calls.push({ method, args, fill: context.fillStyle, stroke: context.strokeStyle, alpha: context.globalAlpha, lineWidth: context.lineWidth });
  }
  return context;
}
const groups = [{ id: 'one', color: '#123456' }, { id: 'two', color: '#ffffff' }];
const boxes = [{ groupId: 'one', name: 'Object 1', x: 100, y: 100, w: 200, h: 150 }, { groupId: 'two', name: 'Object 2', color: '#ff0000', x: 0, y: 0, w: 100, h: 100 }];

test('PNG draws the original image and only visible boxes at original coordinates', () => {
  const context = contextFixture(), image = {};
  drawAnnotatedImage(context, image, 1000, 600, boxes, groups, new Set(['two']), false);
  assert.deepEqual(context.calls[0].args, [0, 0, 1000, 600]);
  assert.deepEqual(context.calls.find(call => call.method === 'drawImage').args, [image, 0, 0, 1000, 600]);
  const strokes = context.calls.filter(call => call.method === 'strokeRect');
  assert.equal(strokes.length, 1); assert.equal(strokes[0].stroke, '#123456');
  assert.deepEqual(strokes[0].args, [101, 101, 198, 148]);
  assert.equal(context.calls.filter(call => call.method === 'fillText').length, 0);
  assert.equal(context.calls.filter(call => call.method === 'fillRect').length, 0, 'outline-only is the default');
});

test('box filling is optional, translucent, and respects group visibility', () => {
  const context = contextFixture();
  drawAnnotatedImage(context, {}, 1000, 600, boxes, groups, new Set(['two']), false, true);
  const fills = context.calls.filter(call => call.method === 'fillRect');
  assert.equal(fills.length, 1); assert.equal(fills[0].fill, '#123456');
  assert.equal(fills[0].alpha, .12); assert.deepEqual(fills[0].args, [100, 100, 200, 150]);
  assert.equal(context.calls.find(call => call.method === 'strokeRect').alpha, 1);
});
test('custom line thickness is used in image pixels and stays within tiny boxes', () => {
  const context = contextFixture();
  drawAnnotatedImage(context, {}, 1000, 600, boxes, groups, new Set(['two']), false, false, 10);
  const stroke = context.calls.find(call => call.method === 'strokeRect');
  assert.equal(stroke.lineWidth, 10); assert.deepEqual(stroke.args, [105, 105, 190, 140]);
  const tiny = contextFixture();
  drawAnnotatedImage(tiny, {}, 10, 10, [{ ...boxes[0], x: 0, y: 0, w: 3, h: 4 }], groups, new Set(), false, false, 20);
  const tinyStroke = tiny.calls.find(call => call.method === 'strokeRect');
  assert.equal(tinyStroke.lineWidth, 3); assert.deepEqual(tinyStroke.args, [1.5, 1.5, 0, 1]);
});
test('PNG uses per-box colors, optional labels, and keeps labels within image boundaries', () => {
  const context = contextFixture();
  drawAnnotatedImage(context, {}, 1000, 600, boxes, groups, new Set(), true);
  assert.equal(context.calls.filter(call => call.method === 'strokeRect')[1].stroke, '#ff0000');
  const labels = context.calls.filter(call => call.method === 'fillText');
  assert.deepEqual(labels.map(call => call.args[0]), ['Object 1', 'Object 2']);
  assert.ok(labels.every(call => call.args[1] >= 0 && call.args[2] >= 0 && call.args[1] < 1000 && call.args[2] < 600));
  const tiny = contextFixture();
  drawAnnotatedImage(tiny, {}, 10, 5, [{ ...boxes[0], x: 0, y: 0, w: 10, h: 5 }], groups, new Set(), true);
  assert.ok(tiny.calls.filter(call => call.method === 'fillRect').every(call => call.args[0] >= 0 && call.args[1] >= 0 && call.args[0] + call.args[2] <= 10 && call.args[1] + call.args[3] <= 5));
});
test('label text contrasts with light and dark box colors', () => {
  assert.equal(labelTextColor('#ffffff'), '#000000');
  assert.equal(labelTextColor('#ffff00'), '#000000');
  assert.equal(labelTextColor('#000000'), '#ffffff');
  assert.equal(labelTextColor('#123456'), '#ffffff');
});
