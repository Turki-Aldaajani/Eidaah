import React from "react";

export const ICONS = {
  video: '<rect x="3" y="6" width="12" height="12" rx="2.2"/><path d="M15 10.5l5.5-3.2v9.4L15 13.5"/>',
  play: '<path d="M8.5 6.2v11.6l9.3-5.8z"/>',
  clock: '<circle cx="12" cy="12" r="8.6"/><path d="M12 7.4v4.6l3.1 2"/>',
  eye: '<path d="M2.8 12S6.2 5.8 12 5.8 21.2 12 21.2 12 17.8 18.2 12 18.2 2.8 12 2.8 12z"/><circle cx="12" cy="12" r="3"/>',
  check: '<path d="M5 12.5l4.6 4.6L19 7.4"/>',
  x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  chev: '<path d="M6.5 9.5l5.5 5.5 5.5-5.5"/>',
  arrow: '<path d="M19 12H5.5M11 6l-6 6 6 6"/>',
  "book-open": '<path d="M12 6.3C10 4.7 7 4.4 4 4.9V19c3-.5 6-.2 8 1.4 2-1.6 5-1.9 8-1.4V4.9c-3-.5-6-.2-8 1.4z"/><path d="M12 6.3v14.1"/>',
  calculator: '<rect x="5" y="3" width="14" height="18" rx="2.2"/><path d="M8.5 7.3h7M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01"/>',
  flask: '<path d="M9.5 3h5M10 3v5.3L4.9 17.4a2 2 0 0 0 1.8 3h10.6a2 2 0 0 0 1.8-3L14 8.3V3"/><path d="M7.6 14.3h8.8"/>',
  globe: '<circle cx="12" cy="12" r="8.8"/><path d="M3.2 12h17.6M12 3.2c2.9 3.4 2.9 14.2 0 17.6M12 3.2c-2.9 3.4-2.9 14.2 0 17.6"/>',
  atom: '<circle cx="12" cy="12" r="1.5"/><ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(58 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(-58 12 12)"/>',
  "test-tube": '<path d="M8.5 3h7M14.3 3v13.4a2.6 2.6 0 1 1-5.2 0V3"/><path d="M9.4 12.6h4.6"/>',
  dna: '<path d="M8 3c0 5.5 8 6.5 8 12 0 2.8-1.6 4.8-3.2 6M16 3c0 5.5-8 6.5-8 12 0 2.8 1.6 4.8 3.2 6"/><path d="M9.3 7.4h5.4M9.3 16.6h5.4"/>',
  monitor: '<rect x="3" y="4.2" width="18" height="12" rx="2"/><path d="M8.5 20h7M12 16.4V20"/>',
  map: '<path d="M9 4 3.6 6v14L9 18l6 2 5.4-2V4L15 6 9 4z"/><path d="M9 4v14M15 6v14"/>',
  crescent: '<path d="M20.2 14.6A8.6 8.6 0 1 1 9.4 3.8a7.1 7.1 0 0 0 10.8 10.8z"/>',
  sparkles: '<path d="M11 4.5l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6z"/><path d="M18.7 14.8v4.6M16.4 17.1H21"/>',
  lightbulb: '<path d="M9.5 17.4v-1.5c0-1.1-2.6-2.4-2.6-5.5a5.1 5.1 0 0 1 10.2 0c0 3.1-2.6 4.4-2.6 5.5v1.5"/><path d="M9.5 20.5h5"/>',
  "file-text": '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 12.6h6M9 16h6"/>',
  note: '<path d="M11.5 4.5H6a2 2 0 0 0-2 2V18a2 2 0 0 0 2 2h11.5a2 2 0 0 0 2-2v-5.5"/><path d="M17.4 3.6a2 2 0 0 1 2.9 2.9L12 14.8l-3.6.7.7-3.6z"/>',
  target: '<circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="4.8"/><circle cx="12" cy="12" r="1.2"/>',
  flame: '<path d="M12 21c3.9 0 6.4-2.5 6.4-6 0-4.4-3.9-5.9-4.4-9.4-2.5 1.5-3.1 4-2.6 6-1-.5-2-1.8-2.2-3.3-1.3 1.5-3.6 3.4-3.6 6.7 0 3.5 2.5 6 6.4 6z"/>',
  ruler: '<path d="M3.9 16.3 16.3 3.9a1.6 1.6 0 0 1 2.3 0l1.5 1.5a1.6 1.6 0 0 1 0 2.3L7.7 20.1a1.6 1.6 0 0 1-2.3 0l-1.5-1.5a1.6 1.6 0 0 1 0-2.3z"/><path d="m7.6 12.6 1.8 1.8M10.6 9.6l1.8 1.8M13.6 6.6l1.8 1.8"/>',
  alert: '<path d="M12 4.2 2.9 19.1a1.2 1.2 0 0 0 1 1.9h16.2a1.2 1.2 0 0 0 1-1.9z"/><path d="M12 10v4.4M12 17.6h.01"/>',
  "grad-cap": '<path d="m12 4.6 9.8 4.4L12 13.4 2.2 9z"/><path d="M6.6 11.4v4.4c0 1.5 2.4 2.8 5.4 2.8s5.4-1.3 5.4-2.8v-4.4"/><path d="M21.8 9v5"/>',
  filter: '<path d="M4 5h16l-6.2 7.3v5.2l-3.6 2.3v-7.5z"/>',
  "badge-check": '<path d="m12 3 2.1 1.5 2.6-.2 1 2.4 2.4 1-.2 2.6L21.4 12l-1.5 2.1.2 2.6-2.4 1-1 2.4-2.6-.2L12 21.4 9.9 19.9l-2.6.2-1-2.4-2.4-1 .2-2.6L2.6 12l1.5-2.1-.2-2.6 2.4-1 1-2.4 2.6.2z"/><path d="m9 12.2 2.1 2.1 4-4.2"/>',
  calendar: '<rect x="4" y="5.4" width="16" height="15" rx="2"/><path d="M8 3.4v4M16 3.4v4M4 10.2h16"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v4.4h-4.4"/>',
  chart: '<circle cx="12" cy="12" r="8.6"/><path d="M12 3.4V12l6.1 6.1"/>',
  layers: '<path d="m12 3.6 8.8 4.8L12 13.2 3.2 8.4z"/><path d="m3.2 12.7 8.8 4.8 8.8-4.8M3.2 16.6l8.8 4.8 8.8-4.8"/>',
  help: '<circle cx="12" cy="12" r="8.6"/><path d="M9.6 9.4a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.1-2.4 3.8"/><path d="M12 17.2h.01"/>',
  users: '<circle cx="9" cy="8.4" r="3.2"/><path d="M3.6 19.4a5.4 5.4 0 0 1 10.8 0"/><path d="M16 5.6a3.2 3.2 0 0 1 0 6.1M16.8 14.4a5.4 5.4 0 0 1 3.6 5"/>',
  mail: '<rect x="3" y="5.4" width="18" height="13.2" rx="2"/><path d="m3.6 6.6 8.4 6 8.4-6"/>',
  crown: '<path d="M4 8.4 7.2 13l4.8-6.6L16.8 13 20 8.4 18.4 18H5.6z"/>',
  code: '<path d="m8.4 8.4-4 3.6 4 3.6M15.6 8.4l4 3.6-4 3.6M13.6 6.4l-3.2 11.2"/>',
  pen: '<path d="M16.4 3.6a2 2 0 0 1 2.9 2.9L7.7 18.1l-3.9 1 1-3.9z"/><path d="m14.4 5.6 2.9 2.9"/>',
  server: '<rect x="3.4" y="4" width="17.2" height="6" rx="1.6"/><rect x="3.4" y="14" width="17.2" height="6" rx="1.6"/><path d="M7 7h.01M7 17h.01"/>',
  shield: '<path d="M12 3.4 5 6v5.4c0 4.4 3 7.6 7 9.2 4-1.6 7-4.8 7-9.2V6z"/>',
  sun: '<circle cx="12" cy="12" r="4.5"/><path d="M12 2.4v2.8M12 18.8v2.8M4.4 4.4l2 2M17.6 17.6l2 2M2.4 12h2.8M18.8 12h2.8M4.4 19.6l2-2M17.6 6.4l2-2"/>',
  moon: '<path d="M21 12.8a9 9 0 1 1-9-9 7 7 0 0 0 9 9z"/>',
};

export const FILLED_ICONS = {
  star: '<path d="M12 3.4l2.7 5.5 6.1.9-4.4 4.3 1 6-5.4-2.9-5.4 2.9 1-6-4.4-4.3 6.1-.9z"/>',
};

export default function Icon({ name, filled = false, className = "" }) {
  const map = filled ? FILLED_ICONS : ICONS;
  const inner = map[name] || "";
  const classes = `ic${className ? " " + className : ""}`;

  if (filled) {
    return (
      <svg
        className={classes}
        viewBox="0 0 24 24"
        fill="currentColor"
        stroke="none"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: inner }}
      />
    );
  }

  return (
    <svg
      className={classes}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
}
