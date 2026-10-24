// ============================================================================
// Pure-TypeScript edge inference for the RandomForest exported from Python.
// Runs with no cloud GPU dependency; latency is sub-millisecond per event,
// well inside the <2s edge budget. This is the same model trained offline
// in scripts/train_classifier.py and exported to src/data/model/waste_model.json.
// ============================================================================
import "server-only";
import fs from "node:fs";
import path from "node:path";
import { ROUTING, type WasteClass } from "./constants";

interface Tree {
  f: number[]; // feature index per node, -2 = leaf
  t: number[]; // threshold per node
  l: number[]; // left child index
  r: number[]; // right child index
  v: number[][]; // per-class probabilities at each node (leaf meaningful)
}
interface Forest {
  features: string[];
  classes: string[];
  confidence_gate: number;
  trees: Tree[];
}

let FOREST: Forest | null = null;

function loadForest(): Forest {
  if (FOREST) return FOREST;
  const p = path.join(process.cwd(), "src", "data", "model", "waste_model.json");
  FOREST = JSON.parse(fs.readFileSync(p, "utf-8")) as Forest;
  return FOREST;
}

export interface SensorReading {
  weight_g: number;
  moisture_pct: number;
  metal_signal: number;
  transparency: number;
  acoustic_hardness: number;
}

export interface ClassificationResult {
  predicted_class: WasteClass;
  confidence: number;
  probabilities: Record<string, number>;
  routed_to: string;
  gated: boolean; // true if below the confidence gate -> review bin
  latency_ms: number;
}

function featureVector(f: Forest, r: SensorReading): number[] {
  const map: Record<string, number> = {
    weight_g: r.weight_g,
    moisture_pct: r.moisture_pct,
    metal_signal: r.metal_signal,
    transparency: r.transparency,
    acoustic_hardness: r.acoustic_hardness,
  };
  return f.features.map((name) => map[name] ?? 0);
}

function runTree(tree: Tree, x: number[]): number[] {
  let node = 0;
  // Traverse until a leaf (feature == -2).
  while (tree.f[node] !== -2) {
    const feat = tree.f[node];
    node = x[feat] <= tree.t[node] ? tree.l[node] : tree.r[node];
  }
  return tree.v[node];
}

/** Classify a single reading. Averages per-tree probabilities (soft vote). */
export function classify(reading: SensorReading): ClassificationResult {
  const f = loadForest();
  const start = performance.now();
  const x = featureVector(f, reading);
  const agg = new Array(f.classes.length).fill(0);
  for (const tree of f.trees) {
    const probs = runTree(tree, x);
    for (let i = 0; i < probs.length; i++) agg[i] += probs[i];
  }
  const n = f.trees.length;
  for (let i = 0; i < agg.length; i++) agg[i] /= n;

  let best = 0;
  for (let i = 1; i < agg.length; i++) if (agg[i] > agg[best]) best = i;
  const predicted = f.classes[best] as WasteClass;
  const confidence = agg[best];
  const latency = performance.now() - start;

  const probabilities: Record<string, number> = {};
  f.classes.forEach((c, i) => (probabilities[c] = Number(agg[i].toFixed(4))));

  const gated = confidence < f.confidence_gate;
  return {
    predicted_class: predicted,
    confidence: Number(confidence.toFixed(4)),
    probabilities,
    routed_to: gated ? "Review Bin (low confidence)" : ROUTING[predicted],
    gated,
    latency_ms: Number(latency.toFixed(3)),
  };
}

export function classifyBatch(readings: SensorReading[]): ClassificationResult[] {
  return readings.map(classify);
}

export function forestInfo() {
  const f = loadForest();
  return {
    n_trees: f.trees.length,
    classes: f.classes,
    features: f.features,
    confidence_gate: f.confidence_gate,
  };
}
