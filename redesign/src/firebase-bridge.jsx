/* Planary — Firebase ↔ Redesign bridge.

   Replaces the mock data in data.jsx with live Firestore reads while
   reusing the redesign's existing event API (planary:create-task,
   planary:edit-task, planary:toggle-task, etc.).

   Load order (see index.html): data → icons → i18n → components →
   pages → app → firebase-bridge. The bridge attaches AFTER the React
   app mounts; on Firestore snapshots it dispatches `planary:*-loaded`
   events which App listens to and pipes into useState.

   If Firebase is unavailable (CDN blocked, local prototype) the bridge
   no-ops and the mock data stays in place.
*/

(function () {
  if (typeof firebase === "undefined" || !firebase.firestore) {
    console.info("[Planary] Firebase SDK not detected — bridge inactive, using mock data.");
    return;
  }

  const auth = firebase.auth();
  const db = firebase.firestore();

  // ────────────────────────────────────────────────────────────────────
  // Field mappings
  // ────────────────────────────────────────────────────────────────────

  const PRIORITY_TO_UI = { low: "low", medium: "med", high: "high" };
  const PRIORITY_TO_DB = { low: "low", med: "medium", high: "high" };

  const todayISO = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  };
  const tomorrowISO = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  };

  function deriveTime(dueDate, dueTime) {
    if (!dueDate) return null;
    const t = todayISO();
    const tm = tomorrowISO();
    if (dueDate === t) return dueTime ? `오늘 ${dueTime}` : "오늘";
    if (dueDate === tm) return "내일";
    try {
      const d = new Date(dueDate);
      const today = new Date(t);
      const diff = Math.round((d - today) / 86400000);
      if (diff < 0) return "어제"; // overdue
      if (diff < 7) {
        const days = ["일","월","화","수","목","금","토"];
        return days[d.getDay()] + "요일";
      }
      return d.toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
    } catch (e) {
      return dueDate;
    }
  }

  function todoDocToTask(doc) {
    const d = doc.data() || {};
    return {
      id: doc.id,
      title: d.text || "",
      memo: d.memo || null,
      priority: PRIORITY_TO_UI[d.priority] || "med",
      due: d.dueTime || null,
      time: deriveTime(d.dueDate, d.dueTime),
      project: d.projectId || null,
      reminder: !!(d.calendarReminderMinutes || (d.calendarReminderMinutesList && d.calendarReminderMinutesList.length)),
      done: !!d.completed,
      archived: !!d.archived,
      tags: d.courseTitle ? [d.courseTitle] : [],
      source: d.source || null,
      sourceUrl: d.sourceUrl || null,
      course: d.courseTitle || null,
      imageUrl: d.imageUrl || null,
      orderIndex: d.orderIndex ?? 0,
      _raw: d,
    };
  }

  function taskToTodoDoc(uid, task, existing) {
    // Convert UI time label back to a dueDate (best effort)
    let dueDate = task.dueDate ?? null;
    if (!dueDate && task.time) {
      if (task.time.startsWith("오늘")) dueDate = todayISO();
      else if (task.time === "내일") dueDate = tomorrowISO();
    }
    const payload = {
      uid,
      text: (task.title || "").trim() || "(제목 없음)",
      memo: task.memo || null,
      dueDate,
      dueTime: task.due || null,
      priority: PRIORITY_TO_DB[task.priority] || "medium",
      projectId: task.project || null,
      imageUrl: task.imageUrl || null,
      completed: !!task.done,
      archived: !!task.archived,
      orderIndex: typeof task.orderIndex === "number" ? task.orderIndex : 0,
      createdAt: (existing && existing.createdAt) || firebase.firestore.FieldValue.serverTimestamp(),
    };
    // Preserve e-Class fields if they were on the existing doc
    if (existing) {
      ["source", "sourceItemId", "sourceUrl", "courseTitle", "ddayText", "syncedAt", "calendarEventId", "calendarReminderMinutes", "calendarReminderMinutesList", "syncCalendar", "remindersSent"].forEach(k => {
        if (existing[k] !== undefined) payload[k] = existing[k];
      });
    }
    return payload;
  }

  function noteDocToNote(doc, index = 0) {
    const d = doc.data() || {};
    const created = d.createdAt && d.createdAt.toDate ? d.createdAt.toDate() : null;
    const date = created
      ? (() => {
          const diff = (Date.now() - created.getTime()) / 86400000;
          if (diff < 1) return "오늘";
          if (diff < 2) return "어제";
          if (diff < 7) return Math.round(diff) + "일 전";
          return created.toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
        })()
      : "방금";
    return {
      id: doc.id,
      text: d.text || "",
      color: d.color || "yellow",
      x: typeof d.x === "number" ? d.x : 60 + (index % 4) * 220,
      y: typeof d.y === "number" ? d.y : 60 + Math.floor(index / 4) * 180,
      date,
      rot: ((index * 17) % 7 - 3) * 0.6,
      archived: !!d.archived,
    };
  }

  function projectDocToProject(doc, tasks) {
    const d = doc.data() || {};
    const projectTasks = tasks.filter(t => t.project === doc.id);
    const completed = projectTasks.filter(t => t.done).length;
    const progress = projectTasks.length ? Math.round((completed / projectTasks.length) * 100) : 0;
    return {
      id: doc.id,
      name: d.name || "(이름 없음)",
      color: d.color || "#7f0df2",
      icon: d.icon || "📁",
      progress,
      members: [{ name: "나", avatar: null }],
      deadline: null,
      isEclass: false,
    };
  }

  function bookmarkDocToBookmark(doc) {
    const d = doc.data() || {};
    let host = d.url || "";
    try { host = new URL(d.url).hostname.replace(/^www\./, ""); } catch (e) {}
    const title = d.title || host.split(".")[0];
    const letter = (title || "?")[0].toUpperCase();
    const palette = ["#7f0df2", "#2563eb", "#10b981", "#f59e0b", "#e11d48", "#0ea5e9"];
    const color = palette[(letter.charCodeAt(0) || 0) % palette.length];
    return {
      id: doc.id,
      title,
      url: d.url || "",
      color,
      letter,
      tags: Array.isArray(d.tags) ? d.tags : [],
    };
  }

  // ────────────────────────────────────────────────────────────────────
  // Public API exposed on window.Planary.api
  // ────────────────────────────────────────────────────────────────────

  const api = {
    uid: null,
    user: null,

    async createTask(task) {
      if (!this.uid) return null;
      const payload = taskToTodoDoc(this.uid, task);
      const ref = await db.collection("todos").add(payload);
      return ref.id;
    },
    async updateTask(id, task) {
      if (!this.uid) return;
      const existing = (await db.collection("todos").doc(id).get()).data() || {};
      const payload = taskToTodoDoc(this.uid, task, existing);
      await db.collection("todos").doc(id).set(payload);
    },
    async toggleTask(id) {
      if (!this.uid) return;
      const snap = await db.collection("todos").doc(id).get();
      const data = snap.data();
      if (!data) return;
      await db.collection("todos").doc(id).update({ completed: !data.completed });
    },
    async deleteTask(id) {
      if (!this.uid) return;
      await db.collection("todos").doc(id).delete();
    },
    async postponeTask(id, timeLabel) {
      if (!this.uid) return;
      let dueDate = null;
      if (timeLabel === "오늘" || timeLabel.startsWith("오늘")) dueDate = todayISO();
      else if (timeLabel === "내일") dueDate = tomorrowISO();
      await db.collection("todos").doc(id).update({ dueDate });
    },

    async createNote(note) {
      if (!this.uid) return null;
      const ref = await db.collection("notes").add({
        uid: this.uid,
        text: (note.text || "").trim() || "(빈 메모)",
        color: note.color || "yellow",
        x: typeof note.x === "number" ? note.x : 80,
        y: typeof note.y === "number" ? note.y : 80,
        archived: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      return ref.id;
    },
    async updateNote(id, patch) {
      if (!this.uid) return;
      const snap = await db.collection("notes").doc(id).get();
      const data = snap.data();
      if (!data) return;
      const next = {
        uid: this.uid,
        text: patch.text ?? data.text,
        color: patch.color ?? data.color,
        x: typeof patch.x === "number" ? patch.x : data.x,
        y: typeof patch.y === "number" ? patch.y : data.y,
        archived: patch.archived ?? data.archived ?? false,
        createdAt: data.createdAt || firebase.firestore.FieldValue.serverTimestamp(),
      };
      await db.collection("notes").doc(id).set(next);
    },
    async deleteNote(id) {
      if (!this.uid) return;
      await db.collection("notes").doc(id).delete();
    },

    async createBookmark(bm) {
      if (!this.uid) return null;
      let url = (bm.url || "").trim();
      if (!url) return null;
      if (!/^https?:\/\//i.test(url)) url = "https://" + url;
      let host = url;
      try { host = new URL(url).hostname.replace(/^www\./, ""); } catch (e) {}
      const ref = await db.collection("bookmarks").add({
        uid: this.uid,
        url,
        title: bm.title || host.split(".")[0],
        tags: Array.isArray(bm.tags) ? bm.tags : [],
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      return ref.id;
    },
    async deleteBookmark(id) {
      if (!this.uid) return;
      await db.collection("bookmarks").doc(id).delete();
    },

    async createProject(name, color = "#7f0df2") {
      if (!this.uid) return null;
      const ref = await db.collection("projects").add({
        uid: this.uid,
        name: name.trim() || "새 프로젝트",
        color,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      return ref.id;
    },
  };

  window.Planary = window.Planary || {};
  window.Planary.api = api;

  // ────────────────────────────────────────────────────────────────────
  // Auth + Firestore listeners
  // ────────────────────────────────────────────────────────────────────

  let unsubs = [];
  const unsubAll = () => { unsubs.forEach(fn => { try { fn(); } catch (e) {} }); unsubs = []; };

  let latestTasks = [];

  auth.onAuthStateChanged((user) => {
    unsubAll();
    if (!user) {
      api.uid = null;
      api.user = null;
      window.dispatchEvent(new CustomEvent("planary:auth-changed", { detail: null }));
      return;
    }
    api.uid = user.uid;
    api.user = {
      name: user.displayName || (user.email || "").split("@")[0] || "사용자",
      email: user.email || "",
      avatar: user.photoURL || null,
      handle: user.email || "",
      school: "",
      studentId: "",
      bio: "",
    };
    // Update USER mock so existing components pick it up on next render
    window.Planary.USER = api.user;
    window.dispatchEvent(new CustomEvent("planary:auth-changed", { detail: api.user }));

    // Tasks
    unsubs.push(
      db.collection("todos").where("uid", "==", user.uid).onSnapshot(
        (snap) => {
          const tasks = snap.docs.map(todoDocToTask).filter(t => !t.archived);
          latestTasks = tasks;
          window.Planary.TASKS = tasks;
          window.dispatchEvent(new CustomEvent("planary:tasks-loaded", { detail: tasks }));
          // Re-emit projects so progress numbers refresh
          window.dispatchEvent(new CustomEvent("planary:tasks-changed-for-projects"));
        },
        (err) => console.error("[Planary] todos snapshot error:", err)
      )
    );

    // Notes (post-its)
    unsubs.push(
      db.collection("notes").where("uid", "==", user.uid).onSnapshot(
        (snap) => {
          const notes = snap.docs.map((d, i) => noteDocToNote(d, i)).filter(n => !n.archived);
          window.Planary.NOTES = notes;
          window.dispatchEvent(new CustomEvent("planary:notes-loaded", { detail: notes }));
          window.dispatchEvent(new CustomEvent("planary:notes-changed", { detail: notes }));
        },
        (err) => console.error("[Planary] notes snapshot error:", err)
      )
    );

    // Projects
    unsubs.push(
      db.collection("projects").where("uid", "==", user.uid).onSnapshot(
        (snap) => {
          const projects = snap.docs.map(d => projectDocToProject(d, latestTasks));
          window.Planary.PROJECTS = projects;
          window.dispatchEvent(new CustomEvent("planary:projects-loaded", { detail: projects }));
        },
        (err) => console.error("[Planary] projects snapshot error:", err)
      )
    );

    // Bookmarks
    unsubs.push(
      db.collection("bookmarks").where("uid", "==", user.uid).onSnapshot(
        (snap) => {
          const bookmarks = snap.docs.map(bookmarkDocToBookmark);
          window.Planary.BOOKMARKS = bookmarks;
          window.dispatchEvent(new CustomEvent("planary:bookmarks-loaded", { detail: bookmarks }));
        },
        (err) => console.error("[Planary] bookmarks snapshot error:", err)
      )
    );
  });

  // ────────────────────────────────────────────────────────────────────
  // Write-side: hook the existing UI events so user actions persist
  // ────────────────────────────────────────────────────────────────────

  window.addEventListener("planary:create-task", (e) => {
    const task = e.detail;
    if (!task) return;
    api.createTask(task).catch(err => {
      console.error("[Planary] create-task failed:", err);
      window.Planary?.toast?.({ type: "err", title: "작업 추가 실패", sub: err.message });
    });
  });

  window.addEventListener("planary:toggle-task", (e) => {
    const id = e.detail;
    if (!id || typeof id !== "string") return;
    api.toggleTask(id).catch(err => console.error("[Planary] toggle-task failed:", err));
  });

  window.addEventListener("planary:save-task", (e) => {
    const task = e.detail;
    if (!task || !task.id) return;
    api.updateTask(task.id, task).catch(err => {
      console.error("[Planary] save-task failed:", err);
      window.Planary?.toast?.({ type: "err", title: "저장 실패", sub: err.message });
    });
  });

  window.addEventListener("planary:delete-task", (e) => {
    const id = e.detail;
    if (!id) return;
    api.deleteTask(id).catch(err => console.error("[Planary] delete-task failed:", err));
  });

  window.addEventListener("planary:postpone-task", (e) => {
    const { id, time } = e.detail || {};
    if (!id || !time) return;
    api.postponeTask(id, time).catch(err => console.error("[Planary] postpone failed:", err));
  });

  console.info("[Planary] Firebase bridge ready.");
})();
