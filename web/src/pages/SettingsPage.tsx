import { useEffect, useState, type FormEvent } from "react";
import { api, message } from "../api";
import { applyTheme, savedTheme, type Theme } from "../theme";
import type { User } from "../types";

const THEMES: [Theme, string][] = [
  ["light", "라이트 (기본)"],
  ["dark", "다크"],
  ["system", "기기 설정 따르기"],
];

/** 폼 하나의 진행·성공·오류 상태. 성공하면 보여 줄 문장을 돌려받는다. */
function useAction() {
  const [state, setState] = useState<{ busy?: boolean; ok?: string; error?: string }>({});
  const run = async (action: () => Promise<string>) => {
    setState({ busy: true });
    try {
      setState({ ok: await action() });
    } catch (e) {
      setState({ error: message(e) });
    }
  };
  return [state, run] as const;
}

function Status({ state }: { state: { ok?: string; error?: string } }) {
  if (state.error) return <p className="error">{state.error}</p>;
  if (state.ok) return <p className="ok">{state.ok}</p>;
  return null;
}

interface Props {
  user: User | null;
  onUser: (user: User) => void;
  onSignedOut: () => void;
}

export function SettingsPage({ user, onUser, onSignedOut }: Props) {
  const [theme, setTheme] = useState<Theme>(savedTheme);

  return (
    <div className="settings">
      <div className="page-head"><div><p className="home-eyebrow">내 환경</p><h1>설정</h1><p>화면과 계정 정보를 관리합니다.</p></div></div>
      <section className="panel" aria-labelledby="screen-title">
        <h2 id="screen-title">화면</h2>
        <p className="hint">이 브라우저에만 저장됩니다.</p>
        <div className="choice" role="radiogroup" aria-labelledby="screen-title">
          {THEMES.map(([value, label]) => (
            <label key={value} className={theme === value ? "chip on" : "chip"}>
              <input type="radio" name="theme" checked={theme === value} onChange={() => (setTheme(value), applyTheme(value))} />
              {label}
            </label>
          ))}
        </div>
      </section>

      {user ? (
        <Account user={user} onUser={onUser} onSignedOut={onSignedOut} />
      ) : (
        <section className="panel" aria-labelledby="account-title">
          <h2 id="account-title">계정</h2>
          <p className="hint">
            로그인하면 닉네임과 비밀번호를 바꾸거나 계정을 지울 수 있습니다. <a href="#/login">로그인</a>
          </p>
        </section>
      )}
    </div>
  );
}

function Account({ user, onUser, onSignedOut }: { user: User; onUser: (user: User) => void; onSignedOut: () => void }) {
  const [nickname, setNickname] = useState(user.nickname);
  const [nicknameState, runNickname] = useAction();
  const [passwords, setPasswords] = useState({ current: "", next: "", again: "" });
  const [passwordState, runPassword] = useAction();
  const [logoutState, runLogout] = useAction();
  const [deletePassword, setDeletePassword] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [deleteState, runDelete] = useAction();
  const [caseCount, setCaseCount] = useState<number | null>(null);

  useEffect(() => {
    api.cases(true).then((items) => setCaseCount(items.length), () => setCaseCount(null));
  }, []);

  const saveNickname = (e: FormEvent) => {
    e.preventDefault();
    runNickname(async () => {
      const { user: next } = await api.changeNickname(nickname.trim());
      onUser(next);
      return "닉네임을 바꿨습니다. 게시판의 작성자 이름도 바뀝니다.";
    });
  };

  const savePassword = (e: FormEvent) => {
    e.preventDefault();
    runPassword(async () => {
      if (passwords.next !== passwords.again) throw new Error("새 비밀번호 두 칸이 같지 않습니다");
      await api.changePassword(passwords.current, passwords.next);
      setPasswords({ current: "", next: "", again: "" });
      return "비밀번호를 바꿨습니다. 다른 기기의 로그인은 끊었습니다.";
    });
  };

  const logoutAll = () =>
    runLogout(async () => {
      await api.logoutAll();
      onSignedOut();
      return "";
    });

  const deleteAccount = (e: FormEvent) => {
    e.preventDefault();
    runDelete(async () => {
      await api.deleteAccount(deletePassword);
      onSignedOut();
      return "";
    });
  };

  return (
    <>
      <section className="panel" aria-labelledby="account-title">
        <h2 id="account-title">계정</h2>
        <dl className="facts">
          <dt>닉네임</dt>
          <dd>{user.nickname}</dd>
          <dt>등급</dt>
          <dd>{user.role_name}</dd>
        </dl>

        <h3>닉네임 바꾸기</h3>
        <form onSubmit={saveNickname}>
          <label>
            <span>새 닉네임 (2~20자, 실명 말고)</span>
            <input value={nickname} maxLength={20} autoComplete="username" onChange={(e) => setNickname(e.target.value)} />
          </label>
          <button type="submit" className="ghost" disabled={nicknameState.busy || !nickname.trim() || nickname.trim() === user.nickname}>
            닉네임 저장
          </button>
          <Status state={nicknameState} />
        </form>

        <h3>비밀번호 바꾸기</h3>
        <form onSubmit={savePassword}>
          <label>
            <span>지금 비밀번호</span>
            <input
              type="password"
              autoComplete="current-password"
              value={passwords.current}
              onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
            />
          </label>
          <label>
            <span>새 비밀번호 (8자 이상)</span>
            <input
              type="password"
              autoComplete="new-password"
              value={passwords.next}
              onChange={(e) => setPasswords({ ...passwords, next: e.target.value })}
            />
          </label>
          <label>
            <span>새 비밀번호 한 번 더</span>
            <input
              type="password"
              autoComplete="new-password"
              value={passwords.again}
              onChange={(e) => setPasswords({ ...passwords, again: e.target.value })}
            />
          </label>
          <button type="submit" className="ghost" disabled={passwordState.busy || !passwords.current || !passwords.next}>
            비밀번호 바꾸기
          </button>
          <Status state={passwordState} />
        </form>
      </section>

      <section className="panel" aria-labelledby="devices-title">
        <h2 id="devices-title">로그인한 기기</h2>
        <p className="hint">학원 공용 PC처럼 다른 곳에 로그인을 남겨 두었다면 모두 끊습니다. 이 기기도 로그아웃됩니다.</p>
        <button type="button" className="ghost" onClick={logoutAll} disabled={logoutState.busy}>
          모든 기기에서 로그아웃
        </button>
        <Status state={logoutState} />
      </section>

      <section className="panel danger-zone" aria-labelledby="delete-title">
        <h2 id="delete-title">계정 삭제</h2>
        <p className="hint">
          계정과 내가 저장한 사례{caseCount === null ? "가" : ` ${caseCount}건이`} 함께 지워지고 되돌릴 수 없습니다.
          {user.role === "reviewer" && " 내가 검토자로 확인한 다른 사람의 사례는 확인 표시가 남습니다."}
        </p>
        <form onSubmit={deleteAccount}>
          <label>
            <span>지금 비밀번호</span>
            <input type="password" autoComplete="current-password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} />
          </label>
          <label className="check-row">
            <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} />
            되돌릴 수 없다는 것을 알고 지웁니다
          </label>
          <button type="submit" className="danger-button" disabled={deleteState.busy || !deletePassword || !understood}>
            계정 삭제
          </button>
          <Status state={deleteState} />
        </form>
      </section>
    </>
  );
}
