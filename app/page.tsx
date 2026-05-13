"use client";

import { useMemo, useState } from "react";
import data from "./data/delegation.json";

type Count = { name: string; count: number };
type Matrix = { rows: string[]; cols: string[]; values: number[][] };
type IntegratedRow = Record<string, string>;
type RecordItem = {
  id: string;
  ministry: string;
  law: string;
  article: string;
  task: string;
  direction: string;
  lawLocalTargetType: string;
  decreeGroup: string;
  taskCharacter: string;
  finalClass: string;
  recommendedAction: string;
  policyPackage: string;
  implementationPhase: string;
  phaseReason: string;
  lawEvidence: string;
  decreeEvidence: string;
  lawArticleKeys: string[];
  decreeArticleKeys: string[];
};

type LawProfile = {
  law: string;
  count: number;
  ministries: string[];
  targets: Count[];
  characters: Count[];
  decreeGroups: Count[];
  phases: Count[];
  sampleTasks: string[];
};

type LegalArticle = {
  key: string;
  label: string;
  title: string;
  body: string;
  paragraphs: { number: string; text: string; items: { number: string; text: string }[] }[];
  text: string;
};

type LegalDoc = {
  name: string;
  mst: string;
  kind: string;
  articleCount: number;
  articles: LegalArticle[];
  articlesByKey: Record<string, LegalArticle>;
};

type LegalEntry = {
  law: string;
  lawDoc?: LegalDoc | null;
  decreeDoc?: LegalDoc | null;
  fetchStatus: string;
  error: string;
};

const records = data.records as RecordItem[];
const lawProfiles = data.lawProfiles as LawProfile[];
const legalTexts = data.legalTexts as unknown as Record<string, LegalEntry>;
const integrated = data.integratedMatrices as unknown as {
  targetDecreeByCharacter: IntegratedRow[];
  targetCharacterByDecree: IntegratedRow[];
  topCells: IntegratedRow[];
  summary: { cellCount: number; generatedAt: string };
};

const phaseTone: Record<string, string> = {
  "F1-형식상전환후보": "bg-emerald-50 text-emerald-800 border-emerald-200",
  "F2-형식상신설검토후보": "bg-blue-50 text-blue-800 border-blue-200",
  "F3-직접권한·기위임": "bg-amber-50 text-amber-800 border-amber-200",
  "F4-법령명정규화": "bg-purple-50 text-purple-800 border-purple-200",
  "F5-형식연결보완": "bg-rose-50 text-rose-800 border-rose-200",
};

function StatCard({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <div className="hairline rounded-2xl border bg-white/90 p-5 shadow-sm backdrop-blur">
      <div className="text-sm" style={{ color: "var(--color-muted)" }}>{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
      <div className="mt-2 text-xs" style={{ color: "var(--color-muted)" }}>{hint}</div>
    </div>
  );
}

function StepCard({ step, title, count, body, tone }: { step: string; title: string; count: number; body: string; tone: string }) {
  return (
    <div className="hairline rounded-3xl border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}>{step}</span>
        <span className="text-2xl font-semibold">{count}</span>
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6" style={{ color: "var(--color-muted)" }}>{body}</p>
    </div>
  );
}

function BarList({ title, items }: { title: string; items: Count[] }) {
  const max = Math.max(...items.map((i) => i.count));
  return (
    <section className="hairline rounded-2xl border bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.name}>
            <div className="mb-1 flex items-center justify-between gap-3 text-sm">
              <span className="truncate">{item.name}</span>
              <span className="font-medium">{item.count}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-stone-100">
              <div className="h-full rounded-full" style={{ width: `${(item.count / max) * 100}%`, backgroundColor: "var(--color-accent)" }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MatrixTable({ title, description, matrix }: { title: string; description: string; matrix: Matrix }) {
  const max = Math.max(...matrix.values.flat());
  return (
    <section className="hairline rounded-2xl border bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>{description}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-white p-2 text-left font-semibold">법률상 지자체 유형</th>
              {matrix.cols.map((col) => <th key={col} className="min-w-28 p-2 text-left font-medium text-stone-600">{col}</th>)}
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row, i) => (
              <tr key={row}>
                <th className="sticky left-0 z-10 border-t bg-white p-2 text-left align-top font-medium" style={{ borderColor: "var(--color-border)" }}>{row}</th>
                {matrix.cols.map((col, j) => {
                  const value = matrix.values[i][j];
                  const alpha = value ? 0.12 + (value / max) * 0.5 : 0;
                  return (
                    <td key={col} className="matrix-cell border-t p-2 text-center font-semibold" style={{ borderColor: "var(--color-border)", backgroundColor: value ? `rgba(31,79,70,${alpha})` : "#fafafa", color: value ? "#102f29" : "#b0aaa1" }}>
                      {value || "·"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function IntegratedMatrix() {
  const rows = integrated.targetDecreeByCharacter;
  const charCols = Object.keys(rows[0] || {}).filter((k) => !["law_local_target_type", "decree_group", "row_total", "strategy_hint"].includes(k));
  const max = Math.max(...rows.flatMap((r) => charCols.map((c) => Number(r[c] || 0))), 1);
  return (
    <section className="hairline rounded-3xl border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-accent)" }}>통합 매트릭스</div>
          <h2 className="mt-1 text-2xl font-semibold">법률상 지자체 형식 × 시행령 수임자 형식 × F분류</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6" style={{ color: "var(--color-muted)" }}>
            한 줄이 곧 형식 검토 패키지입니다. 행은 법률상 지자체 형식과 시행령 수임자 형식을 묶고, 열은 F분류를 보여줍니다.
          </p>
        </div>
        <div className="rounded-2xl bg-stone-50 px-4 py-3 text-sm text-stone-600">비어 있지 않은 조합 {integrated.summary.cellCount}개</div>
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="min-w-[1080px] border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-white p-2 text-left">법률상 유형</th>
              <th className="bg-white p-2 text-left">시행령 상태</th>
              {charCols.map((c) => <th key={c} className="min-w-24 p-2 text-left text-stone-600">{c}</th>)}
              <th className="p-2 text-right">합계</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={`${r.law_local_target_type}-${r.decree_group}-${idx}`}>
                <th className="sticky left-0 z-10 border-t bg-white p-2 text-left align-top font-medium" style={{ borderColor: "var(--color-border)" }}>{r.law_local_target_type}</th>
                <td className="border-t p-2 align-top text-stone-600" style={{ borderColor: "var(--color-border)" }}>{r.decree_group}</td>
                {charCols.map((c) => {
                  const v = Number(r[c] || 0);
                  const alpha = v ? 0.1 + (v / max) * 0.55 : 0;
                  return <td key={c} className="border-t p-2 text-center font-semibold" style={{ borderColor: "var(--color-border)", backgroundColor: v ? `rgba(31,79,70,${alpha})` : "#fafafa", color: v ? "#102f29" : "#b0aaa1" }}>{v || "·"}</td>;
                })}
                <td className="border-t p-2 text-right font-semibold" style={{ borderColor: "var(--color-border)" }}>{r.row_total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {integrated.topCells.slice(0, 6).map((cell) => (
          <div key={cell.rank} className="rounded-2xl bg-stone-50 p-4 text-sm">
            <div className="font-semibold">{cell.rank}. {cell.law_local_target_type}</div>
            <div className="mt-1 text-stone-600">{cell.decree_group} × {cell.task_character}</div>
            <div className="mt-2 text-2xl font-semibold">{cell.count}건</div>
            <div className="mt-2 text-xs leading-5 text-stone-500">{cell.submission_message}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Pill({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}>{children}</span>;
}

function ArticleBlock({ title, doc, keys, emptyText }: { title: string; doc?: LegalDoc | null; keys: string[]; emptyText: string }) {
  const selected = useMemo(() => {
    if (!doc?.articlesByKey) return [] as LegalArticle[];
    const direct = keys.map((k) => doc.articlesByKey[k]).filter(Boolean);
    if (direct.length > 0) return direct;
    return doc.articles.slice(0, 2);
  }, [doc, keys]);

  return (
    <section className="hairline min-w-0 rounded-2xl border bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-1 text-xs" style={{ color: "var(--color-muted)" }}>{doc ? `${doc.name} · ${doc.articleCount}개 조문 수록` : emptyText}</p>
        </div>
        {doc?.mst && <span className="rounded-full bg-stone-100 px-2 py-1 text-[11px] text-stone-600">MST {doc.mst}</span>}
      </div>
      <div className="mt-4 max-h-[28rem] space-y-4 overflow-auto pr-1">
        {!doc && <div className="rounded-xl bg-stone-50 p-4 text-sm text-stone-500">{emptyText}</div>}
        {doc && selected.length === 0 && <div className="rounded-xl bg-stone-50 p-4 text-sm text-stone-500">매칭된 조문 키가 없습니다. 법령 전문은 데이터에 수록되어 있습니다.</div>}
        {selected.map((a) => (
          <article key={a.key} className="rounded-xl bg-stone-50 p-4 ring-1 ring-stone-100">
            <div className="flex flex-wrap items-baseline gap-2 text-sm font-semibold">
              <span>{a.label}</span>
              {a.title && <span className="text-stone-500">{a.title}</span>}
            </div>
            {a.body && <p className="law-text mt-3 whitespace-pre-wrap text-sm leading-7">{a.body}</p>}
            {a.paragraphs?.length > 0 && (
              <div className="law-text mt-3 space-y-2 text-sm leading-7">
                {a.paragraphs.slice(0, 8).map((para, idx) => (
                  <div key={`${a.key}-${idx}`}>
                    <p>{para.number} {para.text}</p>
                    {para.items.slice(0, 6).map((item, j) => <p key={j} className="ml-4 text-stone-600">{item.number} {item.text}</p>)}
                  </div>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function EvidenceCompare({ record }: { record: RecordItem }) {
  const entry = legalTexts[record.law];
  return (
    <section className="hairline rounded-3xl border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-accent)" }}>형식 근거 패널</div>
          <h2 className="mt-1 text-xl font-semibold">{record.task}</h2>
          <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>{record.law} · {record.article} · {record.ministry}</p>
        </div>
        <Pill className={phaseTone[record.implementationPhase] || ""}>{record.implementationPhase}</Pill>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ArticleBlock title="법률 형식 신호" doc={entry?.lawDoc} keys={record.lawArticleKeys || []} emptyText={record.lawEvidence || "법률상 지자체 형식 신호를 확인하세요."} />
        <ArticleBlock title="시행령 형식 신호" doc={entry?.decreeDoc} keys={record.decreeArticleKeys || []} emptyText={record.decreeEvidence || "시행령상 수임자 형식 신호를 확인하세요."} />
      </div>
      <details className="mt-4 rounded-2xl bg-stone-50 p-3 text-xs" style={{ color: "var(--color-muted)" }}>
        <summary className="cursor-pointer font-semibold text-stone-700">형식 판정 근거 보기</summary>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl bg-white p-3"><b>법률 형식</b><br />{record.lawEvidence || "-"}</div>
          <div className="rounded-xl bg-white p-3"><b>시행령 형식</b><br />{record.decreeEvidence || "-"}</div>
        </div>
      </details>
    </section>
  );
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState("전체");
  const [targetType, setTargetType] = useState("전체");
  const [selectedLaw, setSelectedLaw] = useState(lawProfiles[0]?.law || "");
  const [selectedId, setSelectedId] = useState(records[0]?.id || "");

  const phases = ["전체", ...data.summary.byImplementationPhase.map((x: Count) => x.name)];
  const targetTypes = ["전체", ...data.summary.byLawLocalTargetType.map((x: Count) => x.name)];
  const countByPhase = (name: string) => data.summary.byImplementationPhase.find((x: Count) => x.name === name)?.count || 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter((r) => {
      const hay = `${r.law} ${r.task} ${r.ministry} ${r.article} ${r.policyPackage} ${r.finalClass} ${r.taskCharacter}`.toLowerCase();
      return (!q || hay.includes(q)) && (phase === "전체" || r.implementationPhase === phase) && (targetType === "전체" || r.lawLocalTargetType === targetType);
    });
  }, [query, phase, targetType]);

  const selectedProfile = lawProfiles.find((l) => l.law === selectedLaw) || lawProfiles[0];
  const selectedRecord = filtered.find((r) => r.id === selectedId) || filtered[0] || records[0];

  return (
    <main className="app-shell min-h-screen">
      <section className="mx-auto max-w-7xl px-5 py-10 lg:py-14">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <div className="mb-4 inline-flex rounded-full border bg-white px-3 py-1 text-xs font-medium" style={{ borderColor: "var(--color-border)", color: "var(--color-accent)" }}>공픈클로 정책분석 탐색기 · 원문 대조판</div>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight lg:text-6xl">법률-시행령 형식 기준<br />557개 의견조회 대상 F분류 탐색기</h1>
            <p className="mt-5 max-w-3xl text-lg" style={{ color: "var(--color-muted)" }}>
              최신 수신 엑셀 「260512_3차일괄이양 의견조회 대상(특행 포함)_557개」를 기준으로 법률-시행령 형식만 다시 분류했습니다. 사무 성격 판단은 별도 단계로 남겨두었습니다.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-sm">
              <a className="rounded-full bg-stone-900 px-4 py-2 text-white" href="#evidence">형식 근거 보기</a>
              <a className="rounded-full border bg-white px-4 py-2" href="#integrated" style={{ borderColor: "var(--color-border)" }}>통합 매트릭스</a>
              <a className="rounded-full border bg-white px-4 py-2" href="#matrices" style={{ borderColor: "var(--color-border)" }}>매트릭스 보기</a>
              <a className="rounded-full border bg-white px-4 py-2" href="#tasks" style={{ borderColor: "var(--color-border)" }}>사무 검색</a>
            </div>
          </div>
          <div className="rounded-3xl border bg-white/80 p-5 shadow-sm" style={{ borderColor: "var(--color-border)" }}>
            <div className="text-sm font-semibold">제출용 핵심 문장</div>
            <p className="mt-3 text-sm leading-7" style={{ color: "var(--color-muted)" }}>
              “557개 의견조회 대상 중 형식상 발굴 후보는 F1 전환후보와 F2 신설검토후보로 묶고, 이미 직접권한·기위임(F3)과 형식연결 보완(F5)은 별도 레이어로 분리한다. 미매칭 항목은 후속 법령명·시행령 조문 확인 대상으로 둔다.”
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="분석 대상" value={data.summary.totalTasks} hint="법률-시행령 형식 재분류" />
          <StatCard label="법률 기준" value={data.summary.totalLaws} hint={`${data.summary.lawTextReady}개 법률 원문 수록`} />
          <StatCard label="F1+F2 후보" value={countByPhase("F1-형식상전환후보") + countByPhase("F2-형식상신설검토후보")} hint="사무 성격 판단 전 형식상 후보" />
          <StatCard label="F2 신설검토" value={data.summary.byImplementationPhase.find((x: Count) => x.name === "F2-형식상신설검토후보")?.count || 0} hint="형식상 신설검토" />
          <StatCard label="F1 전환후보" value={data.summary.byImplementationPhase.find((x: Count) => x.name === "F1-형식상전환후보")?.count || 0} hint="형식상 전환후보" />
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-5 pb-10 lg:grid-cols-3">
        <StepCard step="F1" title="형식상 전환후보" count={countByPhase("F1-형식상전환후보")} tone="bg-emerald-50 text-emerald-800 border-emerald-200" body="법률은 지자체 형식, 시행령은 비지자체·특행기관 등인 전환 검토군입니다." />
        <StepCard step="F2" title="형식상 신설검토" count={countByPhase("F2-형식상신설검토후보")} tone="bg-blue-50 text-blue-800 border-blue-200" body="법률은 지자체 형식이나 시행령 대응 수임 규정이 없거나 미확인인 신설 검토군입니다." />
        <StepCard step="F3" title="직접권한·기위임" count={countByPhase("F3-직접권한·기위임")} tone="bg-amber-50 text-amber-800 border-amber-200" body="법률 또는 시행령 형식상 이미 지자체 직접권한/기위임으로 보이는 별도표기군입니다." />
      </section>

      <section id="integrated" className="mx-auto max-w-7xl px-5 pb-10 scroll-mt-6">
        <IntegratedMatrix />
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 pb-10 lg:grid-cols-3">
        <BarList title="법률상 지자체 유형" items={data.summary.byLawLocalTargetType as Count[]} />
        <BarList title="F분류" items={data.summary.byImplementationPhase as Count[]} />
        <BarList title="분류 패키지" items={(data.summary.byPolicyPackage as Count[]).slice(0, 6)} />
      </section>

      <section id="matrices" className="mx-auto grid max-w-7xl gap-5 px-5 pb-10 scroll-mt-6">
        <MatrixTable title="1차 매트릭스: 법률상 지자체 형식 × 시행령 수임자 형식" description="F1 전환후보, F2 신설검토, F3 직접권한/기위임을 가르는 본표입니다." matrix={data.matrices.lawTargetByDecree as Matrix} />
        <MatrixTable title="2차 매트릭스: 법률상 지자체 형식 × F분류" description="형식상 전환후보, 형식상 신설검토, 직접권한·기위임 후보를 가르는 설명표입니다." matrix={data.matrices.lawTargetByCharacter as Matrix} />
      </section>

      <section id="evidence" className="mx-auto grid max-w-7xl gap-5 px-5 pb-10 lg:grid-cols-[0.72fr_1.28fr] scroll-mt-6">
        <section className="sticky-panel hairline rounded-3xl border bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">법률별 프로파일</h2>
          <select className="mt-4 w-full rounded-xl border bg-white p-3" style={{ borderColor: "var(--color-border)" }} value={selectedLaw} onChange={(e) => setSelectedLaw(e.target.value)}>
            {lawProfiles.map((law) => <option key={law.law} value={law.law}>{law.law} ({law.count})</option>)}
          </select>
          {selectedProfile && (
            <div className="mt-5 space-y-4">
              <div>
                <div className="text-sm" style={{ color: "var(--color-muted)" }}>소관</div>
                <div className="font-medium">{selectedProfile.ministries.join(", ")}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedProfile.targets.map((x) => <Pill key={x.name}>{x.name} {x.count}</Pill>)}
              </div>
              <div className="space-y-2 text-sm">
                {selectedProfile.sampleTasks.map((t) => <div key={t} className="rounded-xl bg-stone-50 p-3">{t}</div>)}
              </div>
            </div>
          )}
        </section>

        <section id="tasks" className="space-y-5 scroll-mt-6">
          {selectedRecord && <EvidenceCompare record={selectedRecord} />}
          <div className="hairline rounded-3xl border bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-semibold">F분류 사무 목록</h2>
            <div className="text-sm" style={{ color: "var(--color-muted)" }}>{filtered.length}건 표시</div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <input className="rounded-xl border bg-white p-3 md:col-span-1" style={{ borderColor: "var(--color-border)" }} placeholder="법률·사무·F분류 검색" value={query} onChange={(e) => setQuery(e.target.value)} />
            <select className="rounded-xl border bg-white p-3" style={{ borderColor: "var(--color-border)" }} value={targetType} onChange={(e) => setTargetType(e.target.value)}>{targetTypes.map((x: string) => <option key={x}>{x}</option>)}</select>
            <select className="rounded-xl border bg-white p-3" style={{ borderColor: "var(--color-border)" }} value={phase} onChange={(e) => setPhase(e.target.value)}>{phases.map((x: string) => <option key={x}>{x}</option>)}</select>
          </div>
          <div className="mt-5 max-h-[760px] space-y-3 overflow-auto pr-1">
            {filtered.slice(0, 80).map((r) => (
              <article key={r.id} onClick={() => setSelectedId(r.id)} className={`cursor-pointer rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-sm ${selectedRecord?.id === r.id ? "bg-emerald-50 ring-2 ring-emerald-800" : ""}`} style={{ borderColor: "var(--color-border)", backgroundColor: selectedRecord?.id === r.id ? undefined : "var(--color-surface-warm)" }}>
                <div className="flex flex-wrap gap-2">
                  <Pill>{r.lawLocalTargetType}</Pill>
                  <Pill>{r.taskCharacter}</Pill>
                  <Pill className={phaseTone[r.implementationPhase] || ""}>{r.implementationPhase}</Pill>
                </div>
                <h3 className="mt-3 font-semibold leading-6">{r.task}</h3>
                <div className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>{r.law} · {r.article} · {r.ministry}</div>
                <div className="mt-3 grid gap-2 text-xs md:grid-cols-2" style={{ color: "var(--color-muted)" }}>
                  <div>시행령 상태: <b>{r.decreeGroup}</b></div>
                  <div>형식판정: <b>{r.recommendedAction}</b></div>
                </div>
                <div className="mt-3 text-xs font-medium" style={{ color: "var(--color-accent)" }}>클릭하면 위 형식 근거 패널이 이 사무로 바뀝니다.</div>
              </article>
            ))}
          </div>
        </div>
        </section>
      </section>
    </main>
  );
}
