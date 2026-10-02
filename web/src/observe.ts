import type { CaseDetail, Observation } from "./types";

export function applyObservation(actual: CaseDetail["actual"], candidate: Observation): CaseDetail["actual"] {
  if (candidate.status !== "OK") return actual;
  const note = candidate.note ? (actual.note ? `${actual.note}\n${candidate.note}` : candidate.note) : actual.note;
  return {
    result: candidate.result ?? actual.result,
    source: candidate.source ?? actual.source,
    note: Array.from(note).slice(0, 1000).join(""),
  };
}
