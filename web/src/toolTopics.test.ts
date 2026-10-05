import { LESSONS } from "./learning";
import handoff from "../../HANDOFF.md?raw";
import { TOOL_TOPICS, SECURITY_EXAMPLE, TOOL_NOTICE } from "./toolTopics";

it("도구 두 주제는 실습과 별도 id·공식 출처·버전·확인 날짜를 가진다", () => {
  expect(TOOL_TOPICS.map(t => t.id)).toEqual(["graylog", "wazuh"]);
  for (const topic of TOOL_TOPICS) {
    expect(LESSONS.some(lesson => lesson.id === topic.id)).toBe(false);
    expect(topic.version).toBe(topic.id === "graylog" ? "Graylog 7.1" : "Wazuh 4.14");
    expect(topic.checked).toBe("2026-10-05");
    expect(topic.sources.every(source => source.href.startsWith(topic.id === "graylog" ? "https://go2docs.graylog.org/" : "https://documentation.wazuh.com/"))).toBe(true);
    expect(topic.concepts).toHaveLength(6);
  }
  expect(JSON.parse(SECURITY_EXAMPLE)).toEqual({ app: "netproof", event: "login_failure", reason: "bad_password", nickname: "qa_author", user_id: 2, src_ip: "127.0.0.1", failed_count: 3, time: "2026-10-05T03:10:00Z" });
  expect(TOOL_NOTICE).toBe("NetProof는 Graylog·Wazuh를 설치하거나 대신 실행하지 않습니다. 수업 환경에서 직접 확인하세요.");
});

it.each(TOOL_TOPICS)("$id 원고의 사실 문장을 HANDOFF 부록 그대로 사용한다", topic => {
  const section = handoff.split(topic.id === "graylog" ? "**Graylog** (" : "**Wazuh** (")[1].split("## 이전 과제 기록")[0].split("**Wazuh** (")[0];
  for (const sentence of [topic.title, topic.description, topic.focus, topic.analogy, ...topic.concepts, ...topic.steps, ...topic.checkpoints]) {
    expect(section).toContain(`\`${sentence}\``);
  }
  for (const source of topic.sources) expect(section).toContain(source.href);
});
