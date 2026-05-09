/**
 * Canonical interior-design style catalog.
 *
 * Day 11. Previously each surface (Home gallery, Studio StepStyle,
 * RenderProgress, Try.jsx, server VALID_STYLES) had its own list — they
 * drifted, with three different bugs caught in QA-9:
 *   1. Home advertised "Coastal" which the server rejects.
 *   2. Studio offered "Cottagecore" which Home didn't show.
 *   3. Studio used label "Scandi" while server VALID_STYLES expects "Scandinavian".
 *
 * One canonical list, imported everywhere. The `id` is what flows to the
 * server (must match the Kontext prompt regex AND server VALID_STYLES);
 * `label` is what users see (can be shorter); everything else is for the
 * gallery cards.
 */

export const STYLES = [
  {
    id: 'Japandi',
    label: 'Japandi',
    desc: 'Calm · Natural · Wabi-sabi',
    palette: 'Sage greens, warm whites, natural oak',
    img: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=400&q=80',
    accent: '#B8A88A',
  },
  {
    id: 'Scandinavian',
    label: 'Scandinavian',
    desc: 'Hygge · Birch · Simplicity',
    palette: 'White, birch, soft blues',
    img: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=400&q=80',
    accent: '#9090B0',
  },
  {
    id: 'Mid-Century Modern',
    label: 'Mid-Century',
    desc: 'Organic · Walnut · Vintage',
    palette: 'Mustard, avocado, warm brown',
    img: 'https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=400&q=80',
    accent: '#C9A040',
  },
  {
    id: 'Industrial',
    label: 'Industrial',
    desc: 'Raw · Steel · Utilitarian',
    palette: 'Gunmetal, rust, weathered wood',
    img: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=400&q=80',
    accent: '#8B6555',
  },
  {
    id: 'Boho',
    label: 'Boho',
    desc: 'Layered · Rattan · Global',
    palette: 'Terracotta, burnt orange, cream',
    img: 'https://images.unsplash.com/photo-1616137466211-f939a420be84?auto=format&fit=crop&w=400&q=80',
    accent: '#C07858',
  },
  {
    id: 'Modern Minimal',
    label: 'Modern Minimal',
    desc: 'Clean · Negative space · Purpose',
    palette: 'White, greige, matte black',
    img: 'https://images.unsplash.com/photo-1615529182904-14819c35db37?auto=format&fit=crop&w=400&q=80',
    accent: '#D0D0D0',
  },
  {
    id: 'Cottagecore',
    label: 'Cottagecore',
    desc: 'Floral · Soft light · Comfort',
    palette: 'Blush, dusty rose, sage',
    img: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=400&q=80',
    accent: '#D4A0A0',
  },
  {
    id: 'Art Deco',
    label: 'Art Deco',
    desc: 'Geometric · Gold · Glamour',
    palette: 'Black, gold, emerald',
    img: 'https://images.unsplash.com/photo-1631679706909-1844bbd07221?auto=format&fit=crop&w=400&q=80',
    accent: '#C9A96E',
  },
];

/** Just the IDs — useful for server-validation parity checks. */
export const STYLE_IDS = STYLES.map((s) => s.id);

/** Look up a style by id; returns null if not found. */
export function getStyleById(id) {
  return STYLES.find((s) => s.id === id) || null;
}
