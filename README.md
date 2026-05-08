# 현장집행·감독관리 사무 166건 탐색기

**GitHub Pages:** <https://hosungseo.github.io/local-delegation-field-admin/>

법률상 지자체 수임 가능성이 열려 있는 현장집행·감독관리 사무 166건을 대상으로, 다음 축을 교차해 보는 정적 탐색기입니다.

- 법률상 지자체 유형
- 시행령 현재 수임자/상태
- 사무 성격
- 추진단계
- 법률별 프로파일

## 왜 만들었는가

이양 검토 대상 사무는 단순히 “조사·단속”으로 묶기 어렵습니다. 실제로는 인허가·등록, 조사·점검, 시정명령, 처분·과태료까지 이어지는 현장집행·감독관리 체인입니다.

따라서 이 레포는 166건을 일괄 이양 후보로 보여주기보다, 다음처럼 단계적으로 검토할 수 있게 구성했습니다.

1. **1단계 선도과제** — 접수·보고·관리성 사무
2. **2단계 중점검토** — 조사·점검·시정명령 등 실질 집행권
3. **3단계 쟁점관리** — 처분·제재·과태료·청문 등 반박 가능성이 큰 사무

## 핵심 수치

- 분석 대상: 166건
- 법률 기준: 41개
- 시행령 위임규정 신설형: 38건
- 수임자 전환형: 128건

법률상 지자체 유형:

| 유형 | 건수 |
|---|---:|
| 시·도지사 | 78 |
| 시·도지사+시장·군수·구청장 | 56 |
| 지방자치단체의 장 | 28 |
| 시·도지사+시장·군수·구청장+지방자치단체의 장 | 3 |
| 교육감/교육장 | 1 |

## 주요 화면

- 1차 매트릭스: 법률상 지자체 유형 × 시행령 현재 상태
- 2차 매트릭스: 법률상 지자체 유형 × 사무 성격
- 법률별 프로파일
- 필터 가능한 사무 목록

## 데이터 출처

작업 산출물:

- `tmp/gmail-iyang/delegation-full/core-185-implementation-package-20260509-0801-by-task.csv`
- `tmp/gmail-iyang/delegation-full/core-185-matrix-1-law-target-x-decree-status-20260509-0758.csv`
- `tmp/gmail-iyang/delegation-full/core-185-matrix-2-law-target-x-task-character-20260509-0758.csv`

이 레포에는 정적 JSON으로 변환한 `app/data/delegation.json`을 포함합니다.

## 기술 스택

- Next.js + React + TypeScript + Tailwind CSS
- GitHub Pages 정적 배포
- CSV 분석 결과 → 정적 JSON → 클라이언트 탐색 UI

## 로컬 실행

```bash
npm install
npm run dev
```

## 정적 빌드

```bash
npm run build
```

## 포지셔닝

이 프로젝트는 공픈클로(GongpunClaw)식 정책분석 산출물을 웹 탐색기로 바꾸는 실험입니다. `gwangjujonnam-specials` 레포의 법령·특례 탐색 레이아웃과 정적 배포 구조를 참고했습니다.
