# 🚀 Modern Todo List & Memo Project

Firebase를 연동한 개인별 할 일 관리 및 메모 애플리케이션입니다. **SPA(Single Page Application) 아키텍처**로 여러 화면을 지원합니다.

## 🎯 구현 목표
- [x] **Firebase Firestore 연동**: 실시간 데이터베이스 기반 할 일 관리
- [x] **SPA 화면 전환 기능**: HTML 페이지 이동 없이 `<section class="page-content">` 간 화면 스위칭
- [x] **Notes (메모) 기능**: 별도의 할 일이 아닌 포스트잇 형태의 위젯 보드 구현
- [x] **향상된 필터 (Archive, Important 등)**: 데이터를 삭제하지 않고 보관(Archive)하거나 중요도를 분류
- [x] **Google 로그인 및 기본 CRUD 기능**

## 🛠 아키텍처 (SPA 라우팅)
이 애플리케이션은 `index.html` 단일 페이지로 작동하며, `app.js` 내부의 뷰 라우터(`switchPage()`)를 통해 요소들의 디스플레이를 토글합니다.
- `[data-target="page-home"]` : 대시보드 요약 화면
- `[data-target="page-tasks"]` : 메인 할 일 관리 화면
- `[data-target="page-notes"]` : 스티커 메모 화면
- `[data-target="page-projects"]` : 프로젝트 계층 관리 화면
- `[data-target="page-bookmarks"]` : 북마크 저장 화면
- `[data-target="page-profile"]` : 유저 프로필 및 로그아웃 화면

## 🗄 데이터 구조 설계 (Firestore)
어플리케이션은 기존 인덱스 딜레이 이슈를 회피하기 위해 `client-side sorting` 방식을 이용합니다. (`OrderBy` 제한 해제)

- **Collection `todos` (할 일)**
  - 필드: `uid`, `text`, `memo`, `dueDate`, `priority`, `completed`, `archived`, `createdAt`
- **Collection `notes` (메모장)**
  - 필드: `uid`, `text`, `createdAt`

## 📁 파일 구조
```
memo/
├── index.html          # 메인 앱 콘솔 (모든 Section 페이지 포함)
├── login.html / signup.html # 인증 페이지
├── style.css           # 전체 UI, 애니메이션, Grid 설정
├── app.js              # 데이터 바인딩, SPA 라우터, FireStore 비즈니스 로직
├── firebase.json       # Hosting + Firestore 동시 배포 설정
├── firestore.rules     # 보안 규칙 (todos, notes 컬렉션 분리 방어)
├── firestore.indexes.json # 복합 인덱스 백업
└── GEMINI.md           # 에이전트 작업 지시서
```

## 💡 개발 가이드 (AI 에이전트 CLI 팁)
- **UI 스타일 추가 시**: 무조건 `style.css`에서 클래스를 추가할 것. 인라인 스타일 자제 요망.
- **페이지 추가 시**: `index.html`의 `#main-area` 내부에 `<section id="page-..." class="page-content">` 생성 후, Nav 버튼에 `data-target="page-..."` 부여.
- **필터 제어**: Tasks 화면 내부 뷰 리스트 필터링 시 `data-filter="..."` 속성값을 이용해 `app.js`에서 분류함 (`all`, `active`, `completed`, `important`, `archive`, `reminders`).

## 🔧 주요 CSS/HTML 셀렉터 참고
| 셀렉터 | 용도 |
|--------|------|
| `.page-content` | SPA 각 페이지 래퍼 컨테이너 (평소 `display:none`) |
| `.page-content.active`| 현재 켜져있는 화면 (애니메이션과 함께 보임) |
| `.note-card` | Sticky Notes 보드의 개별 포스트잇 엔티티 |
| `[data-target]` | 내비게이션/아이콘 레일의 클릭 이벤트로 화면을 스위칭하는 식별자 |
| `[data-filter]` | `#page-tasks` 내에서 태스크들을 분류하는 필터 식별자 |