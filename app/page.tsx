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

const records = data.records as RecordItem[];
const lawProfiles = data.lawProfiles as LawProfile[];

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

export default function Home() {
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState("전체");
  const [targetType, setTargetType] = useState("전체");
  const [selectedLaw, setSelectedLaw] = useState(lawProfiles[0]?.law || "");

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
  const selectedRecords = records.filter((r) => r.law === selectedProfile?.law).slice(0, 12);

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
          <StatCard label="법률 기준" value={data.summary.totalLaws} hint="고유 법률 수" />
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

        <section className="rounded-2xl border bg-white p-5 shadow-sm" style={{ borderColor: "var(--color-border)" }}>
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
              <article key={r.id} className="rounded-2xl border p-4" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface-warm)" }}>
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
        </section>
      </section>
    </main>
  );
}
