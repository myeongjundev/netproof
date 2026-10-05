import workflow from "../../examples/n8n/netproof-verify.workflow.json";
import request from "../../examples/n8n/request.json";
import { parseRoute } from "./router";
import { toolTopicById } from "./toolTopics";

type Verdict = { comparison: string; result: string; reason: string; problems: string[] };
const jsCode = workflow.nodes.find(node => node.name === "결과 문장 만들기")!.parameters.jsCode!;
const run = new Function("$input", "$", jsCode) as (
  input: { all: () => { json: Verdict }[] },
  lookup: (name: string) => { first: () => { json: { body: { ai_expected?: string } } } }
) => { json: Verdict & {message: string; notify: boolean} }[];
function execute(verdicts: Verdict[], ai_expected?: string) {
  return run({all: () => verdicts.map(json => ({json}))}, name => {
    expect(name).toBe("NetProof 검증 요청 받기");
    return {first: () => ({json: {body: {ai_expected}}})};
  }).map(item => item.json);
}

it.each([
  ["AGREE", "DENY", "DENY", "= AI 답(막힘)과 NetProof 계산이 같습니다", false],
  ["DISAGREE", "DENY", "PASS", "≠ AI 답(통과)과 NetProof 계산(막힘)이 다릅니다", true],
  ["NO_CLAIM", "DENY", undefined, "NetProof 계산 막힘", false],
  ["NOT_COMPARABLE", "INVALID", "PASS", "NetProof 계산 입력 오류", false],
  ["NOT_COMPARABLE", "UNSUPPORTED", "DENY", "NetProof 계산 판정 불가", false],
  // 일부러 모순된 result·AI 답을 주어도 comparison만 따른다.
  ["DISAGREE", "PASS", "PASS", "≠ AI 답(통과)과 NetProof 계산(통과)이 다릅니다", true],
  ["AGREE", "DENY", "PASS", "= AI 답(통과)과 NetProof 계산이 같습니다", false],
  ["NO_CLAIM", "PASS", "PASS", "NetProof 계산 통과", false],
])("%s %s %s 문장은 엔진 비교를 그대로 따른다", (comparison, result, expected, message, notify) => {
  const verdict = {comparison: comparison as string, result: result as string, reason: "엔진 이유", problems: ["엔진 문제"]};
  const before = structuredClone(verdict);
  expect(execute([verdict], expected as string | undefined)).toEqual([{...verdict, message, notify}]);
  expect(verdict).toEqual(before);
});

it("여러 항목의 reason·problems·comparison을 그대로 보존한다", () => {
  const verdicts = [
    {comparison:"NO_CLAIM",result:"unknown",reason:"a",problems:[]},
    {comparison:"DISAGREE",result:"DENY",reason:"b",problems:["입력 확인"]},
  ];
  expect(execute(verdicts)[0].message).toBe("NetProof 계산 unknown");
  expect(execute(verdicts)[1]).toEqual({...verdicts[1],message:"≠ AI 답(없음)과 NetProof 계산(막힘)이 다릅니다",notify:true});
  expect(execute([])).toEqual([]);
});

it("HTTP 본문 표현식이 웹훅 데이터를 ai claim으로 옮긴다", () => {
  const expression = workflow.nodes.find(node => node.name === "NetProof /api/verify")!.parameters.jsonBody!;
  const serialize = new Function("$json", "return (" + expression.slice(3, -3) + ")") as (json: {body: object}) => string;
  expect(JSON.parse(serialize({body:request}))).toEqual({network:request.network,flow:request.flow,claim:{kind:"ai",expected:"PASS",source:"n8n",text:request.ai_text}});
  const {ai_expected: ignored, ai_text: ignoredText, ...withoutClaim} = request;
  expect(JSON.parse(serialize({body:withoutClaim}))).toEqual({network:request.network,flow:request.flow,claim:{kind:"ai",source:"n8n",text:""}});
});

it("학습실 응답 예도 실제 워크플로 문장과 같고 기존 라우터가 n8n을 연다", () => {
  const example = JSON.parse(toolTopicById("n8n")!.example.text) as Verdict;
  expect(execute([example], "PASS")[0]).toEqual(example);
  expect(parseRoute("#/learn/n8n")).toEqual({page:"learn",lessonId:"n8n"});
  expect(parseRoute("#/learn/n8n?x=1")).toEqual({page:"missing"});
});
