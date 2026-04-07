# 🚀 Modern Todo & Sticky Notes App (SPA)

Firebase를 연동한 실시간 개인 일정 및 메모 관리 애플리케이션입니다. **단일 페이지 애플리케이션(SPA)** 구조로 설계되어 페이지 전환 없이 부드러운 사용자 경험을 제공합니다.

## ✨ 주요 기능

- **🔐 Google & Email 인증**: Firebase Authentication을 통한 안전한 로그인/회원가입 지원
- **📋 할 일 관리 (Task Management)**:
  - 실시간 CRUD (생성, 조회, 수정, 삭제)
  - 우선순위 설정 (High, Medium, Low) 및 기한 설정
  - 실시간 검색 및 상태별 필터링 (All, In-Progress, Completed, Important)
  - 보관함(Archive) 기능을 통한 지난 일정 관리
- **📌 스티커 메모 (Sticky Notes)**:
  - 위젯 형태의 포스트잇 메모 보드
  - 드래그 앤 드롭을 통한 자유로운 배치 및 위치 저장
  - 메모 내용 실시간 수정 및 배경색 강조
- **📊 대시보드 (Dashboard)**: 현재 프로젝트 상태 및 요약 대시보드 (업데이트 예정)

## 🛠 기술 스택

- **Frontend**: Vanilla JS (ES6+), HTML5, CSS3 (Glassmorphism & Modern UI)
- **Backend (Serverless)**: Firebase (Authentication, Firestore, Hosting)
- **Design Concepts**: SPA Routing, Responsive Web Design, Client-side Sorting

## 📂 파일 구조

```text
memo/
├── index.html          # 메인 앱 콘솔 (SPA Section 포함)
├── login.html          # 로그인 페이지
├── signup.html         # 회원가입 페이지
├── style.css           # 전체 UI/UX 스타일 (Glassmorphism)
├── app.js              # SPA 라우터 및 Firebase 로직
├── firebase.json       # Firebase Hosting 설정
├── firestore.rules     # DB 보안 규칙
└── README.md           # 프로젝트 가이드
```

## 🚀 시작하기

1. **저장소 클론**:
   ```bash
   git clone https://github.com/사용자아이디/todo.git
   cd todo
   ```
2. **Firebase 프로젝트 연결**:
   - `firebase-tools`가 설치되어 있어야 합니다.
   - `firebase init` 명령어로 자신의 프로젝트를 연결하세요.
3. **배포**:
   ```bash
   firebase deploy
   ```

## 💡 개발 가이드

- **SPA 화면 전환**: `app.js`의 `switchPage()` 함수가 `<section class="page-content">` 요소들의 표시 여부를 제어합니다.
- **데이터 정렬**: Firestore의 복합 인덱스 의존성을 최소화하기 위해 클라이언트 사이드 정렬 로직을 사용합니다.
- **보안 규칙**: `firestore.rules`를 통해 작성자 본인만 데이터에 접근할 수 있도록 보안이 강화되어 있습니다.

---
**Author**: [사용자 아이디]
