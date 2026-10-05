export const TOOL_NOTICE = "NetProof는 Graylog·Wazuh를 설치하거나 대신 실행하지 않습니다. 수업 환경에서 직접 확인하세요.";
export const SECURITY_DOC = "https://github.com/myeongjundev/netproof/blob/main/docs/security-logs.md";
export const SECURITY_EXAMPLE = '{"app":"netproof","event":"login_failure","reason":"bad_password","nickname":"qa_author","user_id":2,"src_ip":"127.0.0.1","failed_count":3,"time":"2026-10-05T03:10:00Z"}';
export const TOOL_TOPICS = [
  {
    "id": "graylog",
    "title": "Graylog — 로그를 모으고 찾기",
    "description": "여러 곳의 로그를 한곳에 모아 검색하고 알림을 만드는 도구",
    "focus": "NetProof 로그인 기록이 Graylog에 들어와 필드로 나뉘고, 검색과 알림으로 이어지는 과정",
    "version": "Graylog 7.1",
    "checked": "2026-10-05",
    "category": "보안 운영 도구",
    "concepts": [
      "입력(Input): 로그를 받는 창구입니다. Syslog(UDP·TCP), GELF, Beats처럼 받는 방식마다 입력을 하나씩 만듭니다.",
      "스트림(Stream): 조건에 맞는 메시지만 골라 모은 흐름입니다. 예를 들어 NetProof 메시지만 따로 볼 수 있습니다.",
      "파이프라인(Pipeline): 들어온 메시지를 규칙으로 고칩니다. NetProof처럼 JSON으로 온 로그는 규칙으로 풀어 필드로 나눕니다.",
      "검색(Search): 필드와 값으로 메시지를 찾습니다. 예: netproof_event:login_failure",
      "이벤트 정의(Event Definition)와 알림: 검색 결과가 정한 기준을 넘으면 이벤트를 만들고 알림을 보냅니다. 예: 2분 안에 같은 주소에서 로그인 실패 5번.",
      "대시보드(Dashboard): 자주 보는 검색 결과를 표와 그래프로 고정해 둡니다."
    ],
    "analogy": "여러 지점에서 온 택배를 한 창구에서 받아 목적지별 칸에 나누고, 송장을 보고 바로 찾아 주는 물류 센터와 같습니다.",
    "steps": [
      "Graylog에서 Syslog UDP 입력을 만듭니다. 포트는 예를 들어 1514를 씁니다(1024보다 작은 포트는 관리자 권한이 필요할 수 있습니다).",
      "NetProof를 NETPROOF_SYSLOG=<Graylog 주소>:1514로 켭니다. 로컬 QA 도구와 합성 계정을 씁니다.",
      "연결 설정 문서의 파이프라인 규칙을 만들고, NetProof 메시지가 들어오는 스트림에 연결합니다.",
      "합성 계정으로 비밀번호를 다섯 번 틀린 뒤 netproof_event:login_failure와 netproof_event:account_locked를 검색합니다."
    ],
    "checkpoints": [
      "다섯 번째 실패 뒤 account_locked 기록이 한 번 생기나요?",
      "화면의 오류 문장은 같아도 로그의 netproof_reason은 bad_password·unknown_user·locked로 다른가요?",
      "없는 닉네임으로 시도한 기록에는 닉네임이 남지 않나요?"
    ],
    "sources": [
      {
        "label": "What is Graylog",
        "href": "https://go2docs.graylog.org/current/what_is_graylog/what_is_graylog.htm"
      },
      {
        "label": "Syslog Inputs",
        "href": "https://go2docs.graylog.org/current/getting_in_log_data/syslog_inputs.html"
      },
      {
        "label": "Streams",
        "href": "https://go2docs.graylog.org/current/making_sense_of_your_log_data/streams.html"
      },
      {
        "label": "Functions Reference",
        "href": "https://go2docs.graylog.org/current/making_sense_of_your_log_data/functions_index.html"
      }
    ]
  },
  {
    "id": "wazuh",
    "title": "Wazuh — 규칙으로 공격 징후 찾기",
    "description": "에이전트가 보낸 로그를 디코더와 규칙으로 분석해 경보를 만드는 보안 플랫폼",
    "focus": "NetProof 로그인 실패가 Wazuh 규칙에 걸려 레벨이 붙은 경보가 되는 과정",
    "version": "Wazuh 4.14",
    "checked": "2026-10-05",
    "category": "보안 운영 도구",
    "concepts": [
      "에이전트(Agent): 서버나 PC에 설치해 로그 파일 등을 읽고 Wazuh 서버로 보냅니다.",
      "Wazuh 서버: 디코더와 규칙으로 로그를 분석해 경보를 만듭니다. 에이전트 없이 syslog를 직접 받을 수도 있습니다.",
      "인덱서와 대시보드: 인덱서는 경보를 저장해 검색할 수 있게 하고, 대시보드는 그것을 웹 화면으로 보여 줍니다.",
      "디코더(Decoder): 로그 한 줄에서 필드를 뽑습니다. 한 줄짜리 JSON 로그는 기본 JSON 디코더가 필드로 풀어 줍니다.",
      "규칙(Rule)과 레벨: 조건에 맞는 로그에 0~16 레벨을 붙여 경보로 만듭니다. 직접 만든 규칙은 서버의 local_rules.xml에 100000~120000번대 ID로 둡니다.",
      "빈도 규칙: frequency와 timeframe으로 \"짧은 시간에 여러 번\"을 잡습니다. 반복된 로그인 실패는 MITRE ATT&CK의 무차별 대입(T1110)에 해당합니다."
    ],
    "analogy": "건물 곳곳의 출입 기록을 관제실이 규칙표와 비교해, 짧은 시간에 같은 문을 여러 번 잘못 연 기록이 있으면 경보를 울리는 것과 같습니다.",
    "steps": [
      "NetProof를 NETPROOF_SECURITY_LOG=<로그 파일 경로>로 켭니다.",
      "같은 PC의 Wazuh 에이전트 설정(ossec.conf)에 그 파일을 log_format json으로 추가하고 에이전트를 다시 시작합니다.",
      "서버의 local_rules.xml에 연결 설정 문서의 NetProof 규칙을 넣고 서버를 다시 시작합니다.",
      "서버에서 wazuh-logtest에 로그 한 줄을 붙여 디코딩과 규칙 일치를 먼저 확인합니다.",
      "합성 계정으로 비밀번호를 다섯 번 틀린 뒤 대시보드에서 NetProof 경보를 찾습니다."
    ],
    "checkpoints": [
      "로그인 실패(규칙 100200, 레벨 5)와 계정 잠금(100201, 레벨 10)이 따로 보이나요?",
      "같은 주소에서 2분 안에 다섯 번 실패하면 빈도 규칙(100202)이 울리나요?",
      "경보의 필드에 비밀번호가 없나요?"
    ],
    "sources": [
      {
        "label": "Components",
        "href": "https://documentation.wazuh.com/current/getting-started/components/index.html"
      },
      {
        "label": "localfile",
        "href": "https://documentation.wazuh.com/current/user-manual/reference/ossec-conf/localfile.html"
      },
      {
        "label": "Rules syntax",
        "href": "https://documentation.wazuh.com/current/user-manual/ruleset/ruleset-xml-syntax/rules.html"
      },
      {
        "label": "Testing decoders and rules",
        "href": "https://documentation.wazuh.com/current/user-manual/ruleset/testing.html"
      },
      {
        "label": "remote",
        "href": "https://documentation.wazuh.com/current/user-manual/reference/ossec-conf/remote.html"
      }
    ]
  }
];
export function toolTopicById(id: string) { return TOOL_TOPICS.find(topic => topic.id === id); }
