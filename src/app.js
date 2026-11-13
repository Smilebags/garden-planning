import { describeLayout, formatMetres, isActiveOn } from "./layout.js";
import { renderDiagram } from "./render.js";

const garden = JSON.parse(document.getElementById("garden-data").textContent);
const summary = document.getElementById("summary");
const caption = document.getElementById("caption");
const diagram = document.getElementById("diagram");
const list = document.getElementById("plant-list");
const details = document.getElementById("details");
const dateInput = document.getElementById("date");

const state = {
  date: initialDate(garden.plantings),
  selectedId: null,
};

summary.textContent = describeLayout(garden);
caption.textContent = "Positions are measured from the left edge and the top of each bed. Circles show each plant’s spread, to scale.";
dateInput.value = state.date;
dateInput.addEventListener("change", () => {
  state.date = dateInput.value || state.date;
  if (!dateInput.value) dateInput.value = state.date;
  draw();
});
document.querySelector(".date-field").addEventListener("submit", (event) => {
  event.preventDefault();
});

diagram.addEventListener("click", (event) => {
  const id = event.target.closest("[data-planting-id]")?.dataset.plantingId;
  if (id) select(id);
});

diagram.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const id = event.target.closest("[data-planting-id]")?.dataset.plantingId;
  if (!id) return;
  event.preventDefault();
  select(id);
});

list.addEventListener("click", (event) => {
  const id = event.target.closest("[data-planting-id]")?.dataset.plantingId;
  if (id) select(id);
});

draw();

function select(id) {
  state.selectedId = id;
  draw();
}

function draw() {
  const focusId = diagram.contains(document.activeElement)
    ? document.activeElement.closest("[data-planting-id]")?.dataset.plantingId
    : null;
  let rendered = renderDiagram(garden, state);
  const selectionIsVisible = rendered.active.some((planting) => planting.id === state.selectedId);
  if (!selectionIsVisible) {
    state.selectedId = rendered.active[0]?.id ?? null;
    rendered = renderDiagram(garden, state);
  }
  diagram.innerHTML = rendered.svg;
  renderList(rendered.active);
  renderDetails(rendered.active.find((planting) => planting.id === state.selectedId) ?? null);
  if (focusId) {
    diagram.querySelector(`[data-planting-id="${CSS.escape(focusId)}"]`)?.focus();
  }
}

function renderList(active) {
  list.replaceChildren();
  if (active.length === 0) {
    const item = document.createElement("li");
    item.className = "empty";
    item.textContent = "Nothing is in the ground on this date.";
    list.append(item);
    return;
  }
  for (const planting of active) {
    const plant = garden.plants[planting.plant];
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.plantingId = planting.id;
    if (planting.id === state.selectedId) button.setAttribute("aria-current", "true");

    const swatch = document.createElement("span");
    swatch.className = "swatch";
    swatch.style.backgroundColor = plant.appearance.foliage;
    if (plant.appearance.fruit) {
      swatch.style.backgroundImage = `radial-gradient(circle at 50% 58%, ${plant.appearance.fruit} 0 3px, transparent 4px)`;
    }

    const text = document.createElement("span");
    const name = document.createElement("span");
    name.className = "name";
    name.textContent = plant.name;
    const meta = document.createElement("span");
    meta.className = "meta";
    meta.textContent = `Bed ${planting.bedIndex} · ${formatMetres(planting.yM)} along`;
    text.append(name, meta);
    button.append(swatch, text);
    item.append(button);
    list.append(item);
  }
}

function renderDetails(planting) {
  details.replaceChildren();
  if (!planting) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "Select a plant on the plan.";
    details.append(empty);
    return;
  }

  const plant = garden.plants[planting.plant];
  const heading = document.createElement("h3");
  heading.textContent = plant.name;
  details.append(heading);

  const facts = document.createElement("dl");
  facts.className = "facts";
  addFact(facts, "Bed", String(planting.bedIndex));
  addFact(facts, "Across", formatMetres(planting.xM));
  addFact(facts, "Along", formatMetres(planting.yM));
  addFact(facts, "Spread", formatMetres(plant.spreadM));
  addFact(facts, "Planted", formatDate(planting.planted));
  addFact(facts, "Removed", planting.removed == null ? "Still in the ground" : formatDate(planting.removed));
  details.append(facts);

  const notes = [plant.notes, planting.notes].filter((note) => note != null && note.trim() !== "");
  if (notes.length === 0) {
    const none = document.createElement("p");
    none.className = "empty";
    none.textContent = "No notes.";
    details.append(none);
    return;
  }
  for (const note of notes) {
    const paragraph = document.createElement("p");
    paragraph.className = "notes";
    paragraph.textContent = note;
    details.append(paragraph);
  }
}

function addFact(listElement, term, value) {
  const dt = document.createElement("dt");
  dt.textContent = term;
  const dd = document.createElement("dd");
  dd.textContent = value;
  listElement.append(dt, dd);
}

function formatDate(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function localIsoDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function initialDate(plantings) {
  const today = localIsoDate();
  if (plantings.some((planting) => isActiveOn(planting, today))) return today;
  const planted = plantings.map((planting) => planting.planted).sort();
  return planted.at(-1) ?? today;
}
