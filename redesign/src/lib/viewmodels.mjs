// redesign/src/lib/viewmodels.mjs
// Planary ViewModel layer: Pure business logic, computations, and command dispatching.
// Free of direct DOM dependencies for deterministic unit testing.

export function toISODate(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDaysISO(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function addMonthsISO(months) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return toISODate(d);
}

export function resolveTaskDueDate(option) {
  if (!option || option.id === "none") return null;
  if (option.iso) return option.iso;
  if (option.id === "today") return toISODate(new Date());
  if (option.id === "tomorrow") return addDaysISO(1);
  if (option.id === "after") return addDaysISO(2);
  if (option.id === "1w") return addDaysISO(7);
  if (option.id === "1m") return addMonthsISO(1);
  return null;
}

export function computeTaskCounts(tasks = []) {
  const active = tasks.filter(t => !t.archived);
  return {
    all: active.length,
    today: active.filter(t => t.time && t.time.startsWith("오늘") && !t.done).length,
    overdue: active.filter(t => t.time === "어제" && !t.done).length,
    important: active.filter(t => t.priority === "high" && !t.done).length,
    reminders: active.filter(t => t.reminder && !t.done).length,
    completed: active.filter(t => t.done).length,
  };
}

export function filterTasks(tasks = [], filterId = "all", searchQuery = "") {
  const q = String(searchQuery || "").trim().toLowerCase();
  return tasks
    .filter(t => !t.archived)
    .filter(t => {
      if (filterId === "today") return t.time && t.time.startsWith("오늘") && !t.done;
      if (filterId === "overdue") return t.time === "어제" && !t.done;
      if (filterId === "important") return t.priority === "high" && !t.done;
      if (filterId === "reminders") return t.reminder && !t.done;
      if (filterId === "completed") return t.done;
      return true; // "all"
    })
    .filter(t => {
      if (!q) return true;
      const titleMatch = (t.title || "").toLowerCase().includes(q);
      const memoMatch = (t.memo || "").toLowerCase().includes(q);
      const tagMatch = Array.isArray(t.tags) && t.tags.some(tag => tag.toLowerCase().includes(q));
      return titleMatch || memoMatch || tagMatch;
    });
}

export function computeKanbanBuckets(filteredTasks = []) {
  return {
    today: filteredTasks.filter(t => t.time && t.time.startsWith("오늘") && !t.done),
    week: filteredTasks.filter(t => t.time && !t.time.startsWith("오늘") && t.time !== "어제" && t.time !== "보관" && !t.done),
    later: filteredTasks.filter(t => !t.done && (!t.time || t.time === "보관" || t.time.startsWith("어제"))),
    done: filteredTasks.filter(t => t.done),
  };
}

export function sortTasksByPriority(tasks = []) {
  const order = { high: 0, med: 1, low: 2 };
  return [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return (order[a.priority] ?? 1) - (order[b.priority] ?? 1);
  });
}

export function computeProjectStats(project, tasks = []) {
  if (!project) return { totalCount: 0, openCount: 0, doneCount: 0, progress: 0, courseCount: 0 };
  const projTasks = tasks.filter(t => t.project === project.id && !t.archived);
  const openCount = projTasks.filter(t => !t.done).length;
  const doneCount = projTasks.filter(t => t.done).length;
  const totalCount = projTasks.length;
  const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const courseCount = new Set(
    projTasks
      .map(t => t.course || (t._raw && t._raw.courseTitle) || (t.source === "eclass-course" ? t.title : null))
      .filter(Boolean)
  ).size;

  return { totalCount, openCount, doneCount, progress, courseCount };
}

export class CommandDispatcher {
  constructor(api = null) {
    this.api = api;
  }

  async dispatch(commandName, payload) {
    if (this.api && typeof this.api[commandName] === "function") {
      return await this.api[commandName](payload);
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(`planary:${commandName}`, { detail: payload }));
      return true;
    }
    throw new Error(`Command ${commandName} handler not found`);
  }
}
