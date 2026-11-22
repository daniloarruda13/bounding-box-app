# Annotation export format

**Export JSON** creates `<image-name>.boxes.json`. The PNG itself is not embedded. All groups are included, even empty ones. Boxes appear inside their assigned group.

## Normalized coordinates

For a 1000 × 600 image with a box at `(100, 120)` measuring `300 × 180`, exporting at scale 1000 produces:

```json
{
  "image": { "name": "example.png", "width": 1000, "height": 600 },
  "coordinate_system": {
    "normalized": true,
    "scale": 1000,
    "origin": "top-left",
    "rounding": "nearest integer"
  },
  "groups": [
    {
      "name": "Group 1",
      "color": "#63866a",
      "boxes": [
        {
          "name": "Box 1",
          "x_min": 100,
          "y_min": 200,
          "x_max": 400,
          "y_max": 500,
          "pixels": { "x": 100, "y": 120, "width": 300, "height": 180 }
        }
      ]
    }
  ]
}
```

Each axis is scaled independently against its original image dimension. A full-image box has `x_min = y_min = 0` and `x_max = y_max = scale`. Scale is a positive integer from 1 to 1,000,000. At low scales, rounding can make a small box's minimum and maximum equal; its original pixel geometry is retained.

## Pixel coordinates

With normalization unchecked, the same box has:

```json
{
  "name": "Box 1",
  "x_min": 100,
  "y_min": 120,
  "x_max": 400,
  "y_max": 300,
  "pixels": { "x": 100, "y": 120, "width": 300, "height": 180 }
}
```

The enclosing `coordinate_system` is:

```json
{
  "normalized": false,
  "units": "pixels",
  "origin": "top-left",
  "rounding": "none"
}
```

Pixel coordinates can be fractional because dragging at a scaled view can land between original pixels. The interface shows up to two decimal places; exported pixel values preserve full JavaScript numeric precision. Coordinates describe geometric edges, not inclusive raster pixel indexes: a full-image box ends at `image.width` and `image.height`.

## Clipboard

Copy uses the current coordinate mode and scale. It copies only the selected box, without JSON syntax:

```text
x_min: 100, y_min: 200, x_max: 400, y_max: 500
```

Pixel mode copies unrounded values. Names and group membership are included in JSON export, not clipboard text. JSON import is not currently supported.
