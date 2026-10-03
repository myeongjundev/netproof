import { blankDraft } from "./draft";
import type { Draft } from "./types";

const initialInput = JSON.stringify(blankDraft());

/** 표시 비교만 한다. 유효성·판정·저장 여부를 뜻하지 않는다. */
export function hasCurrentInput(draft: Draft): boolean {
  return JSON.stringify(draft) !== initialInput;
}
