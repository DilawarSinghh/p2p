"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TestTube } from "lucide-react";
import { useRole, ROLE_LABELS, PAGE_ROLES, type Role } from "@/lib/role-context";

type NavItem = { href: string; label: string; icon: string | React.ReactNode };

const NAV: NavItem[] = [
  { href: "/project-guide", label: "Project Guide", icon: "◎" },
  { href: "/", label: "Command Center", icon: "◆" },
  { href: "/telemetry-fusion", label: "Sensor Fusion", icon: "⇄" },
  { href: "/edge-classifier", label: "Edge Classifier", icon: "♲" },
  { href: "/forecasting", label: "Forecasting", icon: "⤴" },
  { href: "/root-cause", label: "Root Cause", icon: "⚑" },
  { href: "/circular-incentives", label: "Circular + Credits", icon: "♻" },
  { href: "/architecture-scale", label: "Scale + Resilience", icon: "⚙" },
  { href: "/data-validation", label: "Data Testing Sandbox", icon: <TestTube size={15} /> },
];

const ROLES: Role[] = ["admin", "warden", "technician", "student"];

export default function Nav() {
  const pathname = usePathname();
  const { role, setRole } = useRole();

  return (
    <aside className="w-60 shrink-0 border-r border-border bg-panel min-h-screen flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="text-accent font-bold text-sm leading-tight">
          Predictive Circular
          <br />
          Resource Grid
        </div>
        <div className="text-[10px] text-muted mt-1">P2P 2026 · 8-building campus</div>
      </div>

      <nav className="flex-1 p-2 space-y-0.5">
        {NAV.map((item) => {
          const allowed = PAGE_ROLES[item.href]?.includes(role) ?? true;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-accent/15 text-accent"
                  : allowed
                    ? "text-slate-300 hover:bg-panel2"
                    : "text-muted/40 hover:bg-panel2/50"
              }`}
              title={allowed ? "" : `Restricted for ${ROLE_LABELS[role]}`}
            >
              <span className="w-4 text-center">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {!allowed && <span className="text-[10px]">🔒</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border">
        <div className="label mb-1.5">Demo Role Switcher</div>
        <div className="grid grid-cols-2 gap-1">
          {ROLES.map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`px-2 py-1.5 rounded-md text-[11px] font-medium capitalize transition-colors ${
                role === r
                  ? "bg-accent/20 text-accent border border-accent/40"
                  : "bg-panel2 border border-border text-slate-400 hover:text-slate-200"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="text-[10px] text-muted mt-2 leading-snug">
          Viewing as <span className="text-slate-300">{ROLE_LABELS[role]}</span>
        </div>
      </div>
    </aside>
  );
}
