"use client";
import { CLASS_COLORS, type WasteClass } from "@/lib/constants";

export function Stat({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "default" | "good" | "warn" | "danger" | "accent";
}) {
  const toneColor = {
    default: "text-slate-100",
    good: "text-good",
    warn: "text-warn",
    danger: "text-danger",
    accent: "text-accent",
  }[tone];
  return (
    <div className="stat">
      <div className="label">{label}</div>
      <div className={`text-xl font-semibold mt-1 ${toneColor}`}>{value}</div>
      {sub && <div className="text-[11px] text-muted mt-0.5">{sub}</div>}
    </div>
  );
}

export function Card({
  title,
  children,
  right,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`card ${className}`}>
      {title && (
        <div className="card-h justify-between">
          <span>{title}</span>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

export function ClassBadge({ cls }: { cls: WasteClass }) {
  return (
    <span
      className="pill"
      style={{ background: `${CLASS_COLORS[cls]}22`, color: CLASS_COLORS[cls] }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: CLASS_COLORS[cls] }} />
      {cls.replace("_", " ")}
    </span>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-5">
      <h1 className="text-lg font-semibold text-slate-100">{title}</h1>
      <p className="text-sm text-muted mt-0.5">{subtitle}</p>
    </div>
  );
}

export function Bar({ pct, color = "#2dd4bf" }: { pct: number; color?: string }) {
  return (
    <div className="h-1.5 bg-panel2 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }}
      />
    </div>
  );
}
