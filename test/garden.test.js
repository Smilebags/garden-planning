import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "../src/build.js";
import { bedLayout, describeLayout, isActiveOn, plantingPosition, validateGarden } from "../src/layout.js";
import { loadGarden } from "../src/load.js";
import { MARGIN, SCALE, renderDiagram } from "../src/render.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("beds are 3.5 m long with 50 cm paths and the given widths", () => {
  const garden = loadGarden(root);
  const layout = bedLayout(garden);

  assert.equal(garden.lengthM, 3.5);
  assert.equal(garden.gapM, 0.5);
  assert.deepEqual(
    layout.beds.map((bed) => bed.widthM),
    [0.5, 1, 1, 1, 0.5],
  );
  assert.deepEqual(
    layout.beds.map((bed) => bed.xM),
    [0, 1, 2.5, 4, 5.5],
  );
  assert.equal(layout.widthM, 6);
  assert.equal(layout.lengthM, 3.5);
  assert.equal(validateGarden(garden).length, 0);
  assert.match(describeLayout(garden), /5 beds, each 3\.50 m long, separated by 0\.50 m paths/);
});

test("four tomatoes sit down the middle of bed 2", () => {
  const garden = loadGarden(root);
  const layout = bedLayout(garden);
  const bed = layout.beds[1];
  const expectedY = [0, 1, 2, 3].map((index) => ((index + 0.5) * garden.lengthM) / 4);

  assert.equal(bed.bedIndex, 2);
  assert.equal(bed.widthM, 1);
  assert.equal(garden.plantings.length, 4);
  assert.deepEqual(
    garden.plantings.map((planting) => planting.yM),
    expectedY,
  );

  for (const planting of garden.plantings) {
    assert.equal(planting.plant, "tomato");
    assert.equal(planting.bedIndex, 2);
    assert.equal(planting.xM, bed.widthM / 2);
    assert.equal(planting.planted, "2026-11-01");
    assert.equal(planting.removed, null);
    const position = plantingPosition(layout, planting);
    assert.equal(position.xM, bed.xM + bed.widthM / 2);
  }

  const tomato = garden.plants.tomato;
  assert.equal(tomato.spreadM, 0.6);
  assert.equal(tomato.appearance.foliage, "#3f7a38");
  assert.equal(tomato.appearance.fruit, "#d6453d");
  assert.ok(tomato.notes.length > 0);
});

test("a planting is visible from its planted date until the day it is removed", () => {
  const planting = {
    planted: "2026-11-01",
    removed: "2026-12-01",
  };
  assert.equal(isActiveOn(planting, "2026-10-31"), false);
  assert.equal(isActiveOn(planting, "2026-11-01"), true);
  assert.equal(isActiveOn(planting, "2026-11-30"), true);
  assert.equal(isActiveOn(planting, "2026-12-01"), false);
  assert.equal(isActiveOn({ planted: "2026-11-01", removed: null }, "2027-02-01"), true);
});

test("the diagram draws every bed and only the plants in the ground", () => {
  const garden = loadGarden(root);
  const shown = renderDiagram(garden, { date: "2026-11-14", selectedId: "tomato-2" });
  const hidden = renderDiagram(garden, { date: "2026-10-31", selectedId: null });

  assert.equal(shown.active.length, 4);
  assert.equal(hidden.active.length, 0);
  for (const id of ["tomato-1", "tomato-2", "tomato-3", "tomato-4"]) {
    assert.match(shown.svg, new RegExp(`data-planting-id="${id}"`));
    assert.doesNotMatch(hidden.svg, new RegExp(`data-planting-id="${id}"`));
  }
  assert.match(shown.svg, /aria-pressed="true"/);

  for (const [index, widthM] of [0.5, 1, 1, 1, 0.5].entries()) {
    const bedIndex = index + 1;
    const x = MARGIN.left + [0, 1, 2.5, 4, 5.5][index] * SCALE;
    assert.match(shown.svg, new RegExp(`data-bed-index="${bedIndex}" x="${x}" [^>]*width="${widthM * SCALE}"`));
  }
  assert.match(hidden.svg, /data-bed-index="5"/);
});

test("plantings have to stay inside a known bed and use a known plant", () => {
  const garden = loadGarden(root);
  const broken = structuredClone(garden);
  broken.plantings[0].bedIndex = 9;
  broken.plantings[1].xM = 2;
  broken.plantings[2].plant = "basil";
  broken.plantings[3].removed = "2026-10-01";

  const errors = validateGarden(broken);
  assert.ok(errors.some((error) => error.includes("tomato-1") && error.includes("bedIndex")));
  assert.ok(errors.some((error) => error.includes("tomato-2") && error.includes("xM")));
  assert.ok(errors.some((error) => error.includes("unknown plant basil")));
  assert.ok(errors.some((error) => error.includes("tomato-4") && error.includes("removed")));
});

test("the site build embeds the garden data", () => {
  const dist = build(root);
  const html = readFileSync(path.join(dist, "index.html"), "utf8");
  assert.match(html, /"bedIndex": 2/);
  assert.match(html, /tomato-4/);
  assert.match(html, /<script type="module" src="\.\/app\.js"><\/script>/);
  assert.equal(readFileSync(path.join(dist, "app.js"), "utf8").includes("renderDiagram"), true);
});
