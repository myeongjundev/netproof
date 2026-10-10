import type { Device, Flow, Network, Trace } from "./types";
import { cidrProblem } from "./validate";

export const DIAGRAM_DEVICES = 12;
export const DIAGRAM_SUBNETS = 24;
export interface TopologyNode { key: string; label: string; device?: Device }
export interface Membership { key: string; device: string; interface: string; subnet: string }
export interface TopologyView {
  mode: "full" | "path" | "list" | "invalid";
  nodes: TopologyNode[]; links: Membership[]; layers: string[][];
}

export function diagramShape(network: Network): boolean {
  return !!network && Array.isArray(network.devices) && network.devices.every(device =>
    !!device && typeof device.id === "string" && typeof device.kind === "string" && Array.isArray(device.interfaces) &&
    device.interfaces.every(iface => !!iface && typeof iface.name === "string" && typeof iface.ip === "string"));
}

/** Address grouping for display only; no next-hop or policy evaluation. */
export function subnetOf(value: string): string | null {
  if (typeof value !== "string" || value.length > 24 || !value.trim() || cidrProblem(value)) return null;
  const [ip, length] = value.trim().split("/");
  const prefix = Number(length);
  const address = ip.split(".").reduce((n, part) => (n * 256 + Number(part)) >>> 0, 0);
  const network = (address & (prefix === 0 ? 0 : 0xffffffff << (32 - prefix))) >>> 0;
  return `${[24, 16, 8, 0].map(shift => (network >>> shift) & 255).join(".")}/${prefix}`;
}

export function memberships(network: Network): Membership[] {
  if (!diagramShape(network)) return [];
  return network.devices.flatMap(device => device.interfaces.flatMap((iface, index) => {
    const subnet = subnetOf(iface.ip);
    return subnet ? [{ key: `${device.id}:${index}`, device: device.id, interface: iface.name, subnet }] : [];
  }));
}

export function topologyView(network: Network, flow: Flow, trace: Trace | null): TopologyView {
  const empty = { nodes: [], links: [], layers: [] };
  if (!diagramShape(network)) return { ...empty, mode: "invalid" };
  const ids = network.devices.map(device => device.id);
  if (ids.some(id => !id.trim()) || new Set(ids).size !== ids.length) return { ...empty, mode: "invalid" };
  let devices = network.devices;
  let links = memberships(network);
  let mode: TopologyView["mode"] = "full";
  const tooLarge = () => devices.length > DIAGRAM_DEVICES || new Set(links.map(link => link.subnet)).size > DIAGRAM_SUBNETS;
  if (tooLarge()) {
    if (!trace?.hops.length) return { ...empty, mode: "list" };
    const onPath = new Set(trace.hops.map(hop => hop.device));
    if (trace.target) onPath.add(trace.target.device);
    devices = devices.filter(device => onPath.has(device.id));
    links = links.filter(link => onPath.has(link.device));
    mode = "path";
    if (tooLarge()) return { ...empty, mode: "list" };
  }
  const subnets = [...new Set(links.map(link => link.subnet))];
  const nodes: TopologyNode[] = [
    ...devices.map(device => ({ key: `device:${device.id}`, label: device.id, device })),
    ...subnets.map(subnet => ({ key: `subnet:${subnet}`, label: subnet })),
  ];
  const adjacent = new Map(nodes.map(node => [node.key, [] as string[]]));
  for (const link of links) {
    adjacent.get(`device:${link.device}`)!.push(`subnet:${link.subnet}`);
    adjacent.get(`subnet:${link.subnet}`)!.push(`device:${link.device}`);
  }
  const owners = devices.filter(device => device.interfaces.some(iface =>
    subnetOf(iface.ip) !== null && iface.ip.trim().split("/")[0] === flow.src));
  const order = [...(owners.length === 1 ? [`device:${owners[0].id}`] : []), ...nodes.map(node => node.key)];
  const seen = new Set<string>();
  const layers: string[][] = [];
  for (const start of order) {
    if (seen.has(start)) continue;
    let level = [start]; seen.add(start);
    while (level.length) {
      layers.push(level);
      const next: string[] = [];
      // Input order is the tie breaker, including shared segments and disconnected components.
      const neighbours = new Set(level.flatMap(key => adjacent.get(key)!));
      for (const node of nodes) if (neighbours.has(node.key) && !seen.has(node.key)) { seen.add(node.key); next.push(node.key); }
      level = next;
    }
  }
  return { mode, nodes, links, layers };
}

/** Only recorded transitions with matching interface membership get coloured edges. */
export function traceMovements(network: Network, trace: Trace | null, through: number) {
  const links = memberships(network);
  return (trace?.hops ?? []).slice(1, through + 1).flatMap((hop, offset) => {
    const previous = trace!.hops[offset];
    if (previous.device === hop.device) return [];
    const out = links.filter(link => link.device === previous.device && link.interface === previous.out_if);
    const incoming = links.filter(link => link.device === hop.device && link.interface === hop.in_if);
    const known = out.length === 1 && incoming.length === 1 && out[0].subnet === incoming[0].subnet;
    return [{ index: offset + 1, from: previous.device, to: hop.device,
      memberships: known ? [out[0].key, incoming[0].key] : [] }];
  });
}
