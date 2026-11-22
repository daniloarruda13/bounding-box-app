# Boxroom

A lightweight PNG bounding box editor for drawing, grouping, and exporting image annotations. Built with plain JavaScript, HTML, and CSS, with no runtime dependencies.

Images and annotations are processed in your browser. No account, image upload, or backend is required to use the editor.

## Features

- Draw multiple bounding boxes and organize them into named, colored groups.
- Rename boxes and groups, reassign boxes, and see box counts per group.
- Move boxes and resize them using eight handles, even with the drawing tool active.
- Zoom, fit the image, view at 100%, and pan or scroll in both directions.
- Choose pixel coordinates or normalize to 1–1,000,000 points (default 1000).
- Copy coordinates as plain text or download grouped annotations as JSON.
- Undo and redo annotation edits, with up to 100 history entries.

## Run locally

Install **Node.js 22 or later**, download or clone this repository, and open a terminal in its directory:

```sh
npm start
```

Open **http://127.0.0.1:5173** in a modern browser. No `npm install` or build step is needed. Stop the server with `Ctrl+C`.

The preview server listens on your own device only. Port 5173 must be available. Serve the app over HTTP or HTTPS rather than opening `index.html` as a file.

## Annotate an image

1. Click **Open PNG**, or drop a PNG into the editor.
2. Select **Draw box** (`B`) and drag over empty image space to create a box in the active group. Drawing works in any direction.
3. Click **Add group** to create another group. Click its header to make it active. Edit the group name directly in the header.
4. Click or drag an existing box to select or move it. Drag a handle to resize it. Existing boxes and handles take priority over drawing.
5. Use **Box properties** to rename the selected box or assign it to another group.
6. Choose your coordinate format, then use **Copy** or **Export JSON**.

**Export before refreshing, closing the page, or opening another image.** Annotations live in memory. Opening a new PNG clears boxes and undo history, while retaining group definitions and coordinate settings. Deleting a group deletes its boxes too; Undo restores them.

## Coordinates and export

The origin is the image's top-left corner. Coordinates always refer to the original image, regardless of zoom or scrolling.

In **Box properties**, enable **Normalize coordinates** and enter **Normalization points**, or uncheck it to use pixels. The setting applies to every box, Copy, and JSON export; it does not move or resize boxes.

For scale `N`:

```text
x_min = round(x / image_width * N)
y_min = round(y / image_height * N)
x_max = round((x + box_width) / image_width * N)
y_max = round((y + box_height) / image_height * N)
```

Pixel mode displays up to two decimal places. Copy and JSON export preserve the underlying pixel precision.

**Copy** produces plain text without quotation marks or brackets:

```text
x_min: 427, y_min: 171, x_max: 594, y_max: 212
```

**Export JSON** downloads `<image-name>.boxes.json` with image dimensions, coordinate-system metadata, groups, box names, and original pixel geometry. It does not include the PNG itself. See [the export format and examples](docs/export-format.md).

## Navigation and shortcuts

| Action | Control |
| --- | --- |
| Draw boxes | `B` |
| Select / move | `V` |
| Resize | Drag one of the selected box's eight handles |
| Undo | `Ctrl/Cmd + Z` |
| Redo | `Ctrl/Cmd + Shift + Z` |
| Delete selected box | `Delete` or `Backspace` |
| Cancel gesture / deselect | `Escape` |
| Move selected box by 1 image pixel | Arrow keys |
| Move selected box by 10 image pixels | `Shift` + arrow keys |
| Zoom | **+ / −**, **Fit**, **1:1**, or `Ctrl/Cmd` + wheel / trackpad pinch |
| Pan | Hold `Space` and drag, or middle-button drag |
| Scroll horizontally | Horizontal scrollbar, trackpad, or `Shift` + wheel |
| Scroll vertically | Vertical scrollbar, trackpad, or mouse wheel |

Keyboard shortcuts do not run while you type in form fields. **1:1** means 100% of the original image size.

## Privacy and limitations

- The editor has no analytics, external fonts, or image-upload requests. Hosting services still receive normal page requests.
- PNG is the supported input format. Very large images are limited by browser memory.
- Work is not automatically saved. JSON import and restoring an exported session are not implemented.
- To draw a new box, begin on empty image space; dragging an existing box edits it.
- Clipboard access requires browser permission and a secure context (HTTPS or localhost). JSON export remains available when copying is unavailable.
- The interface is designed primarily for a mouse and keyboard. Browser rendering and pointer behavior are not covered by the automated DOM fixture tests.

## Development

```sh
npm test
npm run check
npm run build
```

Tests cover coordinate math, boundaries, resizing while drawing, undo/redo, pointer cancellation, zoom and pan, normalization, pixel mode, and clipboard/export formatting. Tests use Node's built-in test runner and a small DOM fixture; timer mocking may print an experimental warning on Node 22.

`npm run build` copies only the four browser assets into `_site/` for static hosting. See [CONTRIBUTING.md](CONTRIBUTING.md) for the file layout and manual checks, and [deployment instructions](docs/deployment.md) for GitHub Pages or other static hosts.

## License

[MIT](LICENSE). You can use, modify, and distribute this app, including commercially, under the license terms.
