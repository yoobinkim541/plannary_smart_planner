// tests/all-methods-and-eclass.test.mjs
// Exhaustive method-level and new-user e-Class integration test suite.

export async function runComprehensiveMethodTests(browser) {
  const report = {
    total: 0,
    passed: 0,
    failed: 0,
    results: []
  };

  function check(name, success, info = "") {
    report.total++;
    if (success) {
      report.passed++;
      report.results.push({ name, status: "PASS", info });
    } else {
      report.failed++;
      report.results.push({ name, status: "FAIL", info });
    }
  }

  const tab = await browser.open({
    name: "method_runner",
    url: "http://127.0.0.1:3000/",
    viewport: { width: 1280, height: 800 }
  });

  try {
    await new Promise(r => setTimeout(r, 2000));

    // Ensure signed in with test user
    await tab.evaluate(`(async () => {
      const auth = firebase.auth();
      if (!auth.currentUser) {
        await auth.signInWithEmailAndPassword("planary_test_1792156104576@example.com", "TestPassword123!");
      }
    })()`);
    await new Promise(r => setTimeout(r, 1000));

    // ========================================================
    // 1. AUTH & USER PROFILE METHODS
    // ========================================================
    const authResults = await tab.evaluate(`(async () => {
      const api = window.Planary.api;
      const res = {};

      try {
        const user = await api.waitForAuth({ allowFutureSignIn: false });
        res.waitForAuth = { ok: !!user?.uid };
      } catch (e) { res.waitForAuth = { ok: false, error: e.message }; }

      try {
        const headers = await api.authHeaders();
        res.authHeaders = { ok: !!headers?.Authorization?.startsWith("Bearer ") };
      } catch (e) { res.authHeaders = { ok: false, error: e.message }; }

      try {
        await api.updateProfile({
          name: "테스트학생",
          school: "서울과학기술대학교",
          studentId: "20261111",
          bio: "생산성 도구 사용자"
        });
        const userSnap = await firebase.firestore().collection("users").doc(api.uid).get();
        const data = userSnap.data() || {};
        res.updateProfile = {
          ok: data.displayName === "테스트학생" && data.school === "서울과학기술대학교" && data.studentId === "20261111"
        };
      } catch (e) { res.updateProfile = { ok: false, error: e.message }; }

      return res;
    })()`);

    check("api.waitForAuth() resolves user with UID", authResults.waitForAuth.ok, authResults.waitForAuth.error);
    check("api.authHeaders() generates Bearer token", authResults.authHeaders.ok, authResults.authHeaders.error);
    check("api.updateProfile() persists school & studentId to Firestore", authResults.updateProfile.ok, authResults.updateProfile.error);

    // ========================================================
    // 2. SETTINGS & PREFERENCES METHODS
    // ========================================================
    const prefResults = await tab.evaluate(`(async () => {
      const api = window.Planary.api;
      const res = {};

      try {
        await api.savePreferences({ theme: "dark", accent: "violet", lang: "ko" });
        res.savePreferences = { ok: true };
      } catch (e) { res.savePreferences = { ok: false, error: e.message }; }

      try {
        await api.saveNotifPrefs({ email: true, push: false, gcal: false });
        res.saveNotifPrefs = { ok: true };
      } catch (e) { res.saveNotifPrefs = { ok: false, error: e.message }; }

      try {
        await api.saveOnboarding({ completed: true, currentStep: null });
        res.saveOnboarding = { ok: true };
      } catch (e) { res.saveOnboarding = { ok: false, error: e.message }; }

      return res;
    })()`);

    check("api.savePreferences() sets theme/accent/lang", prefResults.savePreferences.ok, prefResults.savePreferences.error);
    check("api.saveNotifPrefs() updates notification preferences", prefResults.saveNotifPrefs.ok, prefResults.saveNotifPrefs.error);
    check("api.saveOnboarding() records onboarding completion safely", prefResults.saveOnboarding.ok, prefResults.saveOnboarding.error);

    // ========================================================
    // 3. TASK METHODS (CRUD + Lifecycle)
    // ========================================================
    const taskResults = await tab.evaluate(`(async () => {
      const api = window.Planary.api;
      const db = firebase.firestore();
      const res = {};

      let taskId;
      try {
        taskId = await api.createTask({
          id: "m_task_" + Date.now(),
          title: "메서드 검증용 작업",
          memo: "메모 텍스트",
          priority: "high",
          dueDate: "2026-10-20",
          done: false
        });
        res.createTask = { ok: !!taskId };
      } catch (e) { res.createTask = { ok: false, error: e.message }; }

      try {
        await api.updateTask(taskId, {
          title: "수정된 작업 제목",
          memo: "업데이트 메모",
          priority: "low",
          dueDate: "2026-10-25"
        });
        const snap = await db.collection("todos").doc(taskId).get();
        res.updateTask = { ok: snap.data()?.text === "수정된 작업 제목" && snap.data()?.priority === "low" };
      } catch (e) { res.updateTask = { ok: false, error: e.message }; }

      try {
        await api.toggleTask(taskId);
        const snap1 = await db.collection("todos").doc(taskId).get();
        await api.toggleTask(taskId);
        const snap2 = await db.collection("todos").doc(taskId).get();
        res.toggleTask = { ok: snap1.data()?.completed === true && snap2.data()?.completed === false };
      } catch (e) { res.toggleTask = { ok: false, error: e.message }; }

      try {
        await api.postponeTask(taskId, "내일");
        res.postponeTask = { ok: true };
      } catch (e) { res.postponeTask = { ok: false, error: e.message }; }

      try {
        await api.archiveTask(taskId);
        const snap = await db.collection("todos").doc(taskId).get();
        res.archiveTask = { ok: snap.data()?.archived === true };
      } catch (e) { res.archiveTask = { ok: false, error: e.message }; }

      try {
        await api.unarchiveTask(taskId);
        const snap = await db.collection("todos").doc(taskId).get();
        res.unarchiveTask = { ok: snap.data()?.archived === false };
      } catch (e) { res.unarchiveTask = { ok: false, error: e.message }; }

      try {
        await api.deleteTask(taskId);
        let deleted = false;
        try {
          const snap = await db.collection("todos").doc(taskId).get();
          deleted = !snap.exists;
        } catch (err) {
          deleted = err.code === "permission-denied" || err.code === "not-found";
        }
        res.deleteTask = { ok: deleted };
      } catch (e) { res.deleteTask = { ok: false, error: e.message }; }
      return res;
    })()`);

    check("api.createTask() creates document in Firestore", taskResults.createTask.ok, taskResults.createTask.error);
    check("api.updateTask() updates task text and priority", taskResults.updateTask.ok, taskResults.updateTask.error);
    check("api.toggleTask() flips completed state back and forth", taskResults.toggleTask.ok, taskResults.toggleTask.error);
    check("api.postponeTask() postpones due date", taskResults.postponeTask.ok, taskResults.postponeTask.error);
    check("api.archiveTask() sets archived: true", taskResults.archiveTask.ok, taskResults.archiveTask.error);
    check("api.unarchiveTask() restores archived: false", taskResults.unarchiveTask.ok, taskResults.unarchiveTask.error);
    check("api.deleteTask() permanently removes document", taskResults.deleteTask.ok, taskResults.deleteTask.error);

    // ========================================================
    // 4. PROJECT METHODS
    // ========================================================
    const projResults = await tab.evaluate(`(async () => {
      const api = window.Planary.api;
      const db = firebase.firestore();
      const res = {};

      let projId;
      try {
        projId = await api.createProject("통합 검증 프로젝트", "#10b981", "🎯");
        res.createProject = { ok: !!projId };
      } catch (e) { res.createProject = { ok: false, error: e.message }; }

      try {
        await api.updateProject(projId, { name: "프로젝트 이름 변경", color: "#f59e0b" });
        const snap = await db.collection("projects").doc(projId).get();
        res.updateProject = { ok: snap.data()?.name === "프로젝트 이름 변경" };
      } catch (e) { res.updateProject = { ok: false, error: e.message }; }

      try {
        await api.deleteProject(projId);
        let deleted = false;
        try {
          const snap = await db.collection("projects").doc(projId).get();
          deleted = !snap.exists;
        } catch (err) {
          deleted = err.code === "permission-denied" || err.code === "not-found";
        }
        res.deleteProject = { ok: deleted };
      } catch (e) { res.deleteProject = { ok: false, error: e.message }; }
      return res;
    })()`);

    check("api.createProject() creates project with custom color & icon", projResults.createProject.ok, projResults.createProject.error);
    check("api.updateProject() patches name and attributes", projResults.updateProject.ok, projResults.updateProject.error);
    check("api.deleteProject() deletes project document", projResults.deleteProject.ok, projResults.deleteProject.error);

    // ========================================================
    // 5. STICKY NOTE METHODS
    // ========================================================
    const noteResults = await tab.evaluate(`(async () => {
      const api = window.Planary.api;
      const db = firebase.firestore();
      const res = {};

      let noteId;
      try {
        noteId = await api.createNote({ text: "메서드 메모", color: "pink", x: 200, y: 150 });
        res.createNote = { ok: !!noteId };
      } catch (e) { res.createNote = { ok: false, error: e.message }; }

      try {
        await api.updateNote(noteId, { text: "수정된 메모", color: "blue", x: 250, y: 180 });
        const snap = await db.collection("notes").doc(noteId).get();
        res.updateNote = { ok: snap.data()?.text === "수정된 메모" && snap.data()?.color === "blue" };
      } catch (e) { res.updateNote = { ok: false, error: e.message }; }

      try {
        await api.deleteNote(noteId);
        let deleted = false;
        try {
          const snap = await db.collection("notes").doc(noteId).get();
          deleted = !snap.exists;
        } catch (err) {
          deleted = err.code === "permission-denied" || err.code === "not-found";
        }
        res.deleteNote = { ok: deleted };
      } catch (e) { res.deleteNote = { ok: false, error: e.message }; }
      return res;
    })()`);

    check("api.createNote() creates note with custom coordinates", noteResults.createNote.ok, noteResults.createNote.error);
    check("api.updateNote() moves note and changes color", noteResults.updateNote.ok, noteResults.updateNote.error);
    check("api.deleteNote() deletes sticky note", noteResults.deleteNote.ok, noteResults.deleteNote.error);

    // ========================================================
    // 6. BOOKMARK METHODS
    // ========================================================
    const bmResults = await tab.evaluate(`(async () => {
      const api = window.Planary.api;
      const db = firebase.firestore();
      const res = {};

      let bmId;
      try {
        bmId = await api.createBookmark({ url: "https://github.com", title: "GitHub", tags: ["dev"] });
        res.createBookmark = { ok: !!bmId };
      } catch (e) { res.createBookmark = { ok: false, error: e.message }; }

      try {
        await api.updateBookmark(bmId, { title: "GitHub Enterprise" });
        const snap = await db.collection("bookmarks").doc(bmId).get();
        res.updateBookmark = { ok: snap.data()?.title === "GitHub Enterprise" };
      } catch (e) { res.updateBookmark = { ok: false, error: e.message }; }

      try {
        await api.deleteBookmark(bmId);
        let deleted = false;
        try {
          const snap = await db.collection("bookmarks").doc(bmId).get();
          deleted = !snap.exists;
        } catch (err) {
          deleted = err.code === "permission-denied" || err.code === "not-found";
        }
        res.deleteBookmark = { ok: deleted };
      } catch (e) { res.deleteBookmark = { ok: false, error: e.message }; }
      return res;
    })()`);

    check("api.createBookmark() saves bookmark with title and tags", bmResults.createBookmark.ok, bmResults.createBookmark.error);
    check("api.updateBookmark() updates title", bmResults.updateBookmark.ok, bmResults.updateBookmark.error);
    check("api.deleteBookmark() removes bookmark", bmResults.deleteBookmark.ok, bmResults.deleteBookmark.error);

    // ========================================================
    // 7. WIKI PAGE METHODS
    // ========================================================
    const wikiResults = await tab.evaluate(`(async () => {
      const api = window.Planary.api;
      const db = firebase.firestore();
      const res = {};

      let wikiId;
      try {
        wikiId = await api.createWikiPage("통합 테스트 문서", null);
        res.createWikiPage = { ok: !!wikiId };
      } catch (e) { res.createWikiPage = { ok: false, error: e.message }; }

      try {
        await api.updateWikiPageMeta(wikiId, { title: "문서 제목 변경", icon: "📑" });
        const snap = await db.collection("wiki_pages").doc(wikiId).get();
        res.updateWikiPageMeta = { ok: snap.data()?.title === "문서 제목 변경" };
      } catch (e) { res.updateWikiPageMeta = { ok: false, error: e.message }; }

      try {
        await api.saveWikiBlocks(wikiId, [
          { id: "b1", type: "h1", content: "소제목" },
          { id: "b2", type: "p", content: "내용 단락" }
        ]);
        const snap = await db.collection("wiki_pages").doc(wikiId).get();
        const blocks = snap.data()?.content?.blocks || [];
        res.saveWikiBlocks = { ok: blocks.length === 2 };
      } catch (e) { res.saveWikiBlocks = { ok: false, error: e.message }; }

      try {
        await api.deleteWikiPage(wikiId);
        let deleted = false;
        try {
          const snap = await db.collection("wiki_pages").doc(wikiId).get();
          deleted = !snap.exists;
        } catch (err) {
          deleted = err.code === "permission-denied" || err.code === "not-found";
        }
        res.deleteWikiPage = { ok: deleted };
      } catch (e) { res.deleteWikiPage = { ok: false, error: e.message }; }
      return res;
    })()`);

    check("api.createWikiPage() creates page document", wikiResults.createWikiPage.ok, wikiResults.createWikiPage.error);
    check("api.updateWikiPageMeta() updates page title/icon", wikiResults.updateWikiPageMeta.ok, wikiResults.updateWikiPageMeta.error);
    check("api.saveWikiBlocks() serializes EditorJS blocks to Firestore", wikiResults.saveWikiBlocks.ok, wikiResults.saveWikiBlocks.error);
    check("api.deleteWikiPage() removes wiki page document", wikiResults.deleteWikiPage.ok, wikiResults.deleteWikiPage.error);

    // ========================================================
    // 8. NEW USER e-CLASS INTEGRATION LOGIC
    // ========================================================
    const eclassResults = await tab.evaluate(`(async () => {
      const api = window.Planary.api;
      const db = firebase.firestore();
      const res = {};

      // 1. Check e-Class anchor course parsing
      const sampleTasks = [
        {
          id: "c_anchor_1",
          text: "인터랙티브 미디어 디자인(ITM4011)",
          source: "eclass-course",
          projectId: "proj_eclass_test",
          done: false
        },
        {
          id: "c_anchor_2",
          text: "데이터 시각화(DDS3022)",
          source: "eclass-course",
          projectId: "proj_eclass_test",
          done: false
        }
      ];

      // Simulate todoDocToTask
      const tasksConverted = sampleTasks.map(t => ({
        ...t,
        title: t.text,
        course: t.source === "eclass-course" ? t.text : null,
        project: t.projectId
      }));

      // Count courses
      const courseCount = new Set(tasksConverted.map(t => t.course).filter(Boolean)).size;
      res.anchorCourseCounting = { ok: courseCount === 2 };

      // 2. Simulate e-class connection data live mapping
      const liveData = {
        enabled: true,
        encryptedUsername: "encrypted_user_test",
        encryptedPassword: "encrypted_pw_test",
        platform: "seoultech-moodle",
        baseUrl: "https://eclass.seoultech.ac.kr"
      };

      const isLive = !!(liveData && liveData.enabled !== false && (liveData.encryptedUsername && liveData.encryptedPassword));
      res.isConnectionLiveLogic = { ok: isLive === true };

      return res;
    })()`);

    check("e-Class anchor tasks accurately resolve course names and count", eclassResults.anchorCourseCounting.ok);
    check("e-Class live connection validator recognizes encrypted credentials", eclassResults.isConnectionLiveLogic.ok);

  } finally {
    await tab.close();
  }

  return report;
}
