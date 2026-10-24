"""
Convert the 7 XLSX datasets to CSV (for Supabase seeding) and to compact JSON
(for the Next.js app to read directly, so it works with or without Supabase).

Also precomputes derived columns used across the app:
  - manual_logs: normalized_building_id, normalized_value (+ normalized_unit)
  - hourly_streams: ingestion_lag_minutes, is_buffered, is_duplicate
"""
import json, pathlib, re
import pandas as pd

ROOT = pathlib.Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
CSV_DIR = ROOT / "data" / "csv"
JSON_DIR = ROOT / "src" / "data" / "datasets"
CSV_DIR.mkdir(parents=True, exist_ok=True)
JSON_DIR.mkdir(parents=True, exist_ok=True)

# ---- Building alias normalization map (case-insensitive) ----
ALIAS_MAP = {
    "B01": ["B01", "Academic Block A", "Acad Block A", "block A"],
    "B02": ["B02", "Academic Block B", "Acad Block B", "Block B"],
    "B03": ["B03", "Central Library", "central lib", "Library"],
    "B04": ["B04", "Engineering Labs & Innovation Centre", "Eng Labs", "labs", "Innovation Centre"],
    "B05": ["B05", "Boys Hostel", "Boys Hostle", "BH"],
    "B06": ["B06", "Girls Hostel", "Girls hostle", "GH"],
    "B07": ["B07", "Food Court", "FC", "Canteen"],
    "B08": ["B08", "Admin Block", "Admin"],
}
LOOKUP = {}
for bid, aliases in ALIAS_MAP.items():
    for a in aliases:
        LOOKUP[a.strip().lower()] = bid


def normalize_building(raw):
    if pd.isna(raw):
        return None
    return LOOKUP.get(str(raw).strip().lower())


def normalize_value(stream, value, unit):
    """Standardize to kWh / L / kg."""
    if pd.isna(value):
        return None, None
    v = float(value)
    u = (str(unit).strip().lower() if not pd.isna(unit) else "")
    if u in ("units", "kwh"):
        return v, "kWh"
    if u == "kl":
        return v * 1000.0, "L"
    if u == "l":
        return v, "L"
    if u == "bags":
        return v * 8.0, "kg"
    if u == "kg":
        return v, "kg"
    return v, (unit if not pd.isna(unit) else None)


def dump(df, name):
    df.to_csv(CSV_DIR / f"{name}.csv", index=False)
    records = json.loads(df.to_json(orient="records"))
    (JSON_DIR / f"{name}.json").write_text(json.dumps(records, separators=(",", ":")))
    print(f"{name}: {len(df)} rows -> csv + json")


buildings = pd.read_excel(RAW / "buildings.xlsx")
dump(buildings, "buildings")

calendar = pd.read_excel(RAW / "calendar.xlsx")
dump(calendar, "calendar")

daily = pd.read_excel(RAW / "daily_summary.xlsx")
dump(daily, "daily_summary")

# hourly_streams: derive lag + buffer/dup flags
hs = pd.read_excel(RAW / "hourly_streams.xlsx")
ts = pd.to_datetime(hs["timestamp"])
rec = pd.to_datetime(hs["received_at"])
hs["ingestion_lag_minutes"] = ((rec - ts).dt.total_seconds() / 60.0).round(1)
# The normal baseline ingestion lag in this dataset is ~61-68 min. Genuine
# gateway-dropout buffer recovery shows up as lag well beyond that baseline.
# Flag > 120 min (roughly > p99 of the normal band) as a buffered burst packet.
BUFFER_THRESHOLD_MIN = 120
hs["is_buffered"] = (hs["ingestion_lag_minutes"] > BUFFER_THRESHOLD_MIN).astype(int)
# duplicate: repeated (building_id, timestamp) keeping first
dup_mask = hs.duplicated(subset=["building_id", "timestamp"], keep="first")
hs["is_duplicate"] = dup_mask.astype(int)
dump(hs, "hourly_streams")
print(f"   buffered rows: {int(hs['is_buffered'].sum())}, duplicate rows: {int(hs['is_duplicate'].sum())}")

# manual_logs: normalize building + value
ml = pd.read_excel(RAW / "manual_logs.xlsx")
ml["normalized_building_id"] = ml["building"].apply(normalize_building)
nv = ml.apply(lambda row: normalize_value(row["stream"], row["value"], row["unit"]), axis=1)
ml["normalized_value"] = [x[0] for x in nv]
ml["normalized_unit"] = [x[1] for x in nv]
unmapped = ml["normalized_building_id"].isna().sum()
print(f"   manual_logs unmapped buildings: {unmapped}")
dump(ml, "manual_logs")

wtr = pd.read_excel(RAW / "waste_events_train.xlsx")
dump(wtr, "waste_events_train")

wte = pd.read_excel(RAW / "waste_events_test.xlsx")
dump(wte, "waste_events_test")

print("Done.")
