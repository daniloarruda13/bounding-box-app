# Boxroom

A lightweight PNG bounding box editor for drawing, grouping, and exporting image annotations. Built with plain JavaScript, HTML, and CSS, with no runtime dependencies.

**[Open the live app](https://daniloarruda13.github.io/bounding-box-app/)** · [Source code](https://github.com/daniloarruda13/bounding-box-app) · [Test runs](https://github.com/daniloarruda13/bounding-box-app/actions/workflows/test.yml)

Images and annotations are processed in your browser. No account, image upload, or backend is required to use the editor.

## Features

- Draw multiple bounding boxes and organize them into named, colored groups.
- Rename boxes and groups, reassign boxes, and see box counts per group.
- Show or hide each group's boxes with its **Show** checkbox to work around overlapping annotations.
- Move boxes and resize them using eight handles, even with the drawing tool active.
- Zoom, fit the image, view at 100%, and pan or scroll in both directions.
- Choose pixel coordinates or normalize to 1–1,000,000 points (default 1000).
- Copy coordinates as plain text or download grouped annotations as JSON.
- Save the annotated image as a PNG at its original resolution, with optional box labels.
- Customize group colors or override individual box colors; color changes support Undo/Redo.
- Import a previously exported JSON file to restore groups, boxes, and coordinate settings.
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

Use the **Show** checkbox in each group header to hide or display its boxes. Hidden boxes cannot be selected or dragged, and hiding a selected box clears its selection. Group counts and JSON export still include hidden boxes. Visibility does not affect undo/redo of annotation edits. Drawing a new box in a hidden active group automatically shows that group so the new box is visible.

**Export before refreshing, closing the page, or opening another image.** Annotations live in memory. Opening a new PNG clears boxes and undo history, while retaining group definitions and coordinate settings. Deleting a group deletes its boxes too; Undo restores them.

## Import saved annotations

1. Open the PNG that goes with your exported annotations.
2. Click **Import JSON** next to Export JSON and choose the `.boxes.json` file.
3. Continue editing the restored groups and boxes.

Import replaces the current annotations in one undoable step; **Undo** restores the previous groups, boxes, and coordinate settings. Imported groups start visible. The image dimensions must match those in the JSON; the filename can differ. The app checks dimensions, not image contents, so choose the correct PNG. The PNG is never embedded in the JSON.

Normalization mode and scale are restored from the file. Original pixel geometry is preferred over rounded normalized coordinates. Older Boxroom exports are supported; files without pixel geometry can use normalized or pixel edge coordinates instead. Invalid files leave your current annotations unchanged.

## Save an annotated PNG

In **Save annotated image**, choose whether to **Show box labels**, then click **Save PNG**. The checkbox controls labels on both the editor canvas and the saved image. The download is named `<image-name>.annotated.png` and uses the original PNG dimensions, regardless of zoom or scrolling. Only visible groups are drawn. Selection outlines and resize handles are omitted; transparent areas of the original image remain transparent unless covered by annotations.

Boxes are outline-only by default. Enable **Fill boxes** in the same section for a translucent fill in each box's color. This preference applies to both the editor and saved PNG and is independent of label visibility. Fill and label preferences are not stored in JSON.

Adjust **Line thickness** with the slider or numeric field (1–20 original image pixels, default 2). The preview updates immediately and scales with zoom; the saved PNG uses the same thickness at original resolution. This display/export preference is not stored in JSON and does not change box coordinates.

PNG export is a rendered image for sharing. Use **Export JSON** as well to save editable annotation data.

## Change box colors

Click the color swatch in a group header to change the group's color. Boxes inherit this color by default. To customize one box, select it and choose **Box color** under **Box properties**. **Use group color** removes the individual override. Changing a group's color updates its inherited boxes while preserving any individual overrides.

Colors apply to the editor and saved PNG and are preserved by JSON export/import. Label text automatically uses black or white for contrast. Label visibility is a display/export preference and is not stored in JSON.

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
- Work is not automatically saved. Export JSON to save annotations, then reopen the matching PNG and import the JSON to resume editing. Zoom and group visibility preferences are not stored in exports.
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

`npm run build` copies only the six browser assets into `_site/` for static hosting. See [CONTRIBUTING.md](CONTRIBUTING.md) for the file layout and manual checks, and [deployment instructions](docs/deployment.md) for GitHub Pages or other static hosts.

## License

[MIT](LICENSE). You can use, modify, and distribute this app, including commercially, under the license terms.
