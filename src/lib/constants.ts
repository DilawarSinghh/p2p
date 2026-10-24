// ============================================================================
// Mandatory campus engineering constants & normalization rules (P2P 2026)
// These are the single source of truth used across ETL and live calculators.
// ============================================================================

/** Grid carbon emission factor: kg CO2 per kWh. */
export const CARBON_FACTOR_KG_PER_KWH = 0.7;

/** Commercial utility electricity tariff: Rs. per kWh. */
export const ELECTRICITY_TARIFF_RS_PER_KWH = 8.0;

/** Water pumping & treatment energy intensity: kWh per 1,000 L. */
export const WATER_ENERGY_KWH_PER_1000L = 0.85;

/** Composting diversion: 4 kg wet organic -> 1 kg finished compost. */
export const COMPOST_CONVERSION_RATIO = 4;

/** Nominal market value of finished compost (Rs/kg) for ROI estimates. */
export const COMPOST_VALUE_RS_PER_KG = 12;

/** Green-credit program thresholds. */
export const CONTAMINATION_CREDIT_THRESHOLD_PCT = 8;

// ---- Derived helpers --------------------------------------------------------

export const co2FromKwh = (kwh: number) => kwh * CARBON_FACTOR_KG_PER_KWH;
export const rsFromKwh = (kwh: number) => kwh * ELECTRICITY_TARIFF_RS_PER_KWH;
export const kwhFromWater = (litres: number) =>
  (litres / 1000) * WATER_ENERGY_KWH_PER_1000L;
export const compostYield = (compostedKg: number) =>
  compostedKg / COMPOST_CONVERSION_RATIO;

// ---- Building alias normalization map (case-insensitive) --------------------

export const ALIAS_MAP: Record<string, string[]> = {
  B01: ["B01", "Academic Block A", "Acad Block A", "block A"],
  B02: ["B02", "Academic Block B", "Acad Block B", "Block B"],
  B03: ["B03", "Central Library", "central lib", "Library"],
  B04: ["B04", "Engineering Labs & Innovation Centre", "Eng Labs", "labs", "Innovation Centre"],
  B05: ["B05", "Boys Hostel", "Boys Hostle", "BH"],
  B06: ["B06", "Girls Hostel", "Girls hostle", "GH"],
  B07: ["B07", "Food Court", "FC", "Canteen"],
  B08: ["B08", "Admin Block", "Admin"],
};

const ALIAS_LOOKUP: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const [bid, aliases] of Object.entries(ALIAS_MAP)) {
    for (const a of aliases) m[a.trim().toLowerCase()] = bid;
  }
  return m;
})();

/** Map a dirty building string to a canonical building_id, or null. */
export function normalizeBuildingId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return ALIAS_LOOKUP[String(raw).trim().toLowerCase()] ?? null;
}

// ---- Unit standardization (manual_logs) -> kWh / L / kg ---------------------

export function normalizeValue(
  value: number | null | undefined,
  unit: string | null | undefined
): { value: number | null; unit: string | null } {
  if (value === null || value === undefined || Number.isNaN(value))
    return { value: null, unit: unit ?? null };
  const u = (unit ?? "").trim().toLowerCase();
  switch (u) {
    case "units":
    case "kwh":
      return { value, unit: "kWh" };
    case "kl":
      return { value: value * 1000, unit: "L" };
    case "l":
      return { value, unit: "L" };
    case "bags":
      return { value: value * 8, unit: "kg" };
    case "kg":
      return { value, unit: "kg" };
    default:
      return { value, unit: unit ?? null };
  }
}

// ---- Waste classes ----------------------------------------------------------

export const WASTE_CLASSES = [
  "food_organic",
  "paper_cardboard",
  "plastic",
  "glass",
  "metal",
  "ewaste",
] as const;
export type WasteClass = (typeof WASTE_CLASSES)[number];

/** Which physical bin each class is routed to on the edge device. */
export const ROUTING: Record<WasteClass, string> = {
  food_organic: "Composter",
  paper_cardboard: "Dry Recycler",
  plastic: "Dry Recycler",
  glass: "Glass Recycler",
  metal: "Metal Recycler",
  ewaste: "E-Waste Safe Bin",
};

export const CLASS_COLORS: Record<WasteClass, string> = {
  food_organic: "#4ade80",
  paper_cardboard: "#fbbf24",
  plastic: "#38bdf8",
  glass: "#a78bfa",
  metal: "#f472b6",
  ewaste: "#f87171",
};

export const BUILDING_IDS = ["B01", "B02", "B03", "B04", "B05", "B06", "B07", "B08"];

/** Ingestion-lag threshold (minutes) above which a packet is treated as a
 *  buffered burst (gateway dropout recovery). Normal baseline lag is ~60-68m. */
export const BUFFER_THRESHOLD_MIN = 120;
