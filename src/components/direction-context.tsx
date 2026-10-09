"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { DesignDirection } from "@/lib/design-directions";

const DirectionContext = createContext<DesignDirection>("original");
export function DirectionProvider({
  direction,
  children,
}: {
  direction: DesignDirection;
  children: ReactNode;
}) {
  return (
    <DirectionContext.Provider value={direction}>
      {children}
    </DirectionContext.Provider>
  );
}
export function useDesignDirection() {
  return useContext(DirectionContext);
}
