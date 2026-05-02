# 🚀 Modern Todo & Sticky Notes App (SPA)

> **실시간 Firebase 연동을 통한 일정 및 메모 관리의 혁신적인 경험**  
> **🌍 라이브 데모:** (https://yourplanary.vercel.app/)

## 📝 프로젝트 소개

이 프로젝트는 바쁜 일상 속에서 사용자가 직관적으로 할 일을 관리하고, 포스트잇처럼 자유롭게 아이디어를 기록할 수 있도록 설계된 **SPA(Single Page Application)** 기반의 웹 서비스입니다. 

기존의 단순한 리스트형 투두 앱에서 벗어나, **대시보드 형태의 UX**와 **자유로운 배치가 가능한 스티커 메모** 기능을 결합하여 생산성을 극대화하는 데 중점을 두었습니다.

---

## 💎 핵심 기능 상세 설명

### 1. ⚡ 실시간 동기화 및 SPA 아키텍처
- **Firebase Firestore** 연동을 통해 데이터가 실시간으로 모든 디바이스에 동기화됩니다.
- 한 번의 로딩으로 페이지 전환 없이 모든 메뉴(Tasks, Notes, Profile 등)를 신속하게 이동할 수 있는 **SPA 라우팅** 로직이 적용되었습니다.

### 2. ✅ 강력한 할 일 관리 (Task Suite)
- **우선순위(High/Medium/Low)** 및 **기한 설정**을 통해 마감 임박 태스크를 직관적으로 파악합니다.
- **스마트 필터링**: `진행 중`, `완료`, `중요`, `보관함` 등 다양한 상태별로 일감을 나누어 관리합니다.
- **아카이브 시스템**: 삭제하지 않고 보관하여 과거의 기록을 언제든지 복구하거나 참조할 수 있습니다.

### 3. 📌 혁신적인 스티커 메모 보드 (Widget Board)
- 마치 실제 사무실 벽면의 포스트잇처럼, 메모를 **드래그 앤 드롭**하여 원하는 위치에 자유롭게 배치할 수 있습니다.
- 메모의 좌표 정보(x, y)가 DB에 자동 저장되어, 새로고침 후에도 사용자가 설정한 레이아웃이 유지됩니다.

### 4. 🔒 안전한 클라우드 보안
- **Firebase Authentication**을 통해 개인별 독립된 공간을 보장받으며, **Firestore Security Rules**를 적용하여 오직 본인만이 자신의 데이터에 접근할 수 있도록 설계되었습니다.

---

## 🛠 사용된 기술 (Tech Stack)

- **언어**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **플랫폼**: Firebase (Auth, Firestore, Hosting)
- **주요 기법**: 
  - Dynamic UI Rendering (Section Swapping 스타일의 SPA)
  - Interactive Drag & Drop System
  - Client-side data processing & Advanced Sorting

## 📂 프로젝트 구조

```text
memo/
├── index.html          # 메인 애플리케이션 프레임 (SPA 통합 페이지)
├── style.css           # 앱 전체 UI 디자인 시스템 및 글래스모피즘 효과
├── app.js              # 핵심 비즈니스 로직 및 SPA 라우팅 엔진
├── login.html / signup.html # 인증 보안 페이지
├── firebase.json       # Hosting 및 Firestore 호환 설정 파일
└── firestore.rules     # 강화된 데이터 보안 규칙
```

---

## 🚀 로컬 실행 및 설치 가이드

1. **GitHub 저장소 클론**:
   ```bash
   git clone https://github.com/사용자아이디/todo.git
   ```
2. **Firebase Hosting 로컬 서버 실행**:
   - 이 앱은 `/__/firebase/init.js` 예약 URL을 통해 Firebase 설정을 자동 로드합니다. 일반 Live Server나 `file://` 실행 대신 Firebase Hosting 서버를 사용하세요.
   ```bash
   npx firebase-tools serve --only hosting
   ```
   - 또는 배포된 [라이브 링크](https://practice-todo-list-32af6.web.app/)에 접속하세요.
3. **Firebase 연동**:
   - 직접 Firebase 프로젝트를 구축하려면 `firebase init`을 통해 연동 설정을 새롭게 구성하시기 바랍니다.

---
**Designed & Developed with ❤️ for productivity.**
