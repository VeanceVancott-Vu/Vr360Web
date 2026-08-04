# Adding panoramas

## Equirectangular

1. Export a 2:1 JPEG or AVIF in an sRGB color profile.
2. Remove EXIF location data unless publication is intentional.
3. Create a 16:9 preview between 1,200 and 1,800 pixels wide.
4. Store both files under an object store/CDN or `public/panoramas` for a small
   local demonstration.
5. Create the scene, select `EQUIRECTANGULAR`, set the panorama and preview URLs,
   then use the coordinate picker to establish initial pitch, yaw, and hotspots.
6. Test a current iPhone, an average Android phone, and a desktop browser.

Keep source master files outside the application repository. A practical
single-image delivery target is under 8–12 MB; large professional panoramas
should use multiresolution tiles.

## Pannellum multiresolution

Install Pannellum's Python tools from its official distribution and run:

```bash
python generate.py path/to/source-2-to-1.jpg
```

Upload the generated tile directory without renaming levels. Save the base path,
tile resolution, cube resolution, maximum level, extension, and fallback path in
`Scene.multiresConfig`, then select `MULTIRES`. Validate the configuration in a
staging environment because CDN rewrites and cross-origin headers commonly break
tile loading.

## Cubemaps

The data model and viewer converter support six cube faces in the Pannellum
order. The MVP administrator form does not yet expose a six-file upload widget;
add that after a production `MediaStorage` adapter is chosen.

## Coordinates

Yaw ranges from -180° to 180° around the horizon. Pitch ranges from -90° below to
90° above. The administrator coordinate picker estimates both from a 2:1 image.
For final placement, open the live scene, rotate to the exact view, and capture
the viewer's reported values. Avoid placing critical hotspots at the poles or
directly over high-contrast seams.

## Optimization checklist

- Preserve 2:1 dimensions and color profile.
- Generate a small preview before the full image.
- Strip unnecessary metadata.
- Prefer multiresolution for very large masters.
- Preload only the likely next preview.
- Verify seams, horizon, nadir, and zenith.
- Confirm attribution and publication rights.
- Simulate a slow mobile connection and repeat scene changes while watching
  memory usage.
