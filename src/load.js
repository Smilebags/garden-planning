import { readFileSync } from "node:fs";
import path from "node:path";

export function loadGarden(root) {
  const beds = JSON.parse(readFileSync(path.join(root, "data/beds.json"), "utf8"));
  const plants = JSON.parse(readFileSync(path.join(root, "data/plants.json"), "utf8"));
  const plantings = JSON.parse(readFileSync(path.join(root, "data/plantings.json"), "utf8"));
  return {
    lengthM: beds.lengthM,
    gapM: beds.gapM,
    beds: beds.widthsM.map((widthM) => ({ widthM })),
    plants,
    plantings,
  };
}
