const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const PLANTING_ID = /^[A-Za-z0-9_-]+$/;

export function formatMetres(value) {
  return `${value.toFixed(2)} m`;
}

export function describeLayout(garden) {
  const widths = garden.beds.map((bed) => formatMetres(bed.widthM)).join(", ");
  const bedWord = garden.beds.length === 1 ? "bed" : "beds";
  return `${garden.beds.length} ${bedWord}, each ${formatMetres(garden.lengthM)} long, separated by ${formatMetres(garden.gapM)} paths. Widths from left to right: ${widths}.`;
}

export function bedLayout(garden) {
  let cursor = 0;
  const beds = garden.beds.map((bed, index) => {
    const frame = {
      bedIndex: index + 1,
      widthM: bed.widthM,
      lengthM: garden.lengthM,
      xM: cursor,
    };
    cursor += bed.widthM;
    if (index < garden.beds.length - 1) cursor += garden.gapM;
    return frame;
  });
  return {
    beds,
    widthM: cursor,
    lengthM: garden.lengthM,
    gapM: garden.gapM,
  };
}

export function isActiveOn(planting, date) {
  if (planting.planted > date) return false;
  if (planting.removed != null && planting.removed <= date) return false;
  return true;
}

export function plantingPosition(layout, planting) {
  const bed = layout.beds.find((item) => item.bedIndex === planting.bedIndex);
  return {
    bed,
    xM: bed.xM + planting.xM,
    yM: planting.yM,
  };
}

function isIsoDate(value) {
  if (typeof value !== "string") return false;
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isPositive(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function validateGarden(garden) {
  const errors = [];
  if (garden == null || typeof garden !== "object" || Array.isArray(garden)) {
    return ["Garden config must be an object"];
  }

  if (!isPositive(garden.lengthM)) {
    errors.push("lengthM must be a positive number");
  }
  if (typeof garden.gapM !== "number" || !Number.isFinite(garden.gapM) || garden.gapM < 0) {
    errors.push("gapM must be zero or a positive number");
  }
  if (!Array.isArray(garden.beds) || garden.beds.length === 0) {
    errors.push("beds must be a non-empty array");
  } else {
    garden.beds.forEach((bed, index) => {
      if (bed == null || !isPositive(bed.widthM)) {
        errors.push(`beds[${index}].widthM must be a positive number`);
      }
    });
  }

  if (garden.plants == null || typeof garden.plants !== "object" || Array.isArray(garden.plants)) {
    errors.push("plants must be an object keyed by plant id");
  } else {
    for (const [id, plant] of Object.entries(garden.plants)) {
      if (!PLANTING_ID.test(id)) {
        errors.push(`plant id ${id} must contain only letters, numbers, hyphens, and underscores`);
      }
      if (plant == null || typeof plant !== "object") {
        errors.push(`plants.${id} must be an object`);
        continue;
      }
      if (typeof plant.name !== "string" || plant.name.trim() === "") {
        errors.push(`plants.${id}.name must be a non-empty string`);
      }
      if (!isPositive(plant.spreadM)) {
        errors.push(`plants.${id}.spreadM must be a positive number`);
      }
      if (plant.notes != null && typeof plant.notes !== "string") {
        errors.push(`plants.${id}.notes must be a string`);
      }
      const appearance = plant.appearance;
      if (appearance == null || typeof appearance !== "object") {
        errors.push(`plants.${id}.appearance must be an object`);
      } else {
        for (const key of ["foliage", "outline"]) {
          if (typeof appearance[key] !== "string" || !HEX_COLOR.test(appearance[key])) {
            errors.push(`plants.${id}.appearance.${key} must be a #rrggbb colour`);
          }
        }
        if (appearance.fruit != null && (typeof appearance.fruit !== "string" || !HEX_COLOR.test(appearance.fruit))) {
          errors.push(`plants.${id}.appearance.fruit must be a #rrggbb colour`);
        }
      }
    }
  }

  if (!Array.isArray(garden.plantings)) {
    errors.push("plantings must be an array");
    return errors;
  }

  const seenIds = new Set();
  const bedCount = Array.isArray(garden.beds) ? garden.beds.length : 0;
  garden.plantings.forEach((planting, index) => {
    const label = planting?.id ?? `plantings[${index}]`;
    if (planting == null || typeof planting !== "object") {
      errors.push(`${label} must be an object`);
      return;
    }
    if (typeof planting.id !== "string" || !PLANTING_ID.test(planting.id)) {
      errors.push(`${label} needs an id made of letters, numbers, hyphens, and underscores`);
    } else if (seenIds.has(planting.id)) {
      errors.push(`${planting.id} is used by more than one planting`);
    } else {
      seenIds.add(planting.id);
    }
    if (garden.plants == null || typeof planting.plant !== "string" || garden.plants[planting.plant] == null) {
      errors.push(`${label} refers to unknown plant ${planting.plant}`);
    }
    if (!Number.isInteger(planting.bedIndex) || planting.bedIndex < 1 || planting.bedIndex > bedCount) {
      errors.push(`${label} bedIndex must be an integer from 1 to ${bedCount}`);
    } else if (isPositive(garden.lengthM)) {
      const bed = garden.beds[planting.bedIndex - 1];
      if (bed != null && isPositive(bed.widthM)) {
        if (typeof planting.xM !== "number" || planting.xM < 0 || planting.xM > bed.widthM) {
          errors.push(`${label} xM must sit inside bed ${planting.bedIndex} (0 to ${bed.widthM})`);
        }
        if (typeof planting.yM !== "number" || planting.yM < 0 || planting.yM > garden.lengthM) {
          errors.push(`${label} yM must sit inside the bed length (0 to ${garden.lengthM})`);
        }
      }
    }
    if (!isIsoDate(planting.planted)) {
      errors.push(`${label} planted must be a YYYY-MM-DD date`);
    }
    if (planting.removed != null && !isIsoDate(planting.removed)) {
      errors.push(`${label} removed must be a YYYY-MM-DD date or null`);
    } else if (isIsoDate(planting.planted) && isIsoDate(planting.removed) && planting.removed < planting.planted) {
      errors.push(`${label} removed must be on or after planted`);
    }
    if (planting.notes != null && typeof planting.notes !== "string") {
      errors.push(`${label} notes must be a string`);
    }
  });

  return errors;
}

export function assertGarden(garden) {
  const errors = validateGarden(garden);
  if (errors.length > 0) {
    throw new Error(`Invalid garden config:\n- ${errors.join("\n- ")}`);
  }
}
