import { useEffect, useState } from "react";
import { api } from "./api";
import { blankDraft } from "./draft";
import { AppHeader } from "./components/AppHeader";
import { HomePage } from "./pages/HomePage";
import { LearningPage } from "./pages/LearningPage";
import { CaseDetailPage } from "./pages/CaseDetailPage";
import { CasesPage } from "./pages/CasesPage";
import { DashboardPage } from "./pages/DashboardPage";
import { JudgePage } from "./pages/JudgePage";
import { PolicyMatrixPage } from "./pages/PolicyMatrixPage";
import { LoginPage } from "./pages/LoginPage";
import { SettingsPage } from "./pages/SettingsPage";
import { go, useRoute } from "./router";
import type { Draft, User } from "./types";

export function App() {
  const route = useRoute();
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);
  // 판정기 입력은 화면을 옮겨 다녀도 남긴다(로그인하러 갔다 와도 그대로).
  const [draft, setDraft] = useState<Draft>(blankDraft);
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
  if (route.page === "home") page = <HomePage draft={draft} user={user} checked={checked} />;
  else if (route.page === "learn") page = <LearningPage lessonId={route.lessonId} />;
  else if (route.page === "judge") page = <JudgePage user={user} draft={draft} setDraft={setDraft} share={route.share} practiceId={route.practiceId} titleHint={titleHint} />;
  else if (route.page === "matrix") page = <PolicyMatrixPage draft={draft} />;
  else if (route.page === "missing") page = <p className="hint">없는 화면입니다. <a href="#/home">홈으로</a></p>;
  else if (!checked) page = <p className="hint">확인 중…</p>;
  else if (route.page === "login")
    page = user ? (
      <section className="panel narrow">
        <h2>{user.nickname}으로 로그인돼 있습니다</h2>
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

      <main className="main">{page}</main>

      <footer className="foot">
        NetProof는 계산만 합니다. 실제 네트워크에 패킷을 보내지 않습니다. 지원 범위: IPv4, 직접 연결·정적 경로, Cisco 확장 ACL 일부. 범위
        밖은 “판정 불가”로 알려 줍니다.
      </footer>
    </>
  );
}
