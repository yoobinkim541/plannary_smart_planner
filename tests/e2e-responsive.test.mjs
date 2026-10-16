// tests/e2e-responsive.test.mjs
// Automated verification suite across Desktop, Tablet, and Mobile viewports.
// Tests run against local Planary server (127.0.0.1:3000) backed by real Firebase.

export async function runAllTests(browser) {
  const results = {
    desktop: { passed: 0, failed: 0, tests: [] },
    tablet: { passed: 0, failed: 0, tests: [] },
    mobile: { passed: 0, failed: 0, tests: [] },
  };

  function assert(suite, name, condition, details = "") {
    if (condition) {
      results[suite].passed++;
      results[suite].tests.push({ name, status: "PASS", details });
    } else {
      results[suite].failed++;
      results[suite].tests.push({ name, status: "FAIL", details });
    }
  }

  // ==========================================
  // SUITE 1: DESKTOP (1280x800)
  // ==========================================
  const tabDesk = await browser.open({
    name: "test_desktop",
    url: "http://127.0.0.1:3000/",
    viewport: { width: 1280, height: 800 }
  });

  try {
    await new Promise(r => setTimeout(r, 2000));

    // Sign in test user if needed
    await tabDesk.evaluate(`(async () => {
      const auth = firebase.auth();
      if (!auth.currentUser) {
        await auth.signInWithEmailAndPassword("planary_test_1792156104576@example.com", "TestPassword123!");
      }
    })()`);
    await new Promise(r => setTimeout(r, 1000));

    // Test 1: Chrome Layout (Rail, Topbar, Sidebar visible, Tablet toggle hidden)
    const layout = await tabDesk.evaluate(`(() => {
      const rail = document.querySelector(".rail");
      const topbar = document.querySelector(".topbar");
      const tabletToggle = document.querySelector(".btn.tablet-toggle");
      const mobileBar = document.querySelector(".mobile-bar");
      const mobileTabs = document.querySelector(".mobile-tabs");

      return {
        railVisible: rail && window.getComputedStyle(rail).display !== "none",
        topbarVisible: topbar && window.getComputedStyle(topbar).display !== "none",
        tabletToggleHidden: !tabletToggle || window.getComputedStyle(tabletToggle).display === "none",
        mobileBarHidden: !mobileBar || window.getComputedStyle(mobileBar).display === "none",
        mobileTabsHidden: !mobileTabs || window.getComputedStyle(mobileTabs).display === "none",
        noHorizontalOverflow: document.documentElement.scrollWidth <= window.innerWidth
      };
    })()`);

    assert("desktop", "Desktop Chrome Layout Visibility", layout.railVisible && layout.topbarVisible && layout.tabletToggleHidden && layout.mobileBarHidden && layout.mobileTabsHidden);
    assert("desktop", "Desktop No Horizontal Overflow", layout.noHorizontalOverflow);

    // Test 2: Task Suite (Create, Time Grouping "기한 없음", Toggle, Delete)
    const taskTest = await tabDesk.evaluate(`(async () => {
      const api = window.Planary.api;
      const title = "E2E 데스크톱 작업 " + Date.now();
      const id = await api.createTask({
        id: "t_desk_" + Date.now(),
        title,
        priority: "high",
        dueDate: null,
        done: false
      });

      // Switch to tasks page
      const taskBtn = Array.from(document.querySelectorAll(".rail-btn")).find(b => b.textContent.includes("작업"));
      if (taskBtn) taskBtn.click();
      await new Promise(r => setTimeout(r, 800));

      const bodyText = document.body.innerText;
      const hasNodateGroup = bodyText.includes("기한 없음");
      const hasTaskTitle = bodyText.includes(title);

      // Toggle complete
      await api.toggleTask(id);
      await new Promise(r => setTimeout(r, 500));

      // Delete task
      await api.deleteTask(id);
      await new Promise(r => setTimeout(r, 400));
      const deletedFromDom = !document.body.innerText.includes(title);

      return { created: !!id, hasNodateGroup, hasTaskTitle, deletedFromDom };
    })()`);

    assert("desktop", "Task Creation with Null DueDate", taskTest.created);
    assert("desktop", "Task Appears in '기한 없음' Group", taskTest.hasNodateGroup && taskTest.hasTaskTitle);
    assert("desktop", "Task Toggle and Deletion", taskTest.deletedFromDom);

    // Test 3: Projects (Create via API, Card Rendering, Delete)
    const projTest = await tabDesk.evaluate(`(async () => {
      const api = window.Planary.api;
      const name = "E2E 프로젝트 " + Date.now();
      const id = await api.createProject(name, "#7f0df2", "📁");
      
      const projBtn = Array.from(document.querySelectorAll(".rail-btn")).find(b => b.textContent.includes("프로젝트"));
      if (projBtn) projBtn.click();
      await new Promise(r => setTimeout(r, 800));

      const rendered = document.body.innerText.includes(name);
      await api.deleteProject(id);
      return { id: !!id, rendered };
    })()`);

    assert("desktop", "Project Creation and Rendering", projTest.id && projTest.rendered);

    // Test 4: Sticky Notes (Create, Edit, Delete)
    const noteTest = await tabDesk.evaluate(`(async () => {
      const api = window.Planary.api;
      const text = "E2E 메모 " + Date.now();
      const id = await api.createNote({ text, color: "yellow", x: 120, y: 120 });

      const noteBtn = Array.from(document.querySelectorAll(".rail-btn")).find(b => b.textContent.includes("포스트잇"));
      if (noteBtn) noteBtn.click();
      await new Promise(r => setTimeout(r, 800));

      const rendered = document.body.innerText.includes(text);
      await api.deleteNote(id);
      return { id: !!id, rendered };
    })()`);

    assert("desktop", "Sticky Note Creation and Rendering", noteTest.id && noteTest.rendered);

    // Test 5: Wiki / Markdown / KaTeX
    const wikiTest = await tabDesk.evaluate(`(async () => {
      const hasExport = typeof window.Planary.wikiBlocksToMarkdown === "function";
      let mdValid = false;
      if (hasExport) {
        const md = window.Planary.wikiBlocksToMarkdown([
          { id: "1", type: "h1", content: "헤더" },
          { id: "2", type: "math", content: "x^2" }
        ], "테스트");
        mdValid = md.includes("# 헤더") && md.includes("$$") && md.includes("x^2");
      }

      await window.__ensureKatex();
      const katexWorks = typeof window.katex !== "undefined";

      return { hasExport, mdValid, katexWorks };
    })()`);

    assert("desktop", "Wiki Markdown Export and KaTeX", wikiTest.hasExport && wikiTest.mdValid && wikiTest.katexWorks);

    // Test 6: Theme Toggle & i18n
    const uiTest = await tabDesk.evaluate(`(async () => {
      const themeBtn = document.querySelector("button[title='테마 전환']");
      const t1 = document.documentElement.getAttribute("data-theme");
      themeBtn?.click();
      await new Promise(r => setTimeout(r, 300));
      const t2 = document.documentElement.getAttribute("data-theme");
      themeBtn?.click(); // restore
      
      if (window.Planary?.api?.savePreferences) {
        await window.Planary.api.savePreferences({ lang: "en" });
      }
      window.PlanaryI18n.setLang("en");
      await new Promise(r => setTimeout(r, 600));
      const isEnglish = document.body.innerText.includes("Tasks") || document.body.innerText.includes("Projects") || document.body.innerText.includes("Home");
      if (window.Planary?.api?.savePreferences) {
        await window.Planary.api.savePreferences({ lang: "ko" });
      }
      window.PlanaryI18n.setLang("ko");
      return { themeSwitched: t1 !== t2, isEnglish };
    })()`);

    assert("desktop", "Theme Dark/Light Switching", uiTest.themeSwitched);
    assert("desktop", "i18n Language Translation", uiTest.isEnglish);
  } finally {
    await tabDesk.close();
  }

  // ==========================================
  // SUITE 2: TABLET (768x1024)
  // ==========================================
  const tabTablet = await browser.open({
    name: "test_tablet",
    url: "http://127.0.0.1:3000/",
    viewport: { width: 768, height: 1024 }
  });

  try {
    await new Promise(r => setTimeout(r, 2000));

    // Test 1: Tablet layout inspection
    const tabLayout = await tabTablet.evaluate(`(() => {
      const rail = document.querySelector(".rail");
      const tabletToggle = document.querySelector(".btn.tablet-toggle");
      const mobileBar = document.querySelector(".mobile-bar");
      const mobileTabs = document.querySelector(".mobile-tabs");

      return {
        railVisible: rail && window.getComputedStyle(rail).display !== "none",
        tabletToggleVisible: tabletToggle && window.getComputedStyle(tabletToggle).display !== "none",
        mobileBarHidden: !mobileBar || window.getComputedStyle(mobileBar).display === "none",
        mobileTabsHidden: !mobileTabs || window.getComputedStyle(mobileTabs).display === "none",
        noHorizontalOverflow: document.documentElement.scrollWidth <= window.innerWidth
      };
    })()`);

    assert("tablet", "Tablet Toggle Button Visible (641-1100px)", tabLayout.tabletToggleVisible);
    assert("tablet", "Tablet Mobile Controls Hidden", tabLayout.mobileBarHidden && tabLayout.mobileTabsHidden);
    assert("tablet", "Tablet No Horizontal Overflow", tabLayout.noHorizontalOverflow);

    // Test 2: Tablet Sidebar Toggle Action
    const sidebarToggle = await tabTablet.evaluate(`(async () => {
      const toggleBtn = document.querySelector(".btn.tablet-toggle");
      if (!toggleBtn) return { found: false };

      toggleBtn.click();
      await new Promise(r => setTimeout(r, 400));
      const scrim = document.querySelector(".tablet-sidebar-scrim");
      const scrimVisible = !!scrim && window.getComputedStyle(scrim).display !== "none";

      // Click again or scrim to close
      if (scrim) scrim.click();
      else toggleBtn.click();
      await new Promise(r => setTimeout(r, 300));
      const scrimClosed = !document.querySelector(".tablet-sidebar-scrim");

      return { found: true, scrimVisible, scrimClosed };
    })()`);

    assert("tablet", "Tablet Sidebar Overlay Toggles", sidebarToggle.scrimVisible && sidebarToggle.scrimClosed);
  } finally {
    await tabTablet.close();
  }

  // ==========================================
  // SUITE 3: MOBILE (375x812)
  // ==========================================
  const tabMobile = await browser.open({
    name: "test_mobile",
    url: "http://127.0.0.1:3000/",
    viewport: { width: 375, height: 812 }
  });

  try {
    await new Promise(r => setTimeout(r, 2000));

    // Test 1: Mobile layout (Rail/Sidebar hidden, MobileBar/MobileTabs visible)
    const mobLayout = await tabMobile.evaluate(`(() => {
      const rail = document.querySelector(".rail");
      const sidebar = document.querySelector(".sidebar");
      const mobileBar = document.querySelector(".mobile-bar");
      const mobileTabs = document.querySelector(".mobile-tabs");

      return {
        railHidden: !rail || window.getComputedStyle(rail).display === "none",
        sidebarHidden: !sidebar || window.getComputedStyle(sidebar).display === "none",
        mobileBarVisible: mobileBar && window.getComputedStyle(mobileBar).display !== "none",
        mobileTabsVisible: mobileTabs && window.getComputedStyle(mobileTabs).display !== "none",
        noHorizontalOverflow: document.documentElement.scrollWidth <= window.innerWidth
      };
    })()`);

    assert("mobile", "Mobile Chrome Layout (Rail/Sidebar Hidden, Bar/Tabs Visible)", mobLayout.railHidden && mobLayout.sidebarHidden && mobLayout.mobileBarVisible && mobLayout.mobileTabsVisible);
    assert("mobile", "Mobile No Horizontal Overflow", mobLayout.noHorizontalOverflow);

    // Test 2: Mobile Bottom Tabs Navigation
    const mobNav = await tabMobile.evaluate(`(async () => {
      const tabs = Array.from(document.querySelectorAll(".mobile-tab"));
      const taskTab = tabs.find(t => t.textContent.includes("작업"));
      if (!taskTab) return { taskTabFound: false };

      taskTab.click();
      await new Promise(r => setTimeout(r, 600));

      const pageTitle = document.querySelector(".page-head h1, .page-title, h1, h2")?.textContent.trim();
      const isTaskPage = pageTitle && pageTitle.includes("작업");

      return { taskTabFound: true, isTaskPage, activeTabClass: taskTab.className };
    })()`);

    assert("mobile", "Mobile Bottom Tab Page Navigation", mobNav.taskTabFound && mobNav.isTaskPage);

    // Test 3: Mobile Drawer (Menu Button in MobileBar)
    const mobDrawer = await tabMobile.evaluate(`(async () => {
      const menuBtn = document.querySelector(".mobile-bar button");
      if (!menuBtn) return { menuBtnFound: false };

      menuBtn.click();
      await new Promise(r => setTimeout(r, 400));

      const drawer = document.querySelector(".drawer");
      const drawerIsOpen = drawer && drawer.classList.contains("is-open");

      // Close drawer by clicking scrim
      const scrim = document.querySelector(".drawer-scrim");
      if (scrim) scrim.click();
      await new Promise(r => setTimeout(r, 300));
      const drawerIsClosed = !drawer || !drawer.classList.contains("is-open");

      return { menuBtnFound: true, drawerIsOpen, drawerIsClosed };
    })()`);

    assert("mobile", "Mobile Drawer Opening and Closing", mobDrawer.menuBtnFound && mobDrawer.drawerIsOpen && mobDrawer.drawerIsClosed);
  } finally {
    await tabMobile.close();
  }

  return results;
}
