# NetProof 보안 로그 연결

## 1. 무엇을 남기나

기본은 꺼짐입니다. 비밀번호·없는 닉네임 문자열은 남기지 않습니다. src_ip는 request.remote_addr이며 UTC time은 사건 시각입니다. 가입·로그아웃·비밀번호 변경·계정 삭제 기록은 이번 범위가 아닙니다.

| event | 언제 | 수준 | 필드 |
| --- | --- | --- | --- |
| `login_success` | 로그인 성공 | INFO | `nickname`, `user_id`, `src_ip` |
| `login_failure` | 로그인 실패 | WARNING | `reason`(`unknown_user`·`bad_password`·`locked`), `src_ip`. 계정이 있으면 `nickname`·`user_id`. `bad_password`면 `failed_count`(올린 뒤 값), `locked`면 `locked_until` |
| `account_locked` | 실패가 5번이 되어 잠금이 시작될 때 | WARNING | `via`(`login`·`settings`), `nickname`, `user_id`, `src_ip`, `failed_count`(5), `locked_until` |
| `password_check_failure` | 설정 화면의 지금 비밀번호 확인 실패 | WARNING | `reason`(`bad_password`·`locked`), `nickname`, `user_id`, `src_ip`. `bad_password`면 `failed_count`, `locked`면 `locked_until` |

다섯 번째 실패는 login_failure(또는 password_check_failure) 다음에 account_locked를 남깁니다. unknown_user에는 시도한 닉네임을 넣지 않습니다. None 필드는 생략합니다.

합성 로그 예(실제 계정 정보 아님):

```json
{"app":"netproof","event":"login_failure","reason":"bad_password","nickname":"qa_author","user_id":2,"src_ip":"127.0.0.1","failed_count":3,"time":"2026-10-05T03:10:00Z"}
```

## 2. 켜는 법

로컬 시연에서만 켭니다. 저장소 루트에서 빌드 후 QA 도구를 실행합니다. 비밀번호는 도구 콘솔에서만 확인하고 파일·캡처·문서에 기록하지 마세요. 강제 종료 대신 Ctrl+C로 정상 종료합니다. 아래 주소는 수업 환경 주소로 바꾸세요. syslog 대상은 하나입니다(보통 파일 → Wazuh 에이전트, syslog → Graylog). 두 환경 변수를 모두 빼면 파일·표준 오류 어디에도 보안 로그를 쓰지 않습니다.

PowerShell:

```powershell
npm --prefix web run build
$env:NETPROOF_SECURITY_LOG = 'logs/security.jsonl'
$env:NETPROOF_SYSLOG = '192.168.0.10:1514'
.venv/Scripts/python scripts/qa_local.py
# 종료 후 비활성화
Remove-Item Env:NETPROOF_SECURITY_LOG -ErrorAction SilentlyContinue
Remove-Item Env:NETPROOF_SYSLOG -ErrorAction SilentlyContinue
```

bash:

```bash
npm --prefix web run build
NETPROOF_SECURITY_LOG=logs/security.jsonl NETPROOF_SYSLOG=192.168.0.10:1514 .venv/bin/python scripts/qa_local.py
```

각 변수는 독립적으로 켤 수 있습니다. 합성 계정으로 비밀번호를 다섯 번 틀린 뒤 JSONL과 수신 기록을 봅니다. 호스트:포트가 잘못됐으면 앱 시작에서 오류가 납니다. 파일 상위 폴더는 자동으로 만듭니다. logs/는 Git에서 제외됩니다. 닉네임·주소도 운영 기록이므로 공유 전에 합성 자료인지 확인하세요.

## 3. Graylog (7.1 기준)

1. Syslog UDP 입력을 만든다. 포트는 예를 들어 1514다(1024보다 작은 포트는 관리자 권한이 필요할 수 있다).
2. 파이프라인 규칙을 만들어 NetProof 메시지가 들어오는 스트림(예: Default Stream)에 연결한다. syslog 머리말이 붙어도 JSON 부분만 꺼내도록 `regex`에 그룹 이름을 준다.

   ```text
   rule "netproof security json"
   when
     contains(to_string($message.message), "\"app\":\"netproof\"")
   then
     let found = regex("(\\{.*\\})", to_string($message.message), ["json"]);
     set_fields(fields: to_map(parse_json(to_string(found["json"]))), prefix: "netproof_");
   end
   ```
3. 검색: `netproof_event:login_failure`, `netproof_event:account_locked`.
4. 알림 예: 이벤트 정의에서 검색 `netproof_event:login_failure`를 2분 동안 `netproof_src_ip`로 묶어 개수 5 이상이면 이벤트를 만든다(화면 위치는 버전마다 달라 공식 문서 링크로 안내한다).

## 4. Wazuh (4.14 기준)

- 가(기본) 에이전트가 파일을 읽는다. NetProof를 실행하는 PC의 에이전트 `ossec.conf`:

  ```xml
  <localfile>
    <location>NetProof 로그 파일의 전체 경로</location>
    <log_format>json</log_format>
  </localfile>
  ```
- 나(선택) 서버가 syslog를 직접 받는다. 서버 `ossec.conf`(syslog는 `allowed-ips`가 꼭 있어야 한다):

  ```xml
  <remote>
    <connection>syslog</connection>
    <port>514</port>
    <protocol>udp</protocol>
    <allowed-ips>NetProof를 실행한 PC 주소</allowed-ips>
  </remote>
  ```
- 서버 `/var/ossec/etc/rules/local_rules.xml`:

  ```xml
  <group name="netproof,authentication,">
    <rule id="100200" level="5">
      <decoded_as>json</decoded_as>
      <field name="app">^netproof$</field>
      <field name="event">^login_failure$</field>
      <description>NetProof: 로그인 실패</description>
      <group>authentication_failed,</group>
    </rule>
    <rule id="100201" level="10">
      <decoded_as>json</decoded_as>
      <field name="app">^netproof$</field>
      <field name="event">^account_locked$</field>
      <description>NetProof: 실패가 반복돼 계정이 잠김</description>
      <mitre><id>T1110</id></mitre>
    </rule>
    <rule id="100202" level="10" frequency="5" timeframe="120">
      <if_matched_sid>100200</if_matched_sid>
      <same_field>src_ip</same_field>
      <description>NetProof: 같은 주소에서 로그인 실패가 반복됨</description>
      <mitre><id>T1110</id></mitre>
    </rule>
    <rule id="100203" level="5">
      <decoded_as>json</decoded_as>
      <field name="app">^netproof$</field>
      <field name="event">^password_check_failure$</field>
      <description>NetProof: 설정에서 비밀번호 확인 실패</description>
    </rule>
  </group>
  ```
- 확인: 서버에서 `/var/ossec/bin/wazuh-logtest`에 1절의 로그 한 줄을 붙여, JSON 디코더와 규칙 100200이 맞는지 먼저 본다. syslog(나)로 받을 때도 같은 방법으로 디코딩을 확인한다.

## 5. 한계

- 로컬 시연용이다. 배포 환경은 켜지 않는다(기본 꺼짐).
- UDP syslog는 암호화되지 않고 잃어버릴 수 있다.
- 프록시 뒤에서는 `remote_addr`가 프록시 주소가 된다(ProxyFix는 범위 밖).
- Graylog·Wazuh 실제 수집은 AI가 확인하지 못했다. 사람이 수업 환경에서 확인한다(수동 QA D).

## 공식 문서 · 확인 기준

문서 기준: Graylog 7.1·Wazuh 4.14, 승인 원고 확인일 2026-10-05. 실제 Graylog·Wazuh 설치/수집/경보는 사람이 수업 환경에서 [수동 QA D](qa-manual.md#d-보안-로그--수업-환경-수동-확인)로 확인합니다.

- [What is Graylog](https://go2docs.graylog.org/current/what_is_graylog/what_is_graylog.htm)
- [Syslog Inputs](https://go2docs.graylog.org/current/getting_in_log_data/syslog_inputs.html)
- [Streams](https://go2docs.graylog.org/current/making_sense_of_your_log_data/streams.html)
- [Functions Reference](https://go2docs.graylog.org/current/making_sense_of_your_log_data/functions_index.html)
- [Components](https://documentation.wazuh.com/current/getting-started/components/index.html)
- [localfile](https://documentation.wazuh.com/current/user-manual/reference/ossec-conf/localfile.html)
- [Rules syntax](https://documentation.wazuh.com/current/user-manual/ruleset/ruleset-xml-syntax/rules.html)
- [Testing decoders and rules](https://documentation.wazuh.com/current/user-manual/ruleset/testing.html)
- [remote](https://documentation.wazuh.com/current/user-manual/reference/ossec-conf/remote.html)

Codex (GPT-5)
