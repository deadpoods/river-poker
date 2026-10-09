"use client";
import { Moon, Sun } from "lucide-react";
import { createContext, useContext } from "react";
export type Appearance = "light" | "dark";
export const AppearanceContext = createContext({ mode: "light" as Appearance, toggle: () => {}, available: true });
export function AppearanceControl() {
  const { mode, toggle, available } = useContext(AppearanceContext);
  if (!available) return null;
  return <button className="appearance-control icon-button" onClick={toggle} aria-label={mode === "light" ? "Switch to dark mode" : "Switch to light mode"} title={mode === "light" ? "Dark mode" : "Light mode"}>{mode === "light" ? <Moon size={17} /> : <Sun size={17} />}<span>{mode === "light" ? "Night" : "Day"}</span></button>;
}
