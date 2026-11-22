# Boxroom

A small, dependency-free PNG bounding box editor. Images are processed locally in the browser.

Run `npm start`, then open **http://127.0.0.1:5173**. Requires Node.js 18 or later. Run `npm test` to check coordinate math and boundary behavior.

1. Open or drop a PNG image.
2. Select **Draw box** (`B`) and drag to create boxes in the active group.
3. Use **Add group** to organize annotations. Click a group to make it active. Edit its name directly in the group header.
4. Drag an existing box to move it, or drag any of its eight resize handles. Existing boxes and handles can be edited even with **Draw box** active. New boxes start on empty image space. Select a box to rename it or assign it to another group.
5. Choose **Export JSON** to download grouped annotations using your chosen coordinate format, alongside the original pixel geometry.

In **Box properties**, check **Normalize coordinates** and enter **Normalization points** (a whole number from 1 to 1,000,000; default 1000). Uncheck it to use original image pixel coordinates. This setting applies to every box, the coordinate display, Copy, and JSON export. Changing it does not move or resize boxes.

**Copy** uses plain text without quotes or brackets: `x_min: 427, y_min: 171, x_max: 594, y_max: 212`.

For normalization scale `N`, coordinates are rounded to the nearest integer: `x_min = x / image_width × N`, `y_min = y / image_height × N`, `x_max = (x + width) / image_width × N`, `y_max = (y + height) / image_height × N`. The origin is the top-left corner. Pixel mode displays up to two decimal places and preserves full precision in Copy and export. Export metadata identifies the chosen format and normalization scale.

Keyboard: `Ctrl/Cmd+Z` to undo, `Ctrl/Cmd+Shift+Z` to redo, `Delete` to remove the selected box, `Escape` to cancel drawing or deselect. Arrow keys move the selected box by one original image pixel; hold Shift for ten pixels.

Zoom with **+** / **−**, **Fit**, or **1:1** (100% original size). `Ctrl/Cmd + mouse wheel` or trackpad pinch zooms around the pointer. Scroll vertically or horizontally with the scrollbars or trackpad; `Shift + mouse wheel` scrolls sideways. Hold **Space** and drag, or drag with the middle mouse button, to pan. Zoom and scrolling never change image coordinates.

Annotations live in memory. Export before refreshing or opening another image. Opening a new PNG clears boxes and undo history; group definitions are retained. Deleting a group also deletes its boxes (undo restores both).
