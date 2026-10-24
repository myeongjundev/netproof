import { useEffect, useState } from "react";
import { scrollTo } from "../motion";

export interface RailSection { id: string; label: string }

/** 화면 위쪽 기준선(offset)을 지난 마지막 구역이 지금 보는 구역이다. 아직 아무 구역도 지나지 않았으면 첫 구역. */
export function activeSection(sections: RailSection[], tops: Record<string, number>, offset = 80): string {
  let current = sections[0]?.id ?? "";
  for (const section of sections) if (section.id in tops && tops[section.id] <= offset) current = section.id;
  return current;
}

/**
 * 긴 화면의 옆 구역 이동 막대(docs/v1.1-design.md §B). 넓은 화면에서만 보인다(CSS).
 * 단추로 구역에 스크롤하고 해시 주소는 바꾸지 않는다(해시 라우터와 충돌하지 않게).
 */
export function SectionRail({ sections, onRecheck, recheckDisabled }: { sections: RailSection[]; onRecheck: () => void; recheckDisabled: boolean }) {
  const [active, setActive] = useState(sections[0]?.id ?? "");
  const key = sections.map((section) => section.id).join("|");
  useEffect(() => {
    const update = () => {
      const tops: Record<string, number> = {};
      for (const section of sections) {
        const element = document.getElementById(section.id);
        if (element) tops[section.id] = element.getBoundingClientRect().top;
      }
      setActive(activeSection(sections, tops));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { window.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const go = (id: string) => { const element = document.getElementById(id); if (element) scrollTo(element); };
  const toTop = () => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  return <nav className="section-rail" aria-label="이 화면의 구역">
    <ol>{sections.map((section) => <li key={section.id}>
      <button type="button" aria-current={active === section.id ? "location" : undefined} onClick={() => go(section.id)}>{section.label}</button>
    </li>)}</ol>
    <div className="section-rail-actions">
      <button type="button" aria-label="맨 위로" title="맨 위로" onClick={toTop}>↑</button>
      <button type="button" aria-label="다시 확인" title="다시 확인" disabled={recheckDisabled} onClick={onRecheck}>↻</button>
    </div>
  </nav>;
}
