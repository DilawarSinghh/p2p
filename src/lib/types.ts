export interface Building {
  building_id: string;
  building_name: string;
  building_type: string;
  floors: number;
  area_sqm: number;
  design_capacity: number;
  has_solar: number;
  solar_capacity_kw: number;
  year_built: number;
  has_composter: number;
}

export interface CalendarDay {
  date: string;
  day_of_week: string;
  day_type: string;
  event: string | null;
  avg_temp_c: number;
  rainfall_mm: number;
  humidity_pct: number;
}

export interface DailySummary {
  date: string;
  building_id: string;
  occupancy_avg: number;
  electricity_kwh: number;
  water_litres: number;
  solar_generation_kwh: number;
  wet_organic_kg: number;
  dry_recyclable_kg: number;
  ewaste_kg: number;
  hazardous_kg: number;
  composted_kg: number;
  recycled_kg: number;
  contamination_pct: number;
  landfill_kg: number;
}

export interface HourlyStream {
  timestamp: string;
  received_at: string;
  building_id: string;
  electricity_kwh: number;
  water_litres: number;
  solar_generation_kwh: number;
  footfall: number;
  ingestion_lag_minutes: number;
  is_buffered: number;
  is_duplicate: number;
}

export interface ManualLog {
  log_id: string;
  logged_at: string;
  logger_role: string;
  building: string;
  stream: string;
  value: number | null;
  unit: string | null;
  note: string | null;
  normalized_building_id: string | null;
  normalized_value: number | null;
  normalized_unit: string | null;
}

export interface WasteEvent {
  event_id: string;
  timestamp: string;
  building_id: string;
  bin_id: string;
  weight_g: number;
  moisture_pct: number;
  metal_signal: number;
  transparency: number;
  acoustic_hardness: number;
  category?: string;
}

export interface ModelMetrics {
  accuracy: number;
  gated_accuracy: number;
  confidence_gate: number;
  eval_method: string;
  n_samples: number;
  classes: string[];
  per_class: Record<
    string,
    { precision: number; recall: number; f1: number; support: number }
  >;
  confusion_matrix: number[][];
  coverage_table: {
    threshold: number;
    coverage: number;
    accuracy_on_covered: number;
  }[];
  sklearn_per_event_ms: number;
  model: Record<string, unknown>;
}
