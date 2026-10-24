"use client";
// Demo role switcher context. In a real deployment the role comes from the
// authenticated Supabase profile; this lets judges flip between the 4 RBAC
// views instantly during the walkthrough without re-authenticating.
import { createContext, useContext, useEffect, useState } from "react";

export type Role = "admin" | "warden" | "technician" | "student";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Sustainability Director",
  warden: "Hostel / Mess Warden",
  technician: "Facility / Lab Engineer",
  student: "Campus Occupant",
};

export const ROLE_ACCESS: Record<Role, string[]> = {
  admin: ["All buildings B01-B08", "Model triggers", "System config", "All pages"],
  warden: ["Write manual_logs for B05, B06, B07", "View alerts & forecasts"],
  technician: ["Write manual_logs (any)", "Gateway sync recovery", "Sensor calibration"],
  student: ["Green leaderboard", "Building scores", "Smart-bin simulator"],
};

interface Ctx {
  role: Role;
  setRole: (r: Role) => void;
}
const RoleCtx = createContext<Ctx>({ role: "admin", setRole: () => {} });

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>("admin");
  useEffect(() => {
    const saved = localStorage.getItem("demo_role") as Role | null;
    if (saved) setRole(saved);
  }, []);
  const update = (r: Role) => {
    setRole(r);
    localStorage.setItem("demo_role", r);
  };
  return <RoleCtx.Provider value={{ role, setRole: update }}>{children}</RoleCtx.Provider>;
}

export const useRole = () => useContext(RoleCtx);

/** Pages each role is allowed to open. */
export const PAGE_ROLES: Record<string, Role[]> = {
  "/": ["admin", "warden", "technician", "student"],
  "/telemetry-fusion": ["admin", "technician"],
  "/edge-classifier": ["admin", "technician", "student"],
  "/forecasting": ["admin", "warden", "technician"],
  "/root-cause": ["admin", "warden", "technician"],
  "/circular-incentives": ["admin", "warden", "student"],
  "/architecture-scale": ["admin", "technician"],
  "/data-validation": ["admin", "technician"],
};
