# Contributing to Boxroom

Bug reports, documentation fixes, and focused improvements are welcome.

## Get started

1. Fork the repository and clone your fork.
2. Install Node.js 22 or later.
3. Create a branch for your change.
4. Run `npm start` and open http://127.0.0.1:5173.

There are no dependencies to install.

## Project layout

| File | Purpose |
| --- | --- |
| `index.html` | Editor structure and accessible controls |
| `style.css` | Layout, handles, and responsive styles |
| `app.js` | State, drawing, groups, navigation, clipboard, and export |
| `geometry.js` | Normalization and bounded move/resize math |
| `geometry.test.js` | Geometry tests |
| `app.test.js` | Event-handler tests using a small DOM fixture |
| `server.js` | Local development server with an asset allowlist |
| `scripts/build.js` | Static-host asset packaging |
| `.github/workflows/` | Automated tests and Pages deployment |

Keep box geometry in original image pixels. View transforms and coordinate-format changes must not change stored boxes. Keep image processing local to the browser.

## Check your changes

```sh
npm test
npm run check
npm run build
```

For interaction changes, also check the app in a real browser:

- Open a PNG and draw several boxes in two groups.
- Resize all eight handles while Draw is active; verify no extra boxes appear.
- Move a box to each image boundary, then undo and redo.
- Rename boxes and groups and reassign a box between groups.
- Toggle Show for groups with overlapping boxes; verify hidden boxes cannot be edited on the canvas, reappear unchanged when shown, and remain in JSON export.
- Zoom, scroll both axes, pan, and resize again at the new zoom.
- Toggle normalization, enter a custom scale, and check invalid values.
- Paste copied coordinates and inspect JSON export in both modes.
- Try a narrow window and check that controls remain reachable.

Use a synthetic or publicly shareable image when reporting a bug. Include the browser, reproduction steps, expected behavior, actual behavior, and screenshots if useful. Do not attach private images or credentials.

Submit a pull request describing the problem, resulting behavior, and checks you ran. Add regression coverage when changing coordinate math or interaction behavior.
