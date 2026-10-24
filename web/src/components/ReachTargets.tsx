import type { ReactNode } from "react";
import { chainMarks, deviceStatus, freshCells, reach, serviceName, type Mark, type Reach } from "../breach";
import type { MatrixCell, MatrixService, PolicyMatrix } from "../types";

export const STATUS_TEXT = { reach: "닿음", safe: "안 닿음", unknown: "판정 불가" } as const;
export const REACH_MEANING = "닿음은 방화벽과 경로가 막지 않아 연결을 시작할 수 있다는 뜻입니다. 서비스가 실제로 열려 있는지, 취약한지는 계산하지 않습니다.";
export const CHAIN_MEANING = "닿은 장비 하나를 골라, 그 장비도 뚫렸다고 가정을 한 단계 더 해 봅니다. 닿는다고 실제로 뚫을 수 있다는 뜻은 아닙니다. 뚫은 장비를 발판 삼아 다른 장비로 옮겨 가는 것을 측면 이동(lateral movement)이라고 합니다.";
type ServiceButton = (cell: MatrixCell, name: string, device: string) => ReactNode;

/**
 * 피해 범위의 장비별 목록. 침해 가정 실습과 정책 검증이 함께 쓴다.
 * 훅이 없는 함수라 페이지 안에서 바로 호출한다(시험 드라이버가 펼쳐 볼 수 있게).
 */
export function reachTargets(result: Reach, services: MatrixService[], service: ServiceButton, roles?: Record<string, string>, fresh: MatrixCell[] = []) {
  return <>
    <ul className="breach-targets">{result.others.map((device) => {
      const status = deviceStatus(result, device), cells = result.targets.find((target) => target.device === device)?.cells ?? [];
      return <li key={device} className={`breach-target ${status}`}>
        <p><strong>{device}</strong>{roles ? ` · ${roles[device] ?? "새로 더한 장비"}` : ""} · {STATUS_TEXT[status]}</p>
        {cells.length > 0 && <div className="breach-services">{cells.map((cell) =>
          <span key={`${cell.dst}/${cell.service}`}>{fresh.includes(cell) && <em className="reach-fresh">새로</em>}{service(cell, serviceName(services, cell.service), device)}</span>)}</div>}
      </li>;
    })}</ul>
    {result.undecided.length > 0 && <details className="breach-undecided"><summary>판정 불가 {result.undecided.length}건 — 안전하다는 뜻이 아닙니다. 펼쳐서 이유를 확인하세요.</summary>
      <ul>{result.undecided.map((cell) => { const name = serviceName(services, cell.service);
        return <li key={`${cell.src}/${cell.dst}/${cell.service}`}>{cell.src} → {cell.dst} · {name} {service(cell, name, cell.dst)}</li>; })}</ul>
    </details>}
  </>;
}

/**
 * 한 단계 더 가정(2차 확산). 처음 뚫린 장비에서 닿은 장비만 고를 수 있고, 같은 응답에서 고르기만 한다.
 * 선택 상태와 구성도는 부르는 쪽이 갖는다. 3단계 이상이나 자동으로 끝까지 퍼뜨리기는 하지 않는다(설계 §4.1).
 */
export function chainTargets({ breached, first, matrix, next, onNext, services, service, roles, diagram }: {
  breached: string; first: Reach; matrix: PolicyMatrix; next: string; onNext: (device: string) => void;
  services: MatrixService[]; service: ServiceButton; roles?: Record<string, string>; diagram: (marks: Record<string, Mark>, device: string) => ReactNode;
}) {
  const candidates = first.targets.map((target) => target.device);
  const chosen = candidates.includes(next) ? next : "";
  const second = chosen ? reach(matrix, chosen, [breached]) : null;
  const fresh = second ? freshCells(first, second) : [];
  const intended = fresh.filter((cell) => cell.expect === "PASS").length;
  const label = `${breached} 다음으로 뚫렸다고 가정할 장비`;
  return <div className="breach-chain">
    <h3>한 단계 더 가정해 보기</h3>
    <p className="hint">{CHAIN_MEANING}</p>
    {candidates.length === 0 ? <p>{breached}에서 닿는 장비가 없어 더 가정할 장비가 없습니다.</p>
      : <label className="matrix-mode">{label}<select aria-label={label} value={chosen} onChange={(event) => onNext(event.target.value)}>
        <option value="">고르지 않음</option>{candidates.map((device) => <option key={device} value={device}>{device}</option>)}
      </select></label>}
    {second && <>
      <p className="breach-total" role="status">{chosen}에서 시작하는 연결이 닿는 곳: {second.targets.length}곳 · 서비스 {second.count}개 · {breached}에서는 닿지 않던 서비스 {fresh.length}개</p>
      {second.count === 0 ? <p>{chosen}에서 시작하는 연결은 닿는 곳이 없습니다.</p>
        : fresh.length === 0 && <p>{breached}에서 이미 닿는 서비스뿐입니다. 이 가정으로 닿는 범위가 넓어지지 않습니다.</p>}
      {intended > 0 && <p className="hint">새로 닿는 서비스 가운데 {intended}개는 통과로 정해 둔(지켜야 할) 통신입니다. 필요한 통신이라 방화벽으로 막을 수 없으니 계정 관리·패치 같은 방화벽 밖 대책이 필요합니다. NetProof는 그 대책을 계산하지 않습니다.</p>}
      {diagram(chainMarks(breached, chosen, second, fresh), chosen)}
      {reachTargets(second, services, service, roles, fresh)}
    </>}
  </div>;
}
