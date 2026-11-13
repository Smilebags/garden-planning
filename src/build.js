import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { assertGarden } from "./layout.js";
import { loadGarden } from "./load.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function build(siteRoot = root) {
  const garden = loadGarden(siteRoot);
  assertGarden(garden);
  const dist = path.join(siteRoot, "dist");
  rmSync(dist, { recursive: true, force: true });
  mkdirSync(dist, { recursive: true });

  const template = readFileSync(path.join(siteRoot, "src/index.template.html"), "utf8");
  const data = JSON.stringify(garden, null, 2).replaceAll("<", "\\u003c");
  writeFileSync(path.join(dist, "index.html"), template.replace("__GARDEN_DATA__", data));
  for (const file of ["app.js", "layout.js", "render.js", "site.css"]) {
    cpSync(path.join(siteRoot, "src", file), path.join(dist, file));
  }
  return dist;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  build();
}
