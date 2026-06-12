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
  const localISODate = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const dateFromBackendValue = (value) => {
    if (!value) return null;
    const d = value && typeof value.toDate === "function" ? value.toDate() : new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const memberSinceText = (user, userDoc = null) => {
    const joined = dateFromBackendValue(userDoc?.createdAt) || dateFromBackendValue(user?.metadata?.creationTime);
    if (!joined) return "";
    const start = new Date(joined);
    const today = new Date();
    start.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const days = Math.max(1, Math.floor((today - start) / 86400000) + 1);
    return `가입 ${days}일째`;
  };
  const tomorrowISO = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  };
  const offsetISO = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  };
  const monthLaterISO = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
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
    const reminderList = Array.isArray(d.calendarReminderMinutesList) && d.calendarReminderMinutesList.length
      ? d.calendarReminderMinutesList
      : (Number.isFinite(d.calendarReminderMinutes) ? [d.calendarReminderMinutes] : []);
    return {
      id: doc.id,
      title: d.text || "",
      memo: d.memo || null,
      priority: PRIORITY_TO_UI[d.priority] || "med",
      due: d.dueTime || null,
      dueDate: d.dueDate || null,
      time: deriveTime(d.dueDate, d.dueTime),
      project: d.projectId || null,
      reminder: reminderList.length > 0,
      calendarReminderMinutes: reminderList[0] ?? null,
      calendarReminderMinutesList: reminderList,
      done: !!d.completed,
      completedAt: d.completedAt || null,
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
      else if (task.time === "모레") dueDate = offsetISO(2);
      else if (task.time === "1주일 뒤") dueDate = offsetISO(7);
      else if (task.time === "한 달 뒤") dueDate = monthLaterISO();
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
      completedAt: task.done ? ((existing && existing.completedAt) || firebase.firestore.FieldValue.serverTimestamp()) : null,
      archived: !!task.archived,
      completedDate: task.done ? ((existing && existing.completedDate) || localISODate()) : null,
      orderIndex: typeof task.orderIndex === "number" ? task.orderIndex : 0,
      createdAt: (existing && existing.createdAt) || firebase.firestore.FieldValue.serverTimestamp(),
    };
    const hasReminderInput = Array.isArray(task.calendarReminderMinutesList) || task.calendarReminderMinutes !== undefined || task.reminder !== undefined;
    if (hasReminderInput) {
      const rawReminders = Array.isArray(task.calendarReminderMinutesList)
        ? task.calendarReminderMinutesList
        : (task.calendarReminderMinutes == null ? [] : [task.calendarReminderMinutes]);
      const reminderList = [...new Set(rawReminders.map(Number).filter(value => Number.isFinite(value) && value >= 0))].sort((a, b) => b - a);
      payload.calendarReminderMinutes = reminderList[0] ?? null;
      payload.calendarReminderMinutesList = reminderList;
    }
    // Preserve e-Class fields if they were on the existing doc
    if (existing) {
      ["source", "sourceItemId", "sourceUrl", "courseTitle", "ddayText", "syncedAt", "calendarEventId", "calendarReminderMinutes", "calendarReminderMinutesList", "syncCalendar", "remindersSent"].forEach(k => {
        if (payload[k] === undefined && existing[k] !== undefined) payload[k] = existing[k];
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

  function formatRelativeKo(ts) {
    if (!ts) return "방금";
    const ms = ts && ts.toMillis ? ts.toMillis() : (ts.seconds ? ts.seconds * 1000 : Number(ts));
    if (!Number.isFinite(ms)) return "방금";
    const diff = Math.max(0, Date.now() - ms);
    if (diff < 60_000) return "방금";
    if (diff < 3_600_000) return `${Math.round(diff / 60_000)}분 전`;
    if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}시간 전`;
    return `${Math.round(diff / 86_400_000)}일 전`;
  }

  function projectDocToProject(doc, tasks) {
    const d = doc.data() || {};
    const isEclass = d.source === "eclass";
    const projectTasks = tasks.filter(t => t.project === doc.id && !t.archived);
    const completed = projectTasks.filter(t => t.done).length;
    const progress = projectTasks.length ? Math.round((completed / projectTasks.length) * 100) : 0;
    const courseCount = new Set(
      projectTasks
        .map(t => t.course || (t._raw && t._raw.courseTitle))
        .filter(Boolean)
    ).size;
    const conn = window.Planary && window.Planary.ECLASS_CONNECTION;
    return {
      id: doc.id,
      name: d.name || "(이름 없음)",
      color: d.color || "#7f0df2",
      icon: d.icon === "eclass" ? "🎓" : (d.icon || "📁"),
      progress,
      members: [{ name: "나", avatar: null }],
      deadline: null,
      isEclass,
      ...(isEclass ? {
        courses: courseCount,
        lastSync: formatRelativeKo(conn && conn.lastSyncedAt),
        school: (window.Planary && window.Planary.USER && window.Planary.USER.school) || "SeoulTech",
      } : {}),
    };
  }

  // ────────────────────────────────────────────────────────────────────
  // Wiki block transforms (Editor.js ⇄ redesign blocks)
  // Legacy app stores content as { time, blocks: [{type,data}], version }.
  // ────────────────────────────────────────────────────────────────────

  function decodeEditorJSBlock(b) {
    const d = b.data || {};
    const id = b.id || ("b" + Math.random().toString(36).slice(2, 10));
    switch (b.type) {
      case "paragraph":
        return { id, type: "p", content: d.text || "" };
      case "header": {
        const lvl = Math.min(3, Math.max(1, Number(d.level) || 2));
        return { id, type: "h" + lvl, content: d.text || "" };
      }
      case "quote":
        return { id, type: "quote", content: d.text || "" };
      case "delimiter":
        return { id, type: "divider" };
      case "list": {
        const t = d.style === "ordered" ? "ol" : "ul";
        return { id, type: t, items: (d.items || []).map(it => (typeof it === "string" ? it : (it.content || ""))) };
      }
      case "checklist":
        return {
          id, type: "todo",
          items: (d.items || []).map(it => ({ text: it.text || "", checked: !!it.checked })),
        };
      case "code":
        return { id, type: "code", content: d.code || "", language: d.language || "plain" };
      case "math":
      case "latex":
        return { id, type: "math", content: d.formula || d.text || "" };
      case "table":
        return { id, type: "table", rows: Array.isArray(d.content) ? d.content : [] };
      case "image":
        return { id, type: "image", url: (d.file && d.file.url) || d.url || "", caption: d.caption || "" };
      case "attaches":
      case "attach":
        return { id, type: "attach", url: (d.file && d.file.url) || "", name: (d.file && d.file.name) || d.title || "" };
      case "linkTool":
      case "link":
      case "bookmark":
        return {
          id, type: "link",
          url: d.link || d.url || "",
          title: (d.meta && d.meta.title) || d.title || "",
          description: (d.meta && d.meta.description) || d.description || "",
        };
      case "callout":
        return {
          id, type: "callout",
          variant: d.type || d.variant || "ok",
          title: d.title || "포인트",
          body: d.text || d.body || "",
        };
      default:
        // Unknown: keep as paragraph so it stays editable but doesn't crash.
        return { id, type: "p", content: typeof d.text === "string" ? d.text : "" };
    }
  }

  function encodeEditorJSBlock(b) {
    const id = b.id;
    switch (b.type) {
      case "p":      return { id, type: "paragraph", data: { text: b.content || "" } };
      case "h1":     return { id, type: "header",    data: { text: b.content || "", level: 1 } };
      case "h2":     return { id, type: "header",    data: { text: b.content || "", level: 2 } };
      case "h3":     return { id, type: "header",    data: { text: b.content || "", level: 3 } };
      case "quote":  return { id, type: "quote",     data: { text: b.content || "", caption: "", alignment: "left" } };
      case "divider":return { id, type: "delimiter", data: {} };
      case "ul":     return { id, type: "list",      data: { style: "unordered", items: b.items || [] } };
      case "ol":     return { id, type: "list",      data: { style: "ordered",   items: b.items || [] } };
      case "todo":   return { id, type: "checklist", data: { items: (b.items || []).map(it => ({ text: it.text || "", checked: !!(it.checked ?? it.done) })) } };
      case "code":   return { id, type: "code",      data: { code: b.content || "", language: b.language || "plain" } };
      case "math":   return { id, type: "math",      data: { formula: b.content || "" } };
      case "table":  return { id, type: "table",     data: { content: b.rows || [], withHeadings: false } };
      case "image":  return { id, type: "image",     data: { file: { url: b.url || "" }, caption: b.caption || "" } };
      case "attach": return { id, type: "attaches",  data: { file: { url: b.url || "", name: b.name || "" } } };
      case "link":   return { id, type: "linkTool",  data: { link: b.url || "", meta: { title: b.title || "", description: b.description || "" } } };
      case "callout":return { id, type: "callout",   data: { type: b.variant || "ok", title: b.title || "", text: b.body || "" } };
      default:       return { id, type: "paragraph", data: { text: typeof b.content === "string" ? b.content : "" } };
    }
  }

  function wikiPageDocToEntry(doc) {
    const d = doc.data() || {};
    const blocksRaw = (d.content && Array.isArray(d.content.blocks)) ? d.content.blocks : [];
    const blocks = blocksRaw.length
      ? blocksRaw.map(decodeEditorJSBlock)
      : [{ id: "b" + Math.random().toString(36).slice(2, 8), type: "p", content: "" }];
    return {
      id: doc.id,
      title: d.title || "(제목 없음)",
      parent: d.parentId || null,
      icon: d.icon || "📄",
      cover: d.coverUrl || null,
      coverPosX: typeof d.coverPositionX === "number" ? d.coverPositionX : 50,
      coverPosY: typeof d.coverPosition === "number" ? d.coverPosition : 50,
      coverHeight: typeof d.coverHeight === "number" ? d.coverHeight : 180,
      coverZoom: typeof d.coverZoom === "number" ? d.coverZoom : 100,
      projectId: d.projectId || null,
      tags: Array.isArray(d.tags) ? d.tags : [],
      blocks,
      orderIndex: typeof d.orderIndex === "number" ? d.orderIndex : 0,
      createdAt: d.createdAt && d.createdAt.toMillis ? d.createdAt.toMillis() : 0,
      updatedAt: d.updatedAt && d.updatedAt.toMillis ? d.updatedAt.toMillis() : 0,
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

    async authHeaders() {
      const user = auth.currentUser;
      if (!user) throw new Error("로그인이 필요합니다.");
      return {
        Authorization: `Bearer ${await user.getIdToken()}`,
        "Content-Type": "application/json",
      };
    },

    async updateProfile(profile) {
      const user = auth.currentUser;
      if (!user || !this.uid) return;
      const name = (profile.name || "").trim() || user.displayName || "사용자";
      const avatar = profile.avatar || null;
      const photoURL = avatar && /^url\(".*"\)$/.test(avatar) ? avatar.slice(5, -2) : avatar;
      await user.updateProfile({ displayName: name, photoURL: photoURL || null });
      await db.collection("users").doc(this.uid).set({
        uid: this.uid,
        email: user.email || "",
        displayName: name,
        photoURL: photoURL || null,
        school: profile.school || null,
        studentId: profile.studentId || null,
        bio: profile.bio || null,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      this.user = { ...this.user, ...profile, name, avatar, initials: name.slice(0, 1).toUpperCase() };
      window.Planary.USER = this.user;
      window.dispatchEvent(new CustomEvent("planary:auth-changed", { detail: this.user }));
    },

    async signOut() {
      await auth.signOut();
    },

    async changePassword(current, next) {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error("로그인이 필요합니다.");
      const credential = firebase.auth.EmailAuthProvider.credential(user.email, current);
      await user.reauthenticateWithCredential(credential);
      await user.updatePassword(next);
    },

    async deleteAccount() {
      const response = await fetch("/api/account/delete-data", {
        method: "POST",
        headers: await this.authHeaders(),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      const user = auth.currentUser;
      if (user) await user.delete();
    },

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
      const completed = !data.completed;
      await db.collection("todos").doc(id).update({
        completed,
        completedAt: completed ? firebase.firestore.FieldValue.serverTimestamp() : null,
        completedDate: completed ? localISODate() : null,
      });
    },
    async deleteTask(id) {
      if (!this.uid) return;
      await db.collection("todos").doc(id).delete();
    },
    async archiveTask(id) {
      if (!this.uid) return;
      await db.collection("todos").doc(id).update({ archived: true });
    },
    async unarchiveTask(id) {
      if (!this.uid) return;
      await db.collection("todos").doc(id).update({ archived: false });
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
      const docData = {
        uid: this.uid,
        text: (note.text || "").trim() || "(빈 메모)",
        color: note.color || "yellow",
        x: typeof note.x === "number" ? note.x : 80,
        y: typeof note.y === "number" ? note.y : 80,
        archived: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      };
      if (note.id) {
        await db.collection("notes").doc(note.id).set(docData);
        return note.id;
      }
      const ref = await db.collection("notes").add(docData);
      return ref.id;
    },
    async updateNote(id, patch) {
      if (!this.uid) return;
      const updates = {};
      if (patch.text !== undefined) updates.text = patch.text;
      if (patch.color !== undefined) updates.color = patch.color;
      if (typeof patch.x === "number") updates.x = patch.x;
      if (typeof patch.y === "number") updates.y = patch.y;
      if (patch.archived !== undefined) updates.archived = patch.archived;
      if (typeof patch.rot === "number") updates.rot = patch.rot;
      if (!Object.keys(updates).length) return;
      await db.collection("notes").doc(id).set(updates, { merge: true });
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
    async updateBookmark(id, patch) {
      if (!this.uid) return;
      const allowed = {};
      if (patch.title !== undefined) allowed.title = patch.title || null;
      if (patch.tags !== undefined) allowed.tags = Array.isArray(patch.tags) ? patch.tags : [];
      await db.collection("bookmarks").doc(id).update(allowed);
    },

    async createProject(name, color = "#7f0df2", icon = "📁") {
      if (!this.uid) return null;
      const ref = await db.collection("projects").add({
        uid: this.uid,
        name: name.trim() || "새 프로젝트",
        color,
        icon,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      return ref.id;
    },
    async updateProject(id, patch) {
      if (!this.uid) return;
      const allowed = {};
      ["name", "color", "icon"].forEach(k => {
        if (patch[k] !== undefined) allowed[k] = patch[k];
      });
      await db.collection("projects").doc(id).update(allowed);
    },
    async deleteProject(id) {
      if (!this.uid) return;
      await db.collection("projects").doc(id).delete();
    },

    async savePreferences(patch) {
      if (!this.uid) return;
      const ref = db.collection("users").doc(this.uid);
      const updates = { updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
      for (const [key, val] of Object.entries(patch || {})) {
        updates[`preferences.${key}`] = val;
      }
      try {
        await ref.update(updates);
      } catch (err) {
        if (err.code === "not-found") {
          await ref.set({ uid: this.uid, preferences: patch || {}, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
        } else throw err;
      }
    },
    async saveNotifPrefs(patch) {
      if (!this.uid) return;
      const dotPatch = {};
      Object.entries(patch || {}).forEach(([k, v]) => { dotPatch[`notifPrefs.${k}`] = v; });
      dotPatch.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
      const ref = db.collection("users").doc(this.uid);
      try {
        await ref.update(dotPatch);
      } catch (err) {
        if (err.code === "not-found") {
          await ref.set({ uid: this.uid, notifPrefs: patch || {}, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
        } else throw err;
      }
    },
    async saveOnboarding({ progress, currentStep, completed }) {
      if (!this.uid) return;
      const payload = {
        uid: this.uid,
        onboardingProgress: progress,
        onboardingCurrentStep: currentStep || null,
        onboardingCompleted: !!completed,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      };
      if (completed) payload.onboardingCompletedAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection("users").doc(this.uid).set(payload, { merge: true });
    },

    async getEclassConnection() {
      const response = await fetch("/api/eclass/connection", { headers: await this.authHeaders() });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      return data;
    },
    async connectEclass({ url, id, password }) {
      const response = await fetch("/api/eclass/connection", {
        method: "POST",
        headers: await this.authHeaders(),
        body: JSON.stringify({ baseUrl: url, username: id, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      return data;
    },
    async disconnectEclass() {
      const response = await fetch("/api/eclass/connection", {
        method: "DELETE",
        headers: await this.authHeaders(),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${response.status}`);
      }
    },
    async triggerEclassSync() {
      const response = await fetch("/api/eclass/sync", {
        method: "POST",
        headers: await this.authHeaders(),
        body: JSON.stringify({ uid: this.uid }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      return data;
    },

    async createWikiPage(title = "새 페이지", parentId = null, clientId = null) {
      if (!this.uid) return null;
      const payload = {
        uid: this.uid,
        title,
        parentId,
        projectId: null,
        content: { time: Date.now(), blocks: [], version: "redesign-v1" },
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      };
      const ref = clientId
        ? db.collection("wiki_pages").doc(clientId)
        : db.collection("wiki_pages").doc();
      await ref.set(payload);
      return ref.id;
    },
    async updateWikiPageMeta(id, patch) {
      if (!this.uid) return;
      const allowed = {};
      ["title", "parentId", "projectId", "icon", "coverUrl", "coverPosition", "coverPositionX", "coverHeight", "coverZoom", "coverCropMode", "tags", "orderIndex"].forEach(k => {
        if (patch[k] !== undefined) allowed[k] = patch[k];
      });
      allowed.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection("wiki_pages").doc(id).set(allowed, { merge: true });
    },
    async saveWikiBlocks(id, blocks) {
      if (!this.uid) return;
      const encoded = (blocks || []).map(encodeEditorJSBlock);
      const now = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection("wiki_pages").doc(id).update({
        content: { time: Date.now(), blocks: encoded, version: "redesign-v1" },
        updatedAt: now,
      });
      // Save a revision snapshot (latest 50 kept)
      const user = auth.currentUser;
      const authorName = (user && (user.displayName || (user.email || "").split("@")[0])) || "나";
      const authorInitials = authorName.slice(0, 1).toUpperCase();
      await db.collection("wiki_pages").doc(id).collection("revisions").add({
        uid: this.uid,
        blocks: encoded,
        authorName,
        authorInitials,
        savedAt: now,
      });
    },
    async loadWikiRevisions(id) {
      if (!this.uid) return [];
      const snap = await db.collection("wiki_pages").doc(id)
        .collection("revisions")
        .orderBy("savedAt", "desc")
        .limit(50)
        .get();
      return snap.docs.map(doc => {
        const d = doc.data();
        const ms = d.savedAt && d.savedAt.toMillis ? d.savedAt.toMillis() : 0;
        return {
          id: doc.id,
          blocks: (d.blocks || []).map(decodeEditorJSBlock),
          authorName: d.authorName || "사용자",
          authorInitials: d.authorInitials || "U",
          savedAt: ms,
        };
      });
    },
    async deleteWikiPage(id) {
      if (!this.uid) return;
      await db.collection("wiki_pages").doc(id).delete();
    },
  };

  window.Planary = window.Planary || {};
  window.Planary.api = api;
  window.Planary.generateId = () => db.collection("notes").doc().id;

  // ── FCM push notification helpers ────────────────────────────────────
  async function registerFCMToken() {
    try {
      if (!("Notification" in window) || Notification.permission === "denied") return;
      if (typeof firebase.messaging !== "function") return;
      if (!("serviceWorker" in navigator)) return;
      const swReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
      const messaging = firebase.messaging();
      const vapidKey = window.PLANARY_FCM_VAPID_KEY;
      const token = await messaging.getToken({ vapidKey, serviceWorkerRegistration: swReg });
      if (token && api.uid) {
        await db.collection("users").doc(api.uid).update({
          fcmTokens: firebase.firestore.FieldValue.arrayUnion(token),
        });
        window.Planary.FCM_TOKEN = token;
      }
    } catch (err) {
      console.warn("[Planary] FCM token registration failed:", err.message);
    }
  }

  window.Planary.requestPushPermission = async () => {
    if (!("Notification" in window)) return false;
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      await registerFCMToken();
      return true;
    }
    return false;
  };

  window.Planary.getPushPermission = () => {
    if (!("Notification" in window)) return "unsupported";
    return Notification.permission; // "default" | "granted" | "denied"
  };

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
      avatar: user.photoURL ? `url("${user.photoURL}")` : null,
      handle: user.email || "",
      initials: (user.displayName || user.email || "U").slice(0, 1).toUpperCase(),
      memberSince: memberSinceText(user),
      school: "",
      studentId: "",
      bio: "",
    };
    // Update USER mock so existing components pick it up on next render
    window.Planary.USER = api.user;
    window.dispatchEvent(new CustomEvent("planary:auth-changed", { detail: api.user }));

    // Auto-register FCM token if permission was already granted
    if (window.Planary.getPushPermission() === "granted") {
      registerFCMToken();
    }

    // Shared snapshot error handler: debounced toast — at most once per minute
    let _lastSyncErrToast = 0;
    const _onSnapErr = (label, err) => {
      console.error(`[Planary] ${label} snapshot error:`, err);
      const now = Date.now();
      if (now - _lastSyncErrToast < 60_000) return;
      _lastSyncErrToast = now;
      const isOffline = err.code === 'unavailable';
      const isDenied = err.code === 'permission-denied';
      window.Planary?.toast?.({
        type: 'err',
        title: isOffline ? '오프라인 상태예요' : isDenied ? '동기화 권한 오류' : '데이터 동기화 실패',
        sub: isOffline ? '인터넷 연결을 확인해 주세요' : isDenied ? '로그아웃 후 다시 로그인해 주세요' : err.message,
        ttl: 6000,
      });
    };

    // Tasks
    unsubs.push(
      db.collection("todos").where("uid", "==", user.uid).onSnapshot(
        (snap) => {
          const tasks = snap.docs.map(todoDocToTask);
          latestTasks = tasks;
          window.Planary.TASKS = tasks;
          window.dispatchEvent(new CustomEvent("planary:tasks-loaded", { detail: tasks }));
          // Re-emit projects so progress numbers refresh
          window.dispatchEvent(new CustomEvent("planary:tasks-changed-for-projects"));
        },
        (err) => _onSnapErr("todos", err)
      )
    );

    // User profile + synchronized preferences
    unsubs.push(
      db.collection("users").doc(user.uid).onSnapshot(
        (snap) => {
          const d = snap.data() || {};
          api.user = {
            ...api.user,
            name: d.displayName || api.user.name,
            email: d.email || api.user.email,
            avatar: d.photoURL ? `url("${d.photoURL}")` : api.user.avatar,
            initials: (d.displayName || api.user.name || "U").slice(0, 1).toUpperCase(),
            memberSince: memberSinceText(user, d),
            school: d.school || "",
            studentId: d.studentId || "",
            bio: d.bio || "",
          };
          window.Planary.USER = api.user;
          window.dispatchEvent(new CustomEvent("planary:user-doc-loaded", { detail: d }));
          window.dispatchEvent(new CustomEvent("planary:auth-changed", { detail: api.user }));
        },
        (err) => _onSnapErr("user", err)
      )
    );

    // e-Class connection status
    unsubs.push(
      db.collection("eclass_connections").doc(user.uid).onSnapshot(
        (snap) => {
          const data = snap.data() || null;
          window.Planary.ECLASS_CONNECTION = data;
          window.dispatchEvent(new CustomEvent("planary:eclass-connection", { detail: data }));
        },
        (err) => _onSnapErr("eclass-connection", err)
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
        (err) => _onSnapErr("notes", err)
      )
    );

    // Projects
    unsubs.push(
      db.collection("projects").where("uid", "==", user.uid).onSnapshot(
        (snap) => {
          const projects = snap.docs
            .filter(d => {
              const data = d.data() || {};
              return !data.archived && data.source !== "eclass-course-archived";
            })
            .map(d => projectDocToProject(d, latestTasks));
          window.Planary.PROJECTS = projects;
          window.dispatchEvent(new CustomEvent("planary:projects-loaded", { detail: projects }));
        },
        (err) => _onSnapErr("projects", err)
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
        (err) => _onSnapErr("bookmarks", err)
      )
    );

    // Wiki pages — tree metadata + decoded blocks. Client-side order keeps
    // newly created pages appended instead of jumping to the top.
    unsubs.push(
      db.collection("wiki_pages").where("uid", "==", user.uid).onSnapshot(
        (snap) => {
          const pages = snap.docs.map(wikiPageDocToEntry);
          pages.sort((a, b) => {
            const aOrder = a.orderIndex || a.createdAt || a.updatedAt || 0;
            const bOrder = b.orderIndex || b.createdAt || b.updatedAt || 0;
            return aOrder - bOrder || a.title.localeCompare(b.title);
          });
          // Public tree shape for sidebar / WikiPage (id, title, parent, icon)
          const tree = pages.map(p => ({ id: p.id, title: p.title, parent: p.parent, icon: p.icon, tags: p.tags, orderIndex: p.orderIndex }));
          window.Planary.WIKI_TREE = tree;
          // Per-page content + cover info keyed by id (consumed by WikiBlocks)
          const byId = {};
          pages.forEach(p => { byId[p.id] = p; });
          window.Planary.WIKI_PAGES = byId;
          window.dispatchEvent(new CustomEvent("planary:wiki-loaded", { detail: { tree, byId } }));
        },
        (err) => _onSnapErr("wiki", err)
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
    api.toggleTask(id).catch(err => {
      console.error("[Planary] toggle-task failed:", err);
      window.Planary?.toast?.({ type: "err", title: "저장 실패", sub: err.message });
    });
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

  window.addEventListener("planary:archive-task", (e) => {
    const id = e.detail;
    if (!id) return;
    api.archiveTask(id).catch(err => {
      console.error("[Planary] archive-task failed:", err);
      window.Planary?.toast?.({ type: "err", title: "보관 실패", sub: err.message });
    });
  });

  window.addEventListener("planary:unarchive-task", (e) => {
    const id = e.detail;
    if (!id) return;
    api.unarchiveTask(id).catch(err => {
      console.error("[Planary] unarchive-task failed:", err);
      window.Planary?.toast?.({ type: "err", title: "복원 실패", sub: err.message });
    });
  });

  // ── Notes ───────────────────────────────────────────────────────────
  window.addEventListener("planary:create-note", (e) => {
    const note = e.detail || {};
    api.createNote(note).catch(err => {
      console.error("[Planary] create-note failed:", err);
      window.Planary?.toast?.({ type: "err", title: "메모 추가 실패", sub: err.message });
    });
  });
  window.addEventListener("planary:update-note", (e) => {
    const { id, patch } = e.detail || {};
    if (!id || !patch) return;
    api.updateNote(id, patch).catch(err => console.error("[Planary] update-note failed:", err));
  });
  window.addEventListener("planary:delete-note", (e) => {
    const id = e.detail;
    if (!id) return;
    api.deleteNote(id).catch(err => console.error("[Planary] delete-note failed:", err));
  });

  // ── Projects ────────────────────────────────────────────────────────
  window.addEventListener("planary:create-project", (e) => {
    const { name, color, icon } = e.detail || {};
    api.createProject(name, color, icon).catch(err => {
      console.error("[Planary] create-project failed:", err);
      window.Planary?.toast?.({ type: "err", title: "프로젝트 생성 실패", sub: err.message });
    });
  });
  window.addEventListener("planary:update-project", (e) => {
    const { id, patch } = e.detail || {};
    if (!id) return;
    api.updateProject(id, patch || {}).catch(err => console.error("[Planary] update-project failed:", err));
  });
  window.addEventListener("planary:delete-project", (e) => {
    const id = e.detail;
    if (!id) return;
    api.deleteProject(id).catch(err => console.error("[Planary] delete-project failed:", err));
  });

  // ── Bookmarks ───────────────────────────────────────────────────────
  window.addEventListener("planary:create-bookmark", (e) => {
    const bm = e.detail || {};
    api.createBookmark(bm).catch(err => {
      console.error("[Planary] create-bookmark failed:", err);
      window.Planary?.toast?.({ type: "err", title: "북마크 추가 실패", sub: err.message });
    });
  });
  window.addEventListener("planary:update-bookmark", (e) => {
    const { id, patch } = e.detail || {};
    if (!id) return;
    api.updateBookmark(id, patch || {}).catch(err => console.error("[Planary] update-bookmark failed:", err));
  });
  window.addEventListener("planary:delete-bookmark", (e) => {
    const id = e.detail;
    if (!id) return;
    api.deleteBookmark(id).catch(err => console.error("[Planary] delete-bookmark failed:", err));
  });

  // ── Wiki ────────────────────────────────────────────────────────────
  window.addEventListener("planary:create-wiki-page", (e) => {
    const { title, parentId, clientId } = e.detail || {};
    api.createWikiPage(title || "새 페이지", parentId || null, clientId || null).catch(err => {
      console.error("[Planary] create-wiki-page failed:", err);
      window.Planary?.toast?.({ type: "err", title: "페이지 생성 실패", sub: err.message });
    });
  });
  window.addEventListener("planary:save-wiki-blocks", (e) => {
    const { id, blocks } = e.detail || {};
    if (!id) return;
    api.saveWikiBlocks(id, blocks || []).catch(err => {
      console.error("[Planary] save-wiki-blocks failed:", err);
      window.Planary?.toast?.({ type: "err", title: "노트 저장 실패", sub: err.message });
    });
  });
  window.addEventListener("planary:update-wiki-page-meta", (e) => {
    const { id, patch } = e.detail || {};
    if (!id) return;
    api.updateWikiPageMeta(id, patch || {}).catch(err => console.error("[Planary] update-wiki-page-meta failed:", err));
  });
  window.addEventListener("planary:delete-wiki-page", (e) => {
    const id = e.detail;
    if (!id) return;
    api.deleteWikiPage(id).catch(err => console.error("[Planary] delete-wiki-page failed:", err));
  });

  // ── Profile / Account ───────────────────────────────────────────────
  window.addEventListener("planary:update-profile", (e) => {
    const profile = e.detail || {};
    api.updateProfile(profile).catch(err => {
      console.error("[Planary] update-profile failed:", err);
      window.Planary?.toast?.({ type: "err", title: "프로필 저장 실패", sub: err.message });
    });
  });
  window.addEventListener("planary:change-password", async (e) => {
    const { current, next, onResult } = e.detail || {};
    try {
      await api.changePassword(current, next);
      onResult && onResult({ ok: true });
      window.Planary?.toast?.({ type: "ok", title: "비밀번호를 변경했어요" });
    } catch (err) {
      console.error("[Planary] change-password failed:", err);
      onResult && onResult({ ok: false, error: err.message });
      window.Planary?.toast?.({ type: "err", title: "비밀번호 변경 실패", sub: err.message });
    }
  });
  window.addEventListener("planary:sign-out", () => {
    api.signOut().catch(err => console.error("[Planary] sign-out failed:", err));
  });
  window.addEventListener("planary:delete-account", async (e) => {
    const { onResult } = e.detail || {};
    try {
      await api.deleteAccount();
      onResult && onResult({ ok: true });
    } catch (err) {
      console.error("[Planary] delete-account failed:", err);
      onResult && onResult({ ok: false, error: err.message });
      window.Planary?.toast?.({ type: "err", title: "계정 삭제 실패", sub: err.message });
    }
  });
  window.addEventListener("planary:save-notif-prefs", (e) => {
    const patch = e.detail || {};
    api.saveNotifPrefs(patch).catch(err => console.error("[Planary] save-notif-prefs failed:", err));
    // When the user turns push on, request OS permission and register FCM token
    if (patch.push === true) {
      window.Planary.requestPushPermission().then(granted => {
        if (!granted) {
          window.Planary?.toast?.({ type: "err", title: "알림 권한이 필요해요", sub: "브라우저 설정에서 알림을 허용해주세요" });
        }
      }).catch(err => console.error("[Planary] requestPushPermission failed:", err));
    }
  });
  window.addEventListener("planary:save-preferences", (e) => {
    const patch = e.detail || {};
    api.savePreferences(patch).catch(err => console.error("[Planary] save-preferences failed:", err));
  });

  // ── e-Class ─────────────────────────────────────────────────────────
  window.addEventListener("planary:eclass-connect", async (e) => {
    const { url, id, password, onResult } = e.detail || {};
    try {
      const data = await api.connectEclass({ url, id, password });
      onResult && onResult({ ok: true, data });
      window.Planary?.toast?.({ type: "ok", title: "e-Class에 연결됐어요" });
    } catch (err) {
      console.error("[Planary] eclass-connect failed:", err);
      onResult && onResult({ ok: false, error: err.message });
      window.Planary?.toast?.({ type: "err", title: "e-Class 연결 실패", sub: err.message });
    }
  });
  window.addEventListener("planary:eclass-disconnect", async (e) => {
    const { onResult } = e.detail || {};
    try {
      await api.disconnectEclass();
      onResult && onResult({ ok: true });
      window.Planary?.toast?.({ type: "ok", title: "e-Class 연결을 해제했어요" });
    } catch (err) {
      console.error("[Planary] eclass-disconnect failed:", err);
      onResult && onResult({ ok: false, error: err.message });
    }
  });
  window.addEventListener("planary:eclass-sync", async (e) => {
    const { onResult } = e.detail || {};
    try {
      const data = await api.triggerEclassSync();
      onResult && onResult({ ok: true, data });
      window.Planary?.toast?.({ type: "ok", title: "동기화 완료", sub: data && data.itemCount ? `${data.itemCount}건` : undefined });
    } catch (err) {
      console.error("[Planary] eclass-sync failed:", err);
      onResult && onResult({ ok: false, error: err.message });
      window.Planary?.toast?.({ type: "err", title: "동기화 실패", sub: err.message });
    }
  });

  console.info("[Planary] Firebase bridge ready.");
})();
