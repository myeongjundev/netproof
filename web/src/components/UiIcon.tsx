import type { ReactNode } from "react";

export type IconName = "network" | "book" | "matrix" | "tools" | "arrow" | "menu";

/** Visible labels carry the meaning; these SVGs are decorative only. */
export function UiIcon({ name, className = "" }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    network: <><rect x="8" y="3" width="8" height="6" rx="1.5" /><rect x="2" y="15" width="7" height="6" rx="1.5" /><rect x="15" y="15" width="7" height="6" rx="1.5" /><path d="M12 9v3M5.5 15v-3h13v3" /></>,
    book: <><path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1v15" /><path d="M6 8h3M15 8h3" /></>,
    matrix: <><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M3 9h18M9 3v18M9 15h12M15 9v12" /></>,
    tools: <><path d="m8 6-5 6 5 6M16 6l5 6-5 6M14 3l-4 18" /></>,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  };
  return <svg className={`ui-icon${className ? ` ${className}` : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[name]}</svg>;
}
