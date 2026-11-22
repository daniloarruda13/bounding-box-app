export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export function normalize(box, width, height, scale = 1000) {
  return {
    x_min: Math.round(box.x / width * scale),
    y_min: Math.round(box.y / height * scale),
    x_max: Math.round((box.x + box.w) / width * scale),
    y_max: Math.round((box.y + box.h) / height * scale),
  };
}
export function rectangle(a, b) {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) };
}
export function move(box, dx, dy, width, height) {
  return { ...box, x: clamp(box.x + dx, 0, width - box.w), y: clamp(box.y + dy, 0, height - box.h) };
}
export function resize(box, handle, dx, dy, width, height) {
  let left = box.x, top = box.y, right = box.x + box.w, bottom = box.y + box.h;
  const minW = Math.min(1, box.w), minH = Math.min(1, box.h);
  if (handle.includes('w')) left = clamp(left + dx, 0, right - minW);
  if (handle.includes('e')) right = clamp(right + dx, left + minW, width);
  if (handle.includes('n')) top = clamp(top + dy, 0, bottom - minH);
  if (handle.includes('s')) bottom = clamp(bottom + dy, top + minH, height);
  return { ...box, x: left, y: top, w: right - left, h: bottom - top };
}
