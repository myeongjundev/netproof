import type { Hop, Trace, Verdict } from "./types";

export type Direction = "forward" | "return";
export const STEP_TEXT: Record<Hop["step"], string> = {
  send: "보냄", acl_in: "ACL 들어옴", firewall_in: "방화벽 들어옴", state: "복귀 상태",
  route: "경로", acl_out: "ACL 나감", deliver: "도착",
};
export function stepText(step: string) { return Object.hasOwn(STEP_TEXT, step) ? STEP_TEXT[step as Hop["step"]] : `알 수 없는 단계: ${step}`; }
export function decisivePosition(verdict: Verdict): { direction: Direction; index: number } | null {
  if (!verdict.decisive || verdict.decisive.result !== "drop") return null;
  const decisive = verdict.decisive;
  const matches: { direction: Direction; index: number }[] = [];
  for (const direction of ["forward", "return"] as const) verdict[direction]?.hops.forEach((hop, index) => {
    const keys = new Set([...Object.keys(hop), ...Object.keys(decisive)]) as Set<keyof Hop>;
    if (hop.result === "drop" && [...keys].every(key => hop[key] === decisive[key])) matches.push({ direction, index });
  });
  return matches.length === 1 ? matches[0] : null;
}

export interface PlaybackState { direction: Direction; index: number; playing: boolean; selectedDevice: string | null; reduced: boolean; blocked: boolean }
/** A cursor over engine output. The controller never mutates or recalculates the verdict. */
export class TracePlayback {
  private state: PlaybackState;
  private timer: ReturnType<typeof setInterval> | null = null;
  private resume = false;
  private listeners = new Set<() => void>();
  private busy = false;
  private hidden = false;
  constructor(private verdict: Verdict) {
    const index = Math.max(0, (verdict.forward?.hops.length ?? 0) - 1);
    this.state = { direction: "forward", index, playing: false, selectedDevice: verdict.forward?.hops[index]?.device ?? null, reduced: false, blocked: false };
  }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  trace(): Trace | null { return this.verdict[this.state.direction]; }
  private update(patch: Partial<PlaybackState>) { this.state = { ...this.state, ...patch }; this.listeners.forEach(listener => listener()); }
  private clearTimer() { if (this.timer !== null) clearInterval(this.timer); this.timer = null; }
  pause() { this.clearTimer(); this.resume = true; this.update({ playing: false }); }
  setBusy(busy: boolean) { this.busy = busy; this.setBlocked(); }
  setHidden(hidden: boolean) { this.hidden = hidden; this.setBlocked(); }
  private setBlocked() {
    const blocked = this.busy || this.hidden;
    if (blocked) this.pause();
    this.update({ blocked });
  }
  setReduced(reduced: boolean) { if (reduced) this.pause(); this.update({ reduced }); }
  select(index: number) {
    if (this.state.blocked) return;
    this.pause(); const hops = this.trace()?.hops ?? [];
    index = Math.max(0, Math.min(index, Math.max(0, hops.length - 1)));
    this.update({ index, selectedDevice: hops[index]?.device ?? null });
  }
  selectDevice(selectedDevice: string) { this.pause(); this.update({ selectedDevice }); }
  direction(direction: Direction) {
    if (this.state.blocked || !this.verdict[direction]?.hops.length) return;
    this.clearTimer(); this.resume = false;
    const index = this.verdict[direction]!.hops.length - 1;
    this.update({ direction, index, playing: false, selectedDevice: this.verdict[direction]!.hops[index].device });
  }
  play() {
    if (this.state.blocked || this.state.reduced || !this.trace()?.hops.length) return;
    if (this.state.playing) { this.pause(); return; }
    const hops = this.trace()!.hops;
    const index = !this.resume || this.state.index === hops.length - 1 ? 0 : this.state.index;
    this.update({ index, selectedDevice: hops[index].device, playing: hops.length > 1 });
    this.resume = false;
    if (hops.length <= 1) return;
    this.timer = setInterval(() => {
      const index = this.state.index + 1;
      const finished = index >= hops.length - 1;
      if (finished) this.clearTimer();
      this.update({ index, selectedDevice: hops[index].device, playing: !finished });
    }, 1000);
  }
  dispose() { this.clearTimer(); }
}

export function observePlayback(player: TracePlayback, page: Document, motion: MediaQueryList) {
  const visibility = () => player.setHidden(page.hidden);
  const reduce = () => player.setReduced(motion.matches);
  visibility(); reduce();
  page.addEventListener("visibilitychange", visibility);
  motion.addEventListener("change", reduce);
  return () => { page.removeEventListener("visibilitychange", visibility); motion.removeEventListener("change", reduce); player.dispose(); };
}
