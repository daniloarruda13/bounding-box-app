export function labelTextColor(hex) {
  const rgb = [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const linear = rgb.map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2] > .179 ? '#000000' : '#ffffff';
}

// Render from original image pixels; zoom, selection, and resize handles are UI only.
export function drawAnnotatedImage(context, image, width, height, boxes, groups, hiddenGroups, includeLabels, fillBoxes = false, lineThickness = 2) {
  context.clearRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  const groupById = new Map(groups.map(group => [group.id, group]));
  const visible = boxes.filter(box => !hiddenGroups.has(box.groupId));
  const lineWidth = lineThickness;
  const fontSize = Math.max(12, Math.min(48, Math.round(Math.max(width, height) / 65)));
  context.save();
  for (const box of visible) {
    const color = box.color || groupById.get(box.groupId).color;
    if (fillBoxes) {
      context.fillStyle = color; context.globalAlpha = .12;
      context.fillRect(box.x, box.y, box.w, box.h);
    }
    context.globalAlpha = 1; context.strokeStyle = color;
    const stroke = Math.min(lineWidth, box.w, box.h);
    context.lineWidth = stroke;
    context.strokeRect(box.x + stroke / 2, box.y + stroke / 2, box.w - stroke, box.h - stroke);
  }
  if (includeLabels) {
    context.font = `500 ${fontSize}px sans-serif`; context.textBaseline = 'middle';
    for (const box of visible) {
      const color = box.color || groupById.get(box.groupId).color;
      const padding = Math.max(3, Math.round(fontSize / 3));
      const labelWidth = Math.min(width, context.measureText(box.name).width + padding * 2);
      const labelHeight = Math.min(height, fontSize + padding * 2);
      const x = Math.max(0, Math.min(box.x, width - labelWidth));
      const y = Math.max(0, Math.min(box.y >= labelHeight ? box.y - labelHeight : box.y, height - labelHeight));
      context.fillStyle = color; context.fillRect(x, y, labelWidth, labelHeight);
      context.fillStyle = labelTextColor(color);
      if (labelWidth > padding * 2) context.fillText(box.name, x + padding, y + labelHeight / 2, labelWidth - padding * 2);
    }
  }
  context.restore();
}
