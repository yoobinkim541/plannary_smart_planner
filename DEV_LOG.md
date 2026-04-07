# 📝 DEV_LOG.md: 프로젝트 기술 명세 및 유지보수 가이드

이 문서는 프로젝트의 핵심 아키텍처와 유지보수를 위해 꼭 알아야 할 기술적 사항들을 한국어로 정리한 문서입니다.

## 1. 🏗 프로젝트 개요
- **목적**: Firebase 기반의 실시간 개인 생산성 관리 도구 (Todo, Notes, Projects, Bookmarks)
- **아키텍처**: 순수 JavaScript(Vanilla JS) 기반의 **Single Page Application (SPA)**
- **호스팅**: Firebase Hosting

## 2. 🧭 핵심 시스템: SPA 라우팅 (`app.js`)
프로젝트는 `index.html` 단일 파일로 작동하며, 페이지 전환은 실제 이동이 아닌 **요소의 표시 제어**를 통해 수행됩니다.

### `switchPage(targetId)` 함수
- `targetId`에 해당하는 `<section class="page-content">`에 `.active` 클래스를 추가합니다.
- 좌측 아이콘 레일(`rail-icon`)과 사이드바 메뉴(`nav-link`)의 활성화 상태를 동시에 동기화합니다.
- `updateSidebarHeader(targetId)`를 호출하여 우측 사이드바의 헤더(아이콘+텍스트)를 상황에 맞게 변경합니다.

## 3. 🏷 동적 사이드바 헤더 시스템
페이지 전환 시마다 사이드바 상단의 프로젝트 정보 영역이 동적으로 변합니다.

- **Home**: Dashboard 아이콘 + "Overview"
- **Tasks**: Check 아이콘 + "My Tasks"
- **Projects**: Layers 아이콘 + "Project Groups"
- **Notes**: Post-it 아이콘 + "Sticky Board"
- **Bookmarks**: Bookmark 아이콘 + "Web Resources"

## 4. 🎨 디자인 시스템 (`style.css`)
- **테마**: Light 모드 기반의 **글래스모피즘(Glassmorphism)**
- **CSS 변수**: `:root`에 정의된 색상 및 여백 변수를 사용하여 일관성을 유지합니다.
- **애니메이션**: 페이지 전환 및 데이터 로딩 시 `fadeSlideUp` 애니메이션을 사용하여 부드러운 UX를 제공합니다.

## 5. 💾 데이터 관리 (Firebase Firestore)
- **실시간 리스너 (`onSnapshot`)**: 데이터베이스의 변경 사항이 UI에 실시간으로 반영됩니다.
- **클라이언트 사이드 정렬**: Firestore 복합 인덱스 생성을 최소화하기 위해 앱 단에서 데이터를 정렬하여 서비스합니다.

---
**Last Updated**: 2024-04-07 (Dashboard & dynamic sidebar updates)
