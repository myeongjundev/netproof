# Batfish 교차 검증 도구

NetProof JSON을 Cisco IOS 설정으로 변환하고 엔진 `verify`와 독립 계산기 Batfish의 패킷 추적을 비교한다. 사람이 직접 실행하는 로컬 검증 도구이며 CI·기본 pytest·제품 API·배포에 연결하지 않는다. **Batfish는 교차 검증 기준이지 정답이 아니다. 실제 장비 대조를 대신하지 않는다.** 불일치는 설정과 두 계산 결과를 보존해 별도 과제로 분석한다. 이 도구가 엔진 판정이나 사례의 `expect`를 바꾸지는 않는다.

## 준비와 실행

Docker에 메모리 약 4GB 이상을 마련한다. 검증한 이미지와 클라이언트를 고정했다.

- 이미지: `batfish/allinone@sha256:54cb0ed94fd9a3c1ca0985f73e5be479e955cee9b9f6a6799b66be3364fd8e5c`
- 클라이언트: `scripts/requirements-batfish.txt`의 `pybatfish==2026.09.17.3748`
- 포트: **127.0.0.1:9996·9997에만** 바인딩한다. `-p 9996:9996`처럼 외부에 여는 명령은 쓰지 않는다.

저장소 루트의 PowerShell에서 별도 가상환경을 만들고 실행한다. 기존 `.venv`나 운영 `requirements.txt`에 pybatfish를 설치하지 않는다. 아래 임시 폴더에는 가상환경만 두고, 불일치 자료는 도구가 별도 임시 폴더에 보존한다. 실행 후 가상환경 정리는 가능하지만 보고된 불일치 폴더는 리뷰까지 보존한다.

```powershell
$batfishTaskDir = Join-Path $env:TEMP ('netproof-batfish-' + [guid]::NewGuid())
.venv/Scripts/python -m venv (Join-Path $batfishTaskDir 'venv')
$batfishTaskPython = Join-Path $batfishTaskDir 'venv/Scripts/python.exe'
& $batfishTaskPython -m pip install -r scripts/requirements-batfish.txt
docker run -d --name netproof-batfish -p 127.0.0.1:9996:9996 -p 127.0.0.1:9997:9997 batfish/allinone@sha256:54cb0ed94fd9a3c1ca0985f73e5be479e955cee9b9f6a6799b66be3364fd8e5c
try {
    & $batfishTaskPython scripts/batfish_diff.py
    $batfishExit = $LASTEXITCODE
    Write-Output "batfish_exit=$batfishExit"
} finally {
    docker stop netproof-batfish
}
```

컨테이너 서비스가 준비된 뒤 실행한다. 연결 실패는 종료 코드 2이며 준비 명령을 출력한다. 이미 같은 이름의 컨테이너가 있으면 다른 이름으로 만들고 `finally`의 정지 이름도 맞춘다. 도구는 자신이 만든 UUID 네트워크를 Batfish에서 삭제한다. Docker의 시작·정지는 실행자가 맡고, 끝나거나 실패해도 반드시 정지한다.

```text
python scripts/batfish_diff.py [--host localhost] [--seed 20261010] [--count 40] [--keep DIR]
```

| 옵션 | 의미 |
| --- | --- |
| `--host` | Batfish 서비스 주소, 기본 `localhost` |
| `--seed` | 무작위 구성 시드, 기본 `20261010` |
| `--count` | 모양마다 생성하는 구성 수, 기본 `40`, 0이면 기존 사례만 |
| `--keep` | 불일치 자료 보존 폴더. 생략하면 새 OS 임시 폴더 |

종료 코드 0은 비교한 결과와 차단 단계가 모두 같음, 1은 결과 또는 차단 단계 불일치, 2는 의존성·연결·스냅샷·추적 등 실행 실패다. 비교에서 제외된 통신은 일치로 세지 않는다. 잘못된 옵션도 argparse 종료 코드 2다.

## 변환과 대상

`cases/*.json` 전체의 network를 읽되 파일과 `expect`는 변경하지 않는다. 모양 A는 사례 01의 라우터 1대, B는 사례 02의 라우터 2대를 복제한다. 각 모양에 고정 시드 ACL을 생성한다. A의 g0/0·g0/1, B의 두 라우터 인터페이스마다 in/out ACL을 붙인다. permit/deny, ip/tcp/udp/icmp, any/host/연속 와일드카드, 출발·목적 포트 eq/neq/lt/gt/range, established, echo/echo-reply, 마지막 permit 유무를 섞는다. B는 양방향 정적 경로의 정상·누락·잘못된 다음 홉·넓거나 좁은 prefix도 섞는다. 검사는 호스트 인터페이스 주소의 순서쌍 × SSH·HTTP·HTTPS·DNS·Ping × session·one-way다.

장비별 hostname, 인터페이스 ip address·no shutdown·ip access-group, 정적 ip route, 붙은 ACL 원문을 출력한다. 호스트도 Cisco 장비로 흉내 내며 gateway는 기본 경로가 된다. 인터페이스 접두사 g/s/eth/e/f를 각각 GigabitEthernet/Serial/Ethernet/Ethernet/FastEthernet으로 바꾸고 뒤 숫자·슬래시 번호를 유지한다. 모르는 이름, 이름 변환 충돌·대소문자 충돌 hostname은 구성을 건너뛰고 사유를 출력한다. 상태 추적이나 구조화 방화벽 필드(`stateful`·`rules_in`·`default_in`)가 있으면 범위 밖으로 건너뛴다. 필드가 비어 있거나 false여도 다른 의미로 추정하지 않는다.

엔진 `UNSUPPORTED`·`INVALID`는 통신별로 제외한다. 엔진이 비교 가능한 통신 중 변환 불가·범위 밖 구성에 속한 통신도 별도 제외한다. 제외 건수 단위는 모두 **통신**이며 범주는 중복 집계하지 않는다. 구성 제외 JSON은 구성 이름·사유·제외할 비교 가능 통신 수를 담는다.

## 비교 규칙

정방향 출발 포트는 50000, ICMP는 type 8·code 0이다. TCP는 SYN만 켠다. one-way는 정방향 `traceroute`만 요청한다. session은 정방향의 모든 trace가 ACCEPTED일 때 목적지 호스트에서 **직접 만든 복귀 패킷**으로 `traceroute`를 요청한다. 주소와 TCP/UDP 포트를 교환하고 TCP는 ACK만 켜며 ICMP는 type 0·code 0으로 바꾼다. 어느 방향에서든 모든 trace가 ACCEPTED인 경우만 Batfish 측 PASS로 비교한다. 동일 구성·패킷의 정방향 결과는 session/one-way 사이에서 재사용한다. 빈 trace는 PASS로 처리하지 않고 실행 실패로 보고한다.

두 결과가 모두 DENY일 때 차단 단계도 비교한다. Batfish 마지막 hop 노드를 엔진 decisive.device와 대소문자 무시로 비교하고, 정방향/복귀 방향도 비교한다. 단계는 DENIED_IN→acl_in, DENIED_OUT→acl_out, NEIGHBOR_UNREACHABLE→send, NO_ROUTE/NULL_ROUTED/INSUFFICIENT_INFO/LOOP→route다. 단, 마지막 hop이 입력 network의 host 장비이면 route 범주도 send로 대응한다(장비 이름 대소문자 무시). 나머지는 other로 기록하고 단계 불일치로 센다. 여러 차단 trace가 있으면 모두 장비·단계가 같아야 한다.

표준 출력은 구성 제외 JSON, 불일치 JSON 한 줄씩, 마지막 요약 한 줄이다. Windows에서 리다이렉션해도 원문이 깨지지 않도록 비ASCII 문자는 JSON escape로 출력한다. 진행 중 구성 수는 stderr에 출력한다. 요약에는 비교 수·결과 같음/다름·단계 비교/다름·제외 네 범주·시드·모양별 생성 수·초 단위 실행 시간이 있다. 불일치 JSON에는 구성 이름, 통신, 엔진 결과/reason/decisive/방향, Batfish 결과/방향/처리 목록, 비교 사실, 보존 경로가 있다. 보존 경로의 `configs/*.cfg`는 업로드한 설정이며 `network.json`은 재현용 입력이다. 결과·단계 불일치 모두 종료 코드 1로 끝나지만 나머지 구성도 끝까지 검사한다.

## 알려진 의미 차이와 범위

Claude의 스파이크에서 Batfish 왕복 추적이 ICMP 복귀도 echo(type 8)로 만들어 두 건이 달랐다. 이 도구는 `bidirectionalTraceroute`를 쓰지 않고 echo-reply(type 0)를 직접 만든다. Batfish가 hostname을 소문자로 정규화하므로 차단 장비 이름만 대소문자 무시로 비교한다. 호스트를 Cisco 장비로 흉내 내는 점은 실제 호스트 네트워크 스택과의 차이다.

pfSense 상태 추적, UNSUPPORTED/INVALID 통신, 비연속 와일드카드, 실제 장비 관측은 검증 범위 밖이다. 무작위 테스트는 모든 구성·경로를 증명하지 않는다. 다른 계산기와의 일치는 실제 장비 대조를 대신하지 않는다.

클라이언트 API의 근거: [Batfish 패킷 모델 문서](https://batfish.readthedocs.io/en/latest/datamodel.html), [세션·스냅샷 문서](https://batfish.readthedocs.io/en/stable/notebooks/interacting.html). 실제 실행은 위 고정 버전의 설치된 API와 함께 검사했다.

## 마지막 실행

2026-10-11 Codex, PR #58 R1·N1 수정 후 엔진 0.2.0으로 기본값을 다시 실행했다. 시드20261010·각 모양40개, cases3 + A40 + B40 = 83구성/1660통신이다. 결과1660건 일치·결과 불일치0, DENY 단계1511건 비교·단계 불일치0, 제외 네 범주 모두0, **204.70초·종료 코드0**이다.

최초 44건은 NEIGHBOR_UNREACHABLE을 route로 묶은 **도구의 대응표 오류였고 send로 수정했다**. 마지막 hop이 host 장비인 route 범주도 send로 대응하도록 N1과 게이트웨이 없는 호스트 테스트1개를 반영했다. 엔진 계산·버전·expect는 바꾸지 않았다. other 처리의 실제 차이는 계속 JSON/설정 보존·종료1로 검사한다.

최신 요약 원문·명령·진행 출력·회귀 출력은 [HANDOFF 최신 테스트 결과](../HANDOFF.md)에 있다. 새 불일치 JSON은 없으며 최초 JSON44줄과 설정5경로는 HANDOFF의 수정 전 기록으로 남겼다. 고정 digest·127.0.0.1 바인딩 컨테이너는 실행 후 running=false/status=exited를 확인했다. 교차 검증은 실제 장비 대조를 대신하지 않는다.

Codex (GPT-6)
