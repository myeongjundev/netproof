import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PathStrip } from "./PathStrip";
import { LESSONS } from "../learning";

it.each(LESSONS)("$id는 구성 순서와 ACL 위치만 그린다", lesson => {
  const html = renderToStaticMarkup(createElement(PathStrip, { ...lesson.path }));
  const nodeLabels = html.match(/class="path-node-name">[^<]+/g)?.map(label => label.split(">")[1]);
  expect(nodeLabels).toEqual(lesson.path.nodes.map(node => node.id));
  expect(html).toContain("<figure");
  expect(html).toContain("<ol");
  expect(html).toContain("<figcaption");
  for (const acl of lesson.path.acls) {
    expect(html).toContain(`ACL ${acl.name} · ${acl.dir}`);
    expect(html).toContain(`${acl.iface}에 ${acl.dir === "in" ? "들어올 때" : "나갈 때"} ACL ${acl.name}`);
  }
  expect(html).not.toMatch(/PASS|DENY|통과|막힘|drop|deny|permit/);
});
it("왕복 표시와 계산 범위 띠는 설명일 뿐 계산 결과가 아니다", () => {
  const html = renderToStaticMarkup(createElement(PathStrip, { ...LESSONS[1].path, outside: true }));
  expect(html).toContain("⇄");
  expect(html).toContain("돌아오는 길도 계산합니다");
  expect(html).toContain("path-outside");
  expect(html).toContain("NetProof 계산 범위");
  expect(html).toContain("실제 장비"); expect(html).toContain("결과는 장비에서 따로 확인");
  expect(html).toContain("NetProof는 이 구성 안에서 계산하고, 실제 장비 결과는 따로 확인합니다.");
  expect(html).not.toContain("실제 장비 · NetProof 밖");
  expect(html).toContain('class="path-outside" aria-hidden="true"');
  expect(html).not.toMatch(/PASS|DENY|정답/);
});
it.each([false, true])("축소 구성도는 outside=%s여도 띠와 실제 장비 자리를 만들지 않는다", outside => {
  const html = renderToStaticMarkup(createElement(PathStrip, { ...LESSONS[1].path, outside, size: "small" }));
  expect(html).toContain("path-strip-small"); expect(html).toContain("⇄");
  expect(html).not.toMatch(/path-scope|path-outside|NetProof 계산 범위|실제 장비|PASS|DENY/);
});
