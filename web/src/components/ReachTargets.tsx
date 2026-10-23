import type { ReactNode } from "react";
import { deviceStatus, serviceName, type Reach } from "../breach";
import type { MatrixCell, MatrixService } from "../types";

export const STATUS_TEXT = { reach: "닿음", safe: "안 닿음", unknown: "판정 불가" } as const;
export const REACH_MEANING = "닿음은 방화벽과 경로가 막지 않아 연결을 시작할 수 있다는 뜻입니다. 서비스가 실제로 열려 있는지, 취약한지는 계산하지 않습니다.";

/**
 * 피해 범위의 장비별 목록. 침해 가정 실습과 정책 검증이 함께 쓴다.
 * 훅이 없는 함수라 페이지 안에서 바로 호출한다(시험 드라이버가 펼쳐 볼 수 있게).
 */
export function reachTargets(result: Reach, services: MatrixService[], service: (cell: MatrixCell, name: string, device: string) => ReactNode, roles?: Record<string, string>) {
  return <>
    <ul className="breach-targets">{result.others.map((device) => {
      const status = deviceStatus(result, device), cells = result.targets.find((target) => target.device === device)?.cells ?? [];
      return <li key={device} className={`breach-target ${status}`}>
        <p><strong>{device}</strong>{roles ? ` · ${roles[device] ?? "새로 더한 장비"}` : ""} · {STATUS_TEXT[status]}</p>
        {cells.length > 0 && <div className="breach-services">{cells.map((cell) =>
          <span key={`${cell.dst}/${cell.service}`}>{service(cell, serviceName(services, cell.service), device)}</span>)}</div>}
      </li>;
    })}</ul>
    {result.undecided.length > 0 && <p className="hint">판정 불가 {result.undecided.length}건 — 안전하다는 뜻이 아닙니다. 근거에서 이유를 확인하세요.</p>}
  </>;
}
