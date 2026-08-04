# Accessibility

The public tour targets WCAG 2.2 AA interaction patterns. Panorama visuals are
supplementary: every published scene must retain a text title, description, and
non-visual navigation path.

## Implemented behavior

- A visible-on-focus skip link moves keyboard users to the current destination.
- The panorama is a named, focusable region with localized keyboard instructions
  and an accurate busy state.
- Viewer buttons expose names and pressed states; auto-rotate is opt-in and its
  label changes to the available stop action.
- The scene sidebar is inert while closed, receives focus when opened, closes
  with Escape, and restores focus to its triggering control.
- Information, map, and image dialogs trap focus, close with Escape, lock
  background scrolling, and restore the opener.
- Map modes use keyboard-operable tabs. Floor-plan markers and the text map
  fallback expose accessible names and the current location.
- Scene changes, loading, errors, search result counts, and transient notices use
  polite or assertive live regions according to urgency.
- Narration never autoplays. Playback, progress, volume, mute, and transcript
  controls have localized names.
- Visible focus, reduced motion, forced colors, and touch targets are supported.

## Automated checks

Testing Library covers dialog focus containment and restoration, sidebar
inert/Escape behavior, map tab keyboard behavior, viewer instructions and busy
state, dynamic auto-rotate labels, live announcements, narration controls, and
text scene navigation. Run:

```bash
npm test
npm run lint
npm run typecheck
```

Automated checks do not replace assistive-technology testing.

## Manual release gate

Before a public release, test the final content and media with:

- NVDA with Chrome or Firefox on Windows;
- VoiceOver with Safari on macOS and iOS;
- TalkBack with Chrome on Android;
- keyboard-only navigation at 100%, 200%, and 400% zoom;
- Windows High Contrast and reduced-motion settings;
- a slow network with WebGL enabled and disabled.

Confirm that focus order matches the visual order, no dialog leaks focus,
panorama meaning remains available as text, every uploaded image has a useful
alternative, and contrast remains sufficient over each final panorama.
