import { useEffect, useMemo, useState } from "react";
import { api, message } from "../api";
import { FlowForm } from "../components/FlowForm";
import { NetworkEditor } from "../components/NetworkEditor";
import { ResultPanel } from "../components/ResultPanel";
import { blankDraft, caseJson, endpoints, fromCase, toNetwork } from "../draft";
import { go } from "../router";
import type { CaseItem, Draft, User, Verdict } from "../types";

interface Props {
  user: User | null;
  draft: Draft;
  setDraft: (update: (current: Draft) => Draft) => void;
}

export function JudgePage({ user, draft, setDraft }: Props) {
  const [examples, setExamples] = useState<CaseItem[]>([]);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [judged, setJudged] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pasted, setPasted] = useState("");
  const [title, setTitle] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    api.examples().then(setExamples, () => setExamples([]));
  }, []);

  const snapshot = useMemo(() => JSON.stringify(draft), [draft]);
  const update = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));
  const stale = judged !== null && judged !== snapshot;

  const load = (next: Draft) => {
    setDraft(() => next);
    setVerdict(null);
    setJudged(null);
    setError(null);
  };

  const judge = async () => {
    setLoading(true);
    setError(null);
    try {
      setVerdict(await api.verify(toNetwork(draft), draft.flow, draft.claim));
      setJudged(snapshot);
      // 한 줄 배치(휴대폰)에서는 결과가 폼 아래에 있어 눌러도 안 보인다. 결과로 옮겨 준다.
      if (window.matchMedia("(max-width: 900px)").matches) {
        requestAnimationFrame(() => document.getElementById("result-title")?.scrollIntoView({ behavior: "smooth", block: "start" }));
      }
    } catch (e) {
      setError(message(e));
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    setSaveError(null);
    try {
      const saved = await api.createCase(title.trim(), toNetwork(draft), draft.flow, draft.claim);
      setTitle("");
      go(`/cases/${saved.id}`);
    } catch (e) {
      setSaveError(message(e));
    }
  };

  const importPasted = () => {
    try {
      const item = JSON.parse(pasted) as CaseItem;
      if (!item.network || !item.flow) throw new Error();
      load(fromCase(item));
      setPasted("");
    } catch {
      setError("붙여 넣은 JSON에 network와 flow가 있어야 합니다");
    }
  };

  return (
    <>
      <div className="page-head">
        <p>AI나 내가 예상한 “이 통신은 된다/안 된다”를 라우팅·ACL 계산으로 확인하고, 막힌 규칙을 보여 줍니다. 판정은 로그인 없이 됩니다.</p>
        <div className="examples" aria-label="예시 불러오기">
          {examples.map((item) => (
            <button key={item.id} type="button" className="ghost small" onClick={() => load(fromCase(item))}>
              예시 {item.id.replace("synthetic-", "")}
              {item.title ? ` · ${item.title}` : ""}
            </button>
          ))}
          <button type="button" className="ghost small" onClick={() => load(blankDraft())}>
            처음 구성
          </button>
        </div>
      </div>

      <div className="layout">
        <div className="inputs">
          <NetworkEditor devices={draft.devices} acls={draft.acls} onDevices={(devices) => update({ devices })} onAcls={(acls) => update({ acls })} />
          <FlowForm
            flow={draft.flow}
            claim={draft.claim}
            endpoints={endpoints(draft)}
            onFlow={(flow) => update({ flow })}
            onClaim={(claim) => update({ claim })}
          />
          <div className="judge">
            <button type="button" className="primary" onClick={judge} disabled={loading}>
              {loading ? "계산 중…" : "판정하기"}
            </button>
          </div>
          <details className="panel json">
            <summary>사례 JSON 저장·불러오기</summary>
            <p className="hint">사례 원장에 옮길 때 씁니다.</p>
            <label className="block">
              <span>지금 입력</span>
              <textarea readOnly rows={8} value={caseJson(draft)} spellCheck={false} />
            </label>
            <label className="block">
              <span>JSON 붙여 넣기</span>
              <textarea rows={4} value={pasted} spellCheck={false} onChange={(e) => setPasted(e.target.value)} />
            </label>
            <button type="button" className="ghost small" onClick={importPasted} disabled={!pasted.trim()}>
              불러오기
            </button>
          </details>
        </div>
        <aside className="output">
          <ResultPanel verdict={verdict} claim={draft.claim} stale={stale} error={error} loading={loading} />
          {verdict && !stale && (
            <section className="panel save" aria-labelledby="save-title">
              <h2 id="save-title">사례로 저장</h2>
              {user ? (
                <>
                  <p className="hint">게시판에 올리면 실제 실습 결과를 적고 검토자의 확인을 받을 수 있습니다. 판정은 서버가 다시 계산해 저장합니다.</p>
                  <div className="save-row">
                    <label>
                      <span className="sr-only">사례 제목</span>
                      <input value={title} maxLength={80} placeholder="예: R2 복귀 경로 없음 · ping" onChange={(e) => setTitle(e.target.value)} />
                    </label>
                    <button type="button" className="ghost" onClick={save} disabled={!title.trim()}>
                      저장
                    </button>
                  </div>
                  {saveError && <p className="error">{saveError}</p>}
                </>
              ) : (
                <p className="hint">
                  로그인하면 이 판정을 사례 게시판에 올릴 수 있습니다. 지금 입력은 그대로 남습니다.{" "}
                  <a href="#/login">로그인</a>
                </p>
              )}
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
