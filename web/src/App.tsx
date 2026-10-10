import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import { blankDraft } from "./draft";
import { AppHeader } from "./components/AppHeader";
import { HomePage } from "./pages/HomePage";
import { LearningPage } from "./pages/LearningPage";
import { CaseDetailPage } from "./pages/CaseDetailPage";
import { CasesPage } from "./pages/CasesPage";
import { DashboardPage } from "./pages/DashboardPage";
import { JudgePage } from "./pages/JudgePage";
import { PracticePage } from "./pages/PracticePage";
import { FixExercisePage } from "./pages/FixExercisePage";
import { fixImport, initializeFixDrafts } from "./exercises";
import { PolicyMatrixPage } from "./pages/PolicyMatrixPage";
import { LoginPage } from "./pages/LoginPage";
import { SettingsPage } from "./pages/SettingsPage";
import { go, useRoute } from "./router";
import type { CaseItem, Draft, User } from "./types";
import { lessonByCaseId, practiceDraft, type PracticeGuess } from "./learning";

/** 판정기 입력과 별개인 실습별 메모리 입력. 기존 편집 내용은 그대로 이어간다. */
export function initializePracticeDrafts(current: Record<string, Draft>, caseId: string, example: CaseItem, guess?: PracticeGuess): Record<string, Draft> {
  const existing = current[caseId];
  if (existing && !guess) return current;
  const next = existing ?? practiceDraft(example);
  return { ...current, [caseId]: guess ? { ...next, claim: { expected: guess, kind: "self", source: "", text: "" } } : next };
}

export function practiceImport(caseId: string, draft: Draft) {
  return { draft: structuredClone(draft), label: `${lessonByCaseId(caseId)!.title} 실습 구성을 판정기로 가져왔습니다` };
}

export function App() {
  const route = useRoute();
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);
  // 판정기 입력은 화면을 옮겨 다녀도 남긴다(로그인하러 갔다 와도 그대로).
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [guess, setGuess] = useState<{ caseId: string; expected: PracticeGuess } | null>(null);
  const [practiceCaseId, setPracticeCaseId] = useState<string | null>(null);
  const [practiceDrafts, setPracticeDrafts] = useState<Record<string, Draft>>({});
  const [fixDrafts, setFixDrafts] = useState<Record<string, Draft>>({});
  const [pendingImport, setPendingImport] = useState<ReturnType<typeof practiceImport> | null>(null);
  const caseId = route.page === "practice" ? route.caseId : undefined;
  const lessonId = route.page === "learn" ? route.lessonId : undefined;
  const exerciseId = route.page === "fix" ? route.id : undefined;
  const main = useRef<HTMLElement>(null);
  const previousScreen = useRef({ page: route.page, lessonId, caseId, exerciseId });
  useEffect(() => {
    setGuess(current => current?.caseId === caseId ? current : null);
    if (caseId) setPracticeCaseId(caseId);
  }, [caseId]);
  const preparePractice = useCallback((example: CaseItem) => {
    if (!caseId) return;
    setPracticeDrafts(current => initializePracticeDrafts(current, caseId, example, guess?.caseId === caseId ? guess.expected : undefined));
    setGuess(current => current?.caseId === caseId ? null : current);
  }, [caseId, guess]);
  const prepareFix = useCallback((example: CaseItem) => {
    if (exerciseId) setFixDrafts(current => initializeFixDrafts(current, exerciseId, example));
  }, [exerciseId]);
  const consumeImport = useCallback(() => setPendingImport(null), []);
  useEffect(() => {
    const previous = previousScreen.current;
    previousScreen.current = { page: route.page, lessonId, caseId, exerciseId };
    if (previous.page === route.page && previous.lessonId === lessonId && previous.caseId === caseId && previous.exerciseId === exerciseId) return;
    const heading = main.current?.querySelector("h1");
    if (heading) { heading.tabIndex = -1; heading.focus(); }
  }, [route.page, lessonId, caseId, exerciseId]);
  const [titleHint, setTitleHint] = useState("");
  // 로그인 화면으로 오기 직전에 보던 화면. 로그인한 뒤 그리로 돌려보낸다.
  const [back, setBack] = useState("/home");

  useEffect(() => {
    if (route.page !== "login") setBack(window.location.hash.replace(/^#/, "") || "/home");
    if (route.page !== "judge") setTitleHint("");
  }, [route]);

  useEffect(() => {
    api.me().then(
      (session) => setUser(session.user),
      () => setUser(null),
    ).finally(() => setChecked(true));
  }, []);

  const signedOut = () => {
    setUser(null);
    go("/home");
  };

  const logout = async () => {
    await api.logout().catch(() => undefined);
    signedOut();
  };

  const needLogin = (
    <section className="panel narrow">
      <h2>로그인이 필요합니다</h2>
      <p className="hint">
        {route.page === "dashboard" ? "대시보드는 검토자만 봅니다." : "사례 게시판은 로그인한 동기끼리 봅니다."} <a href="#/login">로그인</a>
      </p>
      <p className="hint">
        판정기는 로그인 없이 쓸 수 있습니다. <a href="#/">판정기로</a>
      </p>
    </section>
  );

  let page;
  const onGuess = (caseId: string, expected: PracticeGuess) => { setGuess({ caseId, expected }); go(`/practice/${caseId}`); };
  if (route.page === "home") page = <HomePage draft={draft} user={user} checked={checked} onGuess={onGuess} practiceCaseId={practiceCaseId} practiceDraft={practiceCaseId ? practiceDrafts[practiceCaseId] : undefined} />;
  else if (route.page === "learn") page = <LearningPage lessonId={route.lessonId} onGuess={onGuess} />;
  else if (route.page === "fix") page = <FixExercisePage key={route.id} id={route.id} draft={fixDrafts[route.id]} onReady={prepareFix}
    setDraft={update => setFixDrafts(current => current[route.id] ? { ...current, [route.id]: update(current[route.id]) } : current)}
    onImport={next => { setPendingImport(fixImport(route.id, next)); go("/"); }} />;
  else if (route.page === "practice") page = <PracticePage key={route.caseId} caseId={route.caseId} user={user} checked={checked} draft={practiceDrafts[route.caseId]} onReady={preparePractice}
    setDraft={update => setPracticeDrafts(current => current[route.caseId] ? { ...current, [route.caseId]: update(current[route.caseId]) } : current)}
    onImport={next => { setPendingImport(practiceImport(route.caseId, next)); go("/"); }} />;
  else if (route.page === "judge") page = <JudgePage user={user} draft={draft} setDraft={setDraft} share={route.share} titleHint={titleHint} pendingImport={pendingImport} onImportConsumed={consumeImport} />;
  else if (route.page === "matrix") page = <PolicyMatrixPage draft={draft} />;
  else if (route.page === "missing") page = <p className="hint">없는 화면입니다. <a href="#/home">홈으로</a></p>;
  else if (!checked) page = <p className="hint">확인 중…</p>;
  else if (route.page === "login")
    page = user ? (
      <section className="panel narrow">
        <h2>{user.nickname} 계정으로 로그인돼 있습니다</h2>
        <p className="hint">
          <a href="#/cases">사례 게시판</a>으로 가거나 <a href="#/">판정기</a>로 돌아가세요.
        </p>
      </section>
    ) : (
      <LoginPage onLoggedIn={(next) => (setUser(next), go(back))} />
    );
  else if (route.page === "settings") page = <SettingsPage user={user} onUser={setUser} onSignedOut={signedOut} />;
  else if (!user) page = needLogin;
  else if (route.page === "cases") page = <CasesPage />;
  else if (route.page === "case")
    page = <CaseDetailPage key={route.id} id={route.id} user={user} onOpenInJudge={(next, saveTitle) => (setDraft(() => next), setTitleHint(saveTitle ?? ""), go("/"))} />;
  else if (route.page === "dashboard")
    page =
      user.role === "reviewer" ? (
        <DashboardPage />
      ) : (
        <section className="panel narrow">
          <h2>검토자만 볼 수 있습니다</h2>
          <p className="hint">지금 등급은 {user.role_name}입니다.</p>
        </section>
      );
  else page = <p className="hint">없는 화면입니다. <a href="#/">판정기로</a></p>;

  return (
    <>
      <AppHeader route={route} user={user} checked={checked} onLogout={logout} />

      <main className="main" ref={main}>{page}</main>

      <footer className="foot">
        NetProof는 계산만 합니다. 실제 네트워크에 패킷을 보내지 않습니다. 지원 범위: IPv4, 직접 연결·정적 경로, Cisco 확장 ACL 일부. 범위
        밖은 “판정 불가”로 알려 줍니다.
      </footer>
    </>
  );
}
