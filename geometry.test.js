import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize, rectangle, move, resize } from './geometry.js';

test('normalizes each axis against the original image, including right and bottom edges', () => {
  assert.deepEqual(normalize({ x: 200, y: 100, w: 600, h: 300 }, 2000, 1000), { x_min: 100, y_min: 100, x_max: 400, y_max: 400 });
  assert.deepEqual(normalize({ x: 0, y: 0, w: 2000, h: 1000 }, 2000, 1000), { x_min: 0, y_min: 0, x_max: 1000, y_max: 1000 });
});
test('drawing works in every direction', () => {
  assert.deepEqual(rectangle({ x: 90, y: 80 }, { x: 10, y: 20 }), { x: 10, y: 20, w: 80, h: 60 });
});

test('normalizes to a custom scale for rectangular images', () => {
  const box = { x: 200, y: 100, w: 600, h: 300 };
  assert.deepEqual(normalize(box, 2000, 1000, 2000), { x_min: 200, y_min: 200, x_max: 800, y_max: 800 });
  assert.deepEqual(normalize({ x: 0, y: 0, w: 2000, h: 1000 }, 2000, 1000, 100), { x_min: 0, y_min: 0, x_max: 100, y_max: 100 });
});
test('moving preserves size and stays within image boundaries', () => {
  assert.deepEqual(move({ x: 10, y: 20, w: 30, h: 40 }, 500, -500, 100, 100), { x: 70, y: 0, w: 30, h: 40 });
});
test('resize supports all eight handles and constrains image edges', () => {
  const box = { x: 20, y: 20, w: 40, h: 40 };
  for (const handle of ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']) {
    const result = resize(box, handle, 10, 10, 100, 100);
    assert.ok(result.w > 0 && result.h > 0);
    assert.equal(result.x, handle.includes('w') ? 30 : 20);
    assert.equal(result.y, handle.includes('n') ? 30 : 20);
    assert.equal(result.x + result.w, handle.includes('e') ? 70 : 60);
    assert.equal(result.y + result.h, handle.includes('s') ? 70 : 60);
  }
  assert.deepEqual(resize(box, 'se', 500, 500, 100, 100), { x: 20, y: 20, w: 80, h: 80 });
  assert.deepEqual(resize(box, 'nw', 500, 500, 100, 100), { x: 59, y: 59, w: 1, h: 1 });
});
