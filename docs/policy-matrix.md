# 정책 검증·도달성 매트릭스

판정기의 구성을 그대로 사용한다. `#/matrix`에서 서비스와 왕복/한 방향 모드를 선택하고 계산한다.
각 셀을 눌러 사람이 `PASS`(열려야 함), `DENY`(막혀야 함), 의도 없음을 지정한 뒤 다시 계산한다.
입력만 `netproof.policy-matrix.v1` localStorage에 저장된다. 로그인 계정·서버 DB와 연결되지 않고,
사례와 공유 링크에도 포함되지 않는다. 저장이 막힌 브라우저에서는 메모리에만 유지한다.
구성/서비스를 변경해 더 이상 검사 대상이 아닌 의도는 삭제해야 한다. 자동 삭제하거나 다른 통신으로 옮기지 않는다.

## 계산 범위

- host 장비의 모든 인터페이스 IPv4 주소를 `(장비 이름, 인터페이스 이름)` 순으로 정렬한다.
- 라우터 주소, 같은 IP, 같은 장비 내부 주소 쌍은 제외한다. 같은 장비 내부 통신은 현재 trace 모델의 한계다.
- 교차 장비 **순서쌍**마다 서비스별 `verify`를 호출한다. 방향과 복귀 패킷의 의미는 기존 엔진과 같다.
- TCP/UDP 목적지 포트는 JSON 정수 1~65535이며 bool·문자열은 거절한다. 출발지 포트는 기존 50000이다.
- ICMP는 echo/echo-reply 또는 0~255 숫자/최대 3자리 ASCII 숫자 문자열이다. 8/008은 echo, 0은 echo-reply 키로 정규화한다.
- session에서 echo 외 ICMP는 기존 verify의 UNSUPPORTED 결과를 그대로 표시한다.
- 이는 라우팅·ACL의 모델 계산이다. 패킷 전송, 실제 서버 프로세스/열린 소켓 확인, 실제 장비 검증은 하지 않는다.

## API 계약

`POST /api/policy-matrix`는 로그인 없이 사용할 수 있다. 기존 X-NetProof 및 로그인 세션의 CSRF 검사는 그대로 적용한다.

```json
{
  "network": {"devices": [], "acls": {}},
  "spec": {
    "mode": "session",
    "services": [{"proto": "tcp", "dst_port": 443, "label": "HTTPS"}],
    "intents": [{"src": "10.10.10.10", "dst": "10.20.20.5", "service": "tcp/443", "expect": "DENY", "note": "사람이 정한 의도"}]
  }
}
```

서비스 1개 이상, mode 기본 session, intents 기본 빈 목록. 서비스 label 80자, 의도 note 200자 이하.
키는 `tcp/443`, `udp/53`, `icmp/echo` 등이다. 동일 서비스는 첫 항목을 유지한다.
의도는 (src, dst, service) 정확 일치다. 중복 기대값은 합치고 충돌은 전체 INVALID로 거절한다.
src·dst는 IPv4 주소 문자열만 받는다(정수 주소 변환 없음). 대상 밖 의도 오류에 해당 src → dst · service를 표시한다.
존재하지 않는 끝점·서비스, 제외된 내부 쌍, 와일드카드 의도는 거절한다.

응답은 `{status, problems, mode, engine_version, limit_exceeded, endpoints, services, cells, totals, exposures}`다.
status는 OK/INVALID로 **배치 입력 상태**이며 단일 통신 PASS/DENY와 구분한다.
셀은 `{src,dst,service,result,policy,expect,reason,decisive}`다. trace 전체는 담지 않는다.
셀 상세는 계산 당시 network·정규화된 service·mode로 기존 `/api/verify`를 다시 호출한다.
입력이 바뀌면 이전 결과임을 표시하고 셀 상세 열기를 막는다. 늦은 성공/오류 응답도 무시한다.

`totals.checks`는 전체 셀 수다. 네 result 합과 다섯 policy 합은 각각 checks와 같다.
`exposures`는 이름과 달리 EXPOSED/BLOCKED/UNDECIDED의 우선 확인 목록이다.
EXPOSED → BLOCKED → UNDECIDED 순으로 정렬하며 동률은 src/dst/service 순이다. **노출 건수는 totals.EXPOSED만** 사용한다.
의도 없음은 안전 판정이 아니며 노출 0건도 전체 네트워크의 안전을 보장하지 않는다.

끝점 24개, 서비스 원본 목록 8개, 의도 원본 목록 500개, 정규화 후 검사 2,000건까지다.
중복을 포함한 원본 서비스·의도 목록 길이도 제한한다. 초과는 부분 결과 없이
`status=INVALID, limit_exceeded=true, problems=[초과 수치]`로 반환한다.
서버는 이 플래그만 보고 422를 반환하며 판정·비교·검사 수 계산을 복제하지 않는다.
기존 network 크기 제한(장비 40개/인터페이스 16개/경로 100개/ACL 500줄)과 64KB 요청 제한도 유지한다.
나머지 INVALID는 엔진 응답을 HTTP 200으로 전달한다. INVALID 응답의 cells/totals는 비어 있거나 0이다.
새 엔진 API 경계에서는 기존 load/verify의 형식 예외를 INVALID로 처리하지만 기존 함수는 수정하지 않는다.

## 측정과 한계

Windows 로컬에서 호스트 16개, 라우터 1개(서브넷 2개), 양쪽 in ACL permit,
TCP 서비스 8개로 검사 1,920건을 한 번 실행한 결과 **0.8265초**였다.
이는 합성 구성의 perf_counter 측정이며 모든 구성의 시간 상한을 보장하지 않는다.
verify가 매번 network를 다시 파싱하므로 더 긴 ACL·많은 라우터는 더 느릴 수 있다.
캐싱이나 단일 흐름 판정 의미 변경은 이번 범위에 포함하지 않는다.

Codex (GPT-6)
