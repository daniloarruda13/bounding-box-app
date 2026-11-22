// Validate the complete file before changing the editor. Exported pixel geometry
// takes precedence over rounded normalized edges so round trips remain lossless.
export function parseAnnotations(data, image, createId = () => crypto.randomUUID()) {
  const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  if (!record(data) || !record(data.image) || !Array.isArray(data.groups)) throw new Error('Choose a Boxroom export containing image dimensions and a groups array.');
  const fail = message => { throw new Error(message); };
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  if (!Number.isSafeInteger(data.image.width) || !Number.isSafeInteger(data.image.height) || data.image.width <= 0 || data.image.height <= 0) fail('The JSON image dimensions are invalid.');
  if (data.image.width !== image.width || data.image.height !== image.height) fail(`Image size mismatch: this JSON needs a ${data.image.width} × ${data.image.height} PNG. Open the matching image first.`);
  const system = data.coordinate_system;
  if (!record(system) || (system.origin !== undefined && system.origin !== 'top-left')) fail('The JSON coordinate system must use a top-left origin.');
  // Older Boxroom exports specified scale without an explicit normalized flag.
  const normalized = system.normalized === undefined ? system.scale !== undefined : system.normalized;
  if (typeof normalized !== 'boolean') fail('The JSON normalization setting is invalid.');
  const scale = normalized ? system.scale : 1000;
  if (normalized && (!Number.isInteger(scale) || scale < 1 || scale > 1000000)) fail('The JSON normalization scale must be a whole number from 1 to 1,000,000.');
  if (!normalized && system.units !== 'pixels') fail('The JSON must specify pixel units when normalization is disabled.');
  const groups = [], boxes = [];
  for (const [index, source] of data.groups.entries()) {
    if (!record(source) || typeof source.name !== 'string' || !source.name.trim() || !Array.isArray(source.boxes)) fail(`Group ${index + 1} must have a name and a boxes array.`);
    if (typeof source.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(source.color)) fail(`Group ${index + 1} must have a six-digit hex color.`);
    const group = { id: createId(), name: source.name, color: source.color };
    groups.push(group);
    for (const [boxIndex, sourceBox] of source.boxes.entries()) {
      const label = `Box ${boxIndex + 1} in group ${index + 1}`;
      if (!record(sourceBox) || typeof sourceBox.name !== 'string' || !sourceBox.name.trim()) fail(`${label} must have a name.`);
      if (sourceBox.color !== undefined && (typeof sourceBox.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(sourceBox.color))) fail(`${label} must have a six-digit hex color.`);
      let geometry;
      if (sourceBox.pixels !== undefined) {
        const pixels = sourceBox.pixels;
        if (!record(pixels)) fail(`${label} has invalid pixel geometry.`);
        geometry = { x: pixels.x, y: pixels.y, w: pixels.width, h: pixels.height };
      } else {
        const { x_min, y_min, x_max, y_max } = sourceBox;
        if (![x_min, y_min, x_max, y_max].every(finite)) fail(`${label} has invalid coordinates.`);
        const limitX = normalized ? scale : image.width, limitY = normalized ? scale : image.height;
        if (x_min < 0 || y_min < 0 || x_max > limitX || y_max > limitY || x_max <= x_min || y_max <= y_min) fail(`${label} has coordinates outside the image or zero size.`);
        const factorX = normalized ? image.width / scale : 1, factorY = normalized ? image.height / scale : 1;
        geometry = { x: x_min * factorX, y: y_min * factorY, w: (x_max - x_min) * factorX, h: (y_max - y_min) * factorY };
      }
      const { x, y, w, h } = geometry;
      if (![x, y, w, h].every(finite) || x < 0 || y < 0 || w <= 0 || h <= 0 || x + w > image.width + 1e-7 || y + h > image.height + 1e-7) fail(`${label} has pixel geometry outside the image or zero size.`);
      // Absorb floating-point error at the right/bottom image boundary only.
      geometry.w = Math.min(w, image.width - x); geometry.h = Math.min(h, image.height - y);
      if (geometry.w <= 0 || geometry.h <= 0) fail(`${label} is outside the image.`);
      boxes.push({ id: createId(), name: sourceBox.name, groupId: group.id, ...(sourceBox.color ? { color: sourceBox.color } : {}), ...geometry });
    }
  }
  if (!groups.length) groups.push({ id: createId(), name: 'Group 1', color: '#63866a' });
  return { groups, boxes, normalized, normalizationPoints: scale };
}
