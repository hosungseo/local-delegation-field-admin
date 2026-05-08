"use client";

import { useMemo, useState } from "react";
import data from "./data/delegation.json";

type Count = { name: string; count: number };
type Matrix = { rows: string[]; cols: string[]; values: number[][] };
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

const phaseTone: Record<string, string> = {
  "1단계-선도과제": "bg-emerald-50 text-emerald-800 border-emerald-200",
  "2단계-중점검토": "bg-blue-50 text-blue-800 border-blue-200",
  "3단계-쟁점관리": "bg-amber-50 text-amber-800 border-amber-200",
};

function StatCard({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <div className="rounded-2xl border bg-white/85 p-5 shadow-sm" style={{ borderColor: "var(--color-border)" }}>
      <div className="text-sm" style={{ color: "var(--color-muted)" }}>{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
      <div className="mt-2 text-xs" style={{ color: "var(--color-muted)" }}>{hint}</div>
    </div>
  );
}

function BarList({ title, items }: { title: string; items: Count[] }) {
  const max = Math.max(...items.map((i) => i.count));
  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm" style={{ borderColor: "var(--color-border)" }}>
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
    <section className="rounded-2xl border bg-white p-5 shadow-sm" style={{ borderColor: "var(--color-border)" }}>
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
    <section className="min-w-0 rounded-2xl border bg-white p-4" style={{ borderColor: "var(--color-border)" }}>
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
          <article key={a.key} className="rounded-xl bg-stone-50 p-4">
            <div className="text-sm font-semibold">{a.label}{a.title ? `(${a.title})` : ""}</div>
            {a.body && <p className="mt-3 whitespace-pre-wrap text-sm leading-7">{a.body}</p>}
            {a.paragraphs?.length > 0 && (
              <div className="mt-3 space-y-2 text-sm leading-7">
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
    <section className="rounded-2xl border bg-white p-5 shadow-sm" style={{ borderColor: "var(--color-border)" }}>
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-accent)" }}>원문 대조 패널</div>
          <h2 className="mt-1 text-xl font-semibold">{record.task}</h2>
          <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>{record.law} · {record.article} · {record.ministry}</p>
        </div>
        <Pill className={phaseTone[record.implementationPhase] || ""}>{record.implementationPhase}</Pill>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ArticleBlock title="법률 원문" doc={entry?.lawDoc} keys={record.lawArticleKeys || []} emptyText="법률 원문을 불러오지 못했습니다." />
        <ArticleBlock title="시행령 원문" doc={entry?.decreeDoc} keys={record.decreeArticleKeys || []} emptyText={record.decreeGroup === "시행령 위임규정 없음" ? "이 사무는 시행령 위임규정 없음으로 분류되었습니다." : "시행령 원문 또는 매칭 조문을 불러오지 못했습니다."} />
      </div>
      <div className="mt-4 grid gap-3 text-xs lg:grid-cols-2" style={{ color: "var(--color-muted)" }}>
        <div className="rounded-xl bg-stone-50 p-3"><b>법률 근거 발췌</b><br />{record.lawEvidence || "-"}</div>
        <div className="rounded-xl bg-stone-50 p-3"><b>시행령 근거 발췌</b><br />{record.decreeEvidence || "-"}</div>
      </div>
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter((r) => {
      const hay = `${r.law} ${r.task} ${r.ministry} ${r.article} ${r.policyPackage}`.toLowerCase();
      return (!q || hay.includes(q)) && (phase === "전체" || r.implementationPhase === phase) && (targetType === "전체" || r.lawLocalTargetType === targetType);
    });
  }, [query, phase, targetType]);

  const selectedProfile = lawProfiles.find((l) => l.law === selectedLaw) || lawProfiles[0];
  const selectedRecord = filtered.find((r) => r.id === selectedId) || filtered[0] || records[0];

  return (
    <main>
      <section className="mx-auto max-w-7xl px-5 py-10 lg:py-14">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <div className="mb-4 inline-flex rounded-full border bg-white px-3 py-1 text-xs font-medium" style={{ borderColor: "var(--color-border)", color: "var(--color-accent)" }}>공픈클로 정책분석 탐색기</div>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight lg:text-6xl">현장집행·감독관리 사무<br />166건 탐색기</h1>
            <p className="mt-5 max-w-3xl text-lg" style={{ color: "var(--color-muted)" }}>
              법률상 지자체 수임 가능 유형과 시행령 현재 수임자를 교차해, 신설형·전환형·선도과제·쟁점관리 후보를 한 화면에서 검토합니다.
            </p>
          </div>
          <div className="rounded-3xl border bg-white/80 p-5 shadow-sm" style={{ borderColor: "var(--color-border)" }}>
            <div className="text-sm font-semibold">제출용 핵심 문장</div>
            <p className="mt-3 text-sm leading-7" style={{ color: "var(--color-muted)" }}>
              “현장집행·감독관리 166건은 일괄 이양보다 단계적 패키지 접근이 적절하다. 접수·보고·관리성 사무는 선도과제로, 조사·시정명령은 중점검토로, 처분·제재·과태료는 쟁점관리 후보로 분리해 추진할 수 있다.”
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="분석 대상" value={data.summary.totalTasks} hint="현장집행·감독관리 사무" />
          <StatCard label="법률 기준" value={data.summary.totalLaws} hint={`${data.summary.lawTextReady}개 법률 원문 수록`} />
          <StatCard label="원문 대조" value={`${data.summary.decreeTextReady}/41`} hint="시행령 원문 수록 법률" />
          <StatCard label="신설형" value="38" hint="시행령 위임규정 신설 검토" />
          <StatCard label="전환형" value="128" hint="특행기관 등 → 지자체 전환 검토" />
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 pb-10 lg:grid-cols-3">
        <BarList title="법률상 지자체 유형" items={data.summary.byLawLocalTargetType as Count[]} />
        <BarList title="추진단계" items={data.summary.byImplementationPhase as Count[]} />
        <BarList title="정책 패키지" items={(data.summary.byPolicyPackage as Count[]).slice(0, 6)} />
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 pb-10">
        <MatrixTable title="1차 매트릭스: 법률상 지자체 유형 × 시행령 현재 상태" description="신설형과 수임자 전환형을 가르는 본표입니다." matrix={data.matrices.lawTargetByDecree as Matrix} />
        <MatrixTable title="2차 매트릭스: 법률상 지자체 유형 × 사무 성격" description="선도과제, 중점검토, 쟁점관리 후보를 가르는 설명표입니다." matrix={data.matrices.lawTargetByCharacter as Matrix} />
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 pb-10 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-2xl border bg-white p-5 shadow-sm" style={{ borderColor: "var(--color-border)" }}>
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

        <section className="space-y-5">
          {selectedRecord && <EvidenceCompare record={selectedRecord} />}
          <div className="rounded-2xl border bg-white p-5 shadow-sm" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-semibold">사무 목록</h2>
            <div className="text-sm" style={{ color: "var(--color-muted)" }}>{filtered.length}건 표시</div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <input className="rounded-xl border bg-white p-3 md:col-span-1" style={{ borderColor: "var(--color-border)" }} placeholder="법률·사무 검색" value={query} onChange={(e) => setQuery(e.target.value)} />
            <select className="rounded-xl border bg-white p-3" style={{ borderColor: "var(--color-border)" }} value={targetType} onChange={(e) => setTargetType(e.target.value)}>{targetTypes.map((x: string) => <option key={x}>{x}</option>)}</select>
            <select className="rounded-xl border bg-white p-3" style={{ borderColor: "var(--color-border)" }} value={phase} onChange={(e) => setPhase(e.target.value)}>{phases.map((x: string) => <option key={x}>{x}</option>)}</select>
          </div>
          <div className="mt-5 max-h-[760px] space-y-3 overflow-auto pr-1">
            {filtered.slice(0, 80).map((r) => (
              <article key={r.id} onClick={() => setSelectedId(r.id)} className={`cursor-pointer rounded-2xl border p-4 ${selectedRecord?.id === r.id ? "ring-2 ring-emerald-800" : ""}`} style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface-warm)" }}>
                <div className="flex flex-wrap gap-2">
                  <Pill>{r.lawLocalTargetType}</Pill>
                  <Pill>{r.taskCharacter}</Pill>
                  <Pill className={phaseTone[r.implementationPhase] || ""}>{r.implementationPhase}</Pill>
                </div>
                <h3 className="mt-3 font-semibold">{r.task}</h3>
                <div className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>{r.law} · {r.article} · {r.ministry}</div>
                <div className="mt-3 grid gap-2 text-xs md:grid-cols-2" style={{ color: "var(--color-muted)" }}>
                  <div>시행령 상태: <b>{r.decreeGroup}</b></div>
                  <div>권고: <b>{r.recommendedAction}</b></div>
                </div>
              </article>
            ))}
          </div>
        </div>
        </section>
      </section>
    </main>
  );
}
