import { useState } from "react";
import { api, message } from "../api";
import type { User } from "../types";

interface Props {
  onLoggedIn: (user: User) => void;
}

export function LoginPage({ onLoggedIn }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!nickname.trim() || !password) {
      setError("닉네임과 비밀번호를 입력하세요");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const session = mode === "login" ? await api.login(nickname.trim(), password) : await api.register(nickname.trim(), password);
      if (session.user) onLoggedIn(session.user);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel narrow" aria-labelledby="login-title">
      <h2 id="login-title">{mode === "login" ? "로그인" : "가입"}</h2>
      <p className="hint">사례 게시판은 로그인한 동기끼리 봅니다. 실명 대신 닉네임을 쓰세요. 이메일은 받지 않습니다.</p>
      <form onSubmit={submit} className="stack" noValidate>
        <label>
          <span>닉네임</span>
          <input value={nickname} autoComplete="username" maxLength={20} onChange={(e) => (setNickname(e.target.value), setError(null))} />
        </label>
        <label>
          <span>비밀번호{mode === "register" ? " (8자 이상)" : ""}</span>
          <input
            type="password"
            value={password}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            onChange={(e) => (setPassword(e.target.value), setError(null))}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="primary" disabled={busy}>
          {mode === "login" ? "로그인" : "가입하고 로그인"}
        </button>
      </form>
      <p className="hint switch">
        {mode === "login" ? "처음이면 " : "이미 가입했으면 "}
        <button type="button" className="link" onClick={() => (setMode(mode === "login" ? "register" : "login"), setError(null))}>
          {mode === "login" ? "가입" : "로그인"}
        </button>
      </p>
    </section>
  );
}
