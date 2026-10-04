import type { Flow, Network, Verdict } from "./types";

export interface Judgment { network: Network; flow: Flow; verdict: Verdict }
export interface ChangeHistory { last: Judgment | null; before: Judgment | null }

/** Compare input only. Verdict classification belongs exclusively to the engine. null clears on load. */
export function advanceChange(history: ChangeHistory, next: Judgment | null): ChangeHistory {
  if (!next) return { last: null, before: null };
  const previous = history.last;
  const sameFlow = previous && (["src", "dst", "proto", "dst_port", "icmp", "mode"] as const).every(field =>
    (field === "mode" ? previous.flow[field] ?? "session" : previous.flow[field]) ===
    (field === "mode" ? next.flow[field] ?? "session" : next.flow[field]));
  return { last: next, before: !sameFlow ? null : JSON.stringify(previous.network) === JSON.stringify(next.network) ? history.before : previous };
}
