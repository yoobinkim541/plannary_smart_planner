# Planary 전체 디버깅 및 TDD 리팩터링 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Planary의 인증, 온보딩, e-Class 동기화, 작업/메모/위키 저장 경로를 재현 가능한 테스트로 검증하고 확인된 버그를 TDD 방식으로 수정한다.

**Architecture:** 현재 정적 HTML + Firebase compat + React/Babel redesign 구조를 유지한다. 브라우저 이벤트와 Firebase 브리지를 경계로 두고, Node에서 실행 가능한 작은 회귀 테스트 하네스를 추가해 인증·저장·동기화 순서를 검증한다. 실제 Firebase 계정과 e-Class 계정이 필요한 검증은 로컬 시뮬레이션과 분리해 결과를 명시한다.

**Tech Stack:** React 18 UMD, Babel Standalone, Firebase Auth/Firestore compat, Node.js, Firestore Admin SDK, existing static scripts.

**Spec:** 사용자 요청(전체 디버깅, TDD 리팩터링, 버그 픽스, 트러블슈팅)과 `AGENTS.md`.

## Global Constraints

- 기존 정적 앱과 redesign 앱의 공개 이벤트 이름을 유지한다.
- 한 번에 하나의 원인만 수정하고, 수정 전에 재현 테스트가 실패하는지 확인한다.
- Firebase 실계정·e-Class 실계정 없이 성공을 주장하지 않고, 외부 검증 한계를 결과에 기록한다.
- 관련 없는 UI 리디자인이나 데이터 스키마 변경을 하지 않는다.
- 각 작업은 테스트와 문법 검사를 통과한 뒤 다음 작업으로 이동한다.

### Task 1: 테스트 실행 기반과 현재 상태 고정

**Files:**
- Create: `docs/superpowers/plans/2026-09-16-planary-debugging.md`
- Inspect: `package.json`, `redesign/src/firebase-bridge.jsx`, `api/eclass/*.js`, `worker/*.js`
- Test: `redesign/profile-bridge.test.js` and direct Node syntax checks

**Interfaces:**
- Consumes: existing browser event API and Firebase bridge.
- Produces: repeatable local commands that prove bridge and e-Class modules parse and that auth-bound events can be simulated.

- [x] **Step 1: Run the current regression test and record the baseline.**

  Run: `node redesign/profile-bridge.test.js`

- [x] **Step 2: Run syntax checks for the bridge and e-Class server modules.**

  Run: `node -e "const fs=require('fs'); new Function(fs.readFileSync('redesign/src/firebase-bridge.jsx','utf8')); console.log('firebase bridge syntax ok')"` and `node --check api/eclass/connection.js`, `node --check api/eclass/sync.js`, `node --check api/eclass/sync-core.js`.

- [x] **Step 3: Record unverified external boundaries.**

  Check for local Firebase/e-Class credentials without printing secrets. Do not change code when credentials are absent.

### Task 2: Authentication-bound event delivery

**Files:**
- Modify: `redesign/src/firebase-bridge.jsx`
- Test: `redesign/profile-bridge.test.js`

**Interfaces:**
- Consumes: `planary:update-profile`, `planary:eclass-connect`, `planary:eclass-sync`.
- Produces: profile writes and e-Class HTTP requests that wait for the initial auth observer state.

- [x] **Step 1: Add a failing test for an event dispatched before auth readiness.**

  Dispatch profile and e-Class events before `onAuthStateChanged` supplies a user; assert no premature failure, then assert the profile write and `/api/eclass/connection` → `/api/eclass/sync` sequence after sign-in.

- [x] **Step 2: Run the test and confirm the failure is caused by missing auth readiness.**

  Run: `node redesign/profile-bridge.test.js`. Expected: failure with the event completing before auth or `로그인이 필요합니다`.

- [x] **Step 3: Implement the smallest auth readiness gate.**

  Make `authHeaders()` await the initial Firebase auth callback, resolve queued profile writes after `api.uid` is set, and preserve an existing photo when the profile patch omits `avatar`.

- [x] **Step 4: Run the same test and all bridge syntax checks.**

  Expected: the test passes and every syntax command exits with code 0.

### Task 3: Persistence boundaries for tasks, notes, and wiki

**Files:**
- Inspect/modify only when a failing test identifies a defect: `redesign/src/firebase-bridge.jsx`, `redesign/src/app.jsx`, `redesign/src/pages-home-tasks.jsx`, `redesign/src/pages-rest.jsx`, `wiki.js`.
- Test: add focused Node regression tests next to the affected bridge/helper, or a minimal browser harness if the behavior is DOM-specific.

**Interfaces:**
- Consumes: `planary:create-task`, `planary:save-task`, `planary:update-note`, `planary:save-wiki-blocks`, Firestore snapshots.
- Produces: stable identity, no duplicate writes, preserved note coordinates, selected wiki page/block state across snapshot updates.

- [x] **Step 1: Trace each event from UI dispatch to Firestore payload and snapshot rehydration.**

  Document the source field names and the UI field names before editing.

- [x] **Step 2: Add one failing regression test for each confirmed defect.**

  Cover refresh persistence for a newly created task, full-board note coordinates, and wiki page selection without a mock default page.

- [x] **Step 3: Implement only the root-cause change for the currently failing test.**

  Keep local optimistic state and Firestore snapshot state consistent; do not add a second storage system unless the existing event contract cannot carry the data.

- [x] **Step 4: Run focused tests, bridge syntax checks, and a clean diff check.**

  Expected: no newly introduced event listener or storage warning.

### Task 4: e-Class connection, sync worker, and parser troubleshooting

**Files:**
- Inspect/modify: `api/eclass/connection.js`, `api/eclass/sync.js`, `api/eclass/sync-core.js`, `api/eclass/_seoultech.js`, `api/eclass/_syllabus.js`, `worker/request-tick.js`.
- Test: parser fixture tests and mocked handler/worker tests that never contain real credentials.

**Interfaces:**
- Consumes: authenticated API requests, encrypted connection documents, pending/running sync states, SeoulTech HTML parser input.
- Produces: actionable error state, per-user sync ownership, deterministic parser output, retryable pending sync.

- [ ] **Step 1: Add failing tests for connection state transitions.**

  Cover new connection save, manual sync success, sync failure becoming pending/error, and worker claim ownership by document ID.

- [x] **Step 2: Add parser fixtures for login failure and representative course/task HTML.**

  Assert title, course, due date, due time, source URL, and login-form rejection.

- [x] **Step 3: Run the tests before changing production code.**

  Each failure must identify a state transition or parser mismatch rather than a test harness error.

- [x] **Step 4: No server-side parser defect was reproduced; existing handlers remain unchanged.**

  Preserve encrypted credential storage and never log usernames, passwords, cookies, or tokens.

- [x] **Step 5: Run all local parser and syntax checks and report whether a live worker/e-Class login was verified.**

### Task 5: Final verification and handoff

**Files:**
- Inspect: all changed files and Git history.

**Interfaces:**
- Consumes: focused tests and syntax checks from Tasks 1–4.
- Produces: clean working tree or explicit remaining changes, commit/PR state, and a requirement-by-requirement verification report.

- [x] **Step 1: Run every focused test from the plan from a clean shell.**
- [x] **Step 2: Run syntax and whitespace checks for all changed JavaScript/JSX files.**
- [x] **Step 3: Review the diff for unrelated changes, secret leakage, and unhandled async errors.**
- [x] **Step 4: Commit only verified changes with the repository's Korean `fix)`/`add)` convention when the user has requested Git delivery.**
- [x] **Step 5: Push only after the final verification output is recorded, then verify the remote branch points at the pushed commit.**
