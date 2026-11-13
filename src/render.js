import { bedLayout, formatMetres, isActiveOn, plantingPosition } from "./layout.js";

export const SCALE = 100;
export const MARGIN = { top: 52, right: 16, bottom: 56, left: 64 };

const FRUIT_MARKS = [
  [-0.22, 0.08, 0.18],
  [0.2, 0.12, 0.15],
  [0.02, -0.22, 0.14],
];

function xPx(metres) {
  return MARGIN.left + metres * SCALE;
}

function yPx(metres) {
  return MARGIN.top + metres * SCALE;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function axisMarkup(lengthM) {
  const ticks = [];
  for (let metre = 0; metre < lengthM; metre += 1) ticks.push(metre);
  if (ticks.at(-1) !== lengthM) ticks.push(lengthM);

  const x = MARGIN.left - 8;
  const parts = [
    `<line x1="${x}" y1="${yPx(0)}" x2="${x}" y2="${yPx(lengthM)}" stroke="#8a7d6e" stroke-width="1"></line>`,
  ];
  for (const metre of ticks) {
    const y = yPx(metre);
    const label = Number.isInteger(metre) ? String(metre) : metre.toFixed(1);
    parts.push(
      `<line x1="${x}" y1="${y}" x2="${x + 6}" y2="${y}" stroke="#8a7d6e" stroke-width="1"></line>`,
      `<text x="${x - 6}" y="${y}" text-anchor="end" dominant-baseline="middle" fill="#6f6458" font-size="11">${label}</text>`,
    );
  }
  return parts.join("");
}

function bedMarkup(bed) {
  const x = xPx(bed.xM);
  const y = yPx(0);
  const width = bed.widthM * SCALE;
  const height = bed.lengthM * SCALE;
  const center = x + width / 2;
  return [
    `<rect class="bed" data-bed-index="${bed.bedIndex}" x="${x}" y="${y}" width="${width}" height="${height}" fill="#7a5340" stroke="#4e3326" stroke-width="1.5"></rect>`,
    `<text x="${center}" y="${MARGIN.top - 26}" text-anchor="middle" fill="#2a2118" font-size="13" font-weight="600">Bed ${bed.bedIndex}</text>`,
    `<text x="${center}" y="${MARGIN.top - 10}" text-anchor="middle" fill="#6f6458" font-size="11">${formatMetres(bed.widthM)}</text>`,
  ].join("");
}

function plantMarkup(garden, layout, planting, selected) {
  const plant = garden.plants[planting.plant];
  const position = plantingPosition(layout, planting);
  const radius = (plant.spreadM / 2) * SCALE;
  const cx = xPx(position.xM);
  const cy = yPx(position.yM);
  const appearance = plant.appearance;
  const label = `${plant.name}, bed ${planting.bedIndex}, ${formatMetres(planting.yM)} along`;
  const fruit = appearance.fruit
    ? FRUIT_MARKS.map(([fx, fy, fr]) => {
        return `<circle cx="${(fx * radius).toFixed(2)}" cy="${(fy * radius).toFixed(2)}" r="${(fr * radius).toFixed(2)}" fill="${appearance.fruit}"></circle>`;
      }).join("")
    : "";
  const selectedClass = selected ? " is-selected" : "";
  return [
    `<g class="planting${selectedClass}" data-planting-id="${escapeXml(planting.id)}" tabindex="0" role="button" aria-label="${escapeXml(label)}" aria-pressed="${selected ? "true" : "false"}" transform="translate(${cx} ${cy})">`,
    `<title>${escapeXml(label)}</title>`,
    `<circle class="halo" r="${(radius + 5).toFixed(2)}" fill="none" stroke="#8c3d2f" stroke-width="2"></circle>`,
    `<circle class="canopy" r="${radius.toFixed(2)}" fill="${appearance.foliage}" stroke="${appearance.outline}" stroke-width="2"></circle>`,
    fruit,
    `</g>`,
  ].join("");
}

export function renderDiagram(garden, { date, selectedId }) {
  const layout = bedLayout(garden);
  const width = layout.widthM * SCALE + MARGIN.left + MARGIN.right;
  const height = layout.lengthM * SCALE + MARGIN.top + MARGIN.bottom;
  const active = garden.plantings
    .filter((planting) => isActiveOn(planting, date))
    .sort((a, b) => a.bedIndex - b.bedIndex || a.yM - b.yM || a.xM - b.xM || a.id.localeCompare(b.id));

  const groundWidth = layout.widthM * SCALE;
  const groundHeight = layout.lengthM * SCALE;
  const barY = yPx(layout.lengthM) + 26;
  const barStart = xPx(0);
  const barEnd = xPx(1);

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="group" aria-label="Garden beds drawn to scale" font-family="Avenir Next, Segoe UI, sans-serif">`,
    `<rect class="ground" data-width-m="${layout.widthM}" data-length-m="${layout.lengthM}" x="${xPx(0)}" y="${yPx(0)}" width="${groundWidth}" height="${groundHeight}" fill="#ddd6c8" stroke="#c9c0b0" stroke-width="1"></rect>`,
    axisMarkup(layout.lengthM),
    ...layout.beds.map((bed) => bedMarkup(bed)),
    ...active.map((planting) => plantMarkup(garden, layout, planting, planting.id === selectedId)),
    `<line x1="${barStart}" y1="${barY}" x2="${barEnd}" y2="${barY}" stroke="#2a2118" stroke-width="1.5"></line>`,
    `<line x1="${barStart}" y1="${barY - 4}" x2="${barStart}" y2="${barY + 4}" stroke="#2a2118" stroke-width="1.5"></line>`,
    `<line x1="${barEnd}" y1="${barY - 4}" x2="${barEnd}" y2="${barY + 4}" stroke="#2a2118" stroke-width="1.5"></line>`,
    `<text x="${(barStart + barEnd) / 2}" y="${barY + 16}" text-anchor="middle" fill="#2a2118" font-size="11">1 m</text>`,
    `</svg>`,
  ].join("");

  return { svg, active, layout };
}
