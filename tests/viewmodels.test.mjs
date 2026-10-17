// tests/viewmodels.test.mjs
// TDD Test Suite for MVVM ViewModel Layer (Business logic, computations, and commands)

import assert from "node:assert/strict";

// We import the ViewModel functions to test them in isolation (zero DOM dependency)
import {
  toISODate,
  computeTaskCounts,
  filterTasks,
  computeKanbanBuckets,
  sortTasksByPriority,
  resolveTaskDueDate,
  computeProjectStats,
  CommandDispatcher,
  parseMemoSubtasks,
  serializeMemoSubtasks
} from "../redesign/src/lib/viewmodels.mjs";

console.log("Running ViewModel TDD Unit Tests...");

// ==========================================
// 1. Task Counts Computation
// ==========================================
{
  const sampleTasks = [
    { id: "1", title: "Task 1", time: "오늘 10:00", priority: "high", reminder: true, done: false, archived: false },
    { id: "2", title: "Task 2", time: "어제", priority: "med", reminder: false, done: false, archived: false },
    { id: "3", title: "Task 3", time: null, priority: "low", reminder: false, done: true, archived: false },
    { id: "4", title: "Archived Task", time: "오늘", priority: "high", done: false, archived: true },
  ];

  const counts = computeTaskCounts(sampleTasks);
  assert.equal(counts.all, 3, "Archived tasks should be excluded from 'all' count");
  assert.equal(counts.today, 1, "'today' count should match active tasks starting with '오늘'");
  assert.equal(counts.overdue, 1, "'overdue' count should match active tasks with time '어제'");
  assert.equal(counts.important, 1, "'important' count should match active tasks with priority 'high'");
  assert.equal(counts.reminders, 1, "'reminders' count should match active tasks with reminder: true");
  assert.equal(counts.completed, 1, "'completed' count should match active tasks with done: true");
  console.log("  ✓ computeTaskCounts test passed");
}

// ==========================================
// 2. Task Filtering
// ==========================================
{
  const sampleTasks = [
    { id: "1", title: "알고리즘 문제 풀이", memo: "백준 3문제", time: "오늘", priority: "high", done: false, archived: false, tags: ["공부"] },
    { id: "2", title: "디자인 리뷰", memo: "Figma 시안 확인", time: "내일", priority: "med", done: false, archived: false, tags: ["디자인"] },
    { id: "3", title: "운동하기", memo: null, time: null, priority: "low", done: true, archived: false, tags: ["루틴"] },
  ];

  const todayFiltered = filterTasks(sampleTasks, "today", "");
  assert.equal(todayFiltered.length, 1);
  assert.equal(todayFiltered[0].id, "1");

  const completedFiltered = filterTasks(sampleTasks, "completed", "");
  assert.equal(completedFiltered.length, 1);
  assert.equal(completedFiltered[0].id, "3");

  const searchFiltered = filterTasks(sampleTasks, "all", "백준");
  assert.equal(searchFiltered.length, 1);
  assert.equal(searchFiltered[0].id, "1");

  const tagSearchFiltered = filterTasks(sampleTasks, "all", "디자인");
  assert.equal(tagSearchFiltered.length, 1);
  assert.equal(tagSearchFiltered[0].id, "2");
  console.log("  ✓ filterTasks test passed");
}

// ==========================================
// 3. Kanban Buckets Computation
// ==========================================
{
  const sampleTasks = [
    { id: "1", title: "오늘 작업", time: "오늘", done: false },
    { id: "2", title: "이번 주 작업", time: "수요일", done: false },
    { id: "3", title: "기한 없는 작업", time: null, done: false },
    { id: "4", title: "완료된 작업", time: "오늘", done: true },
  ];

  const buckets = computeKanbanBuckets(sampleTasks);
  assert.equal(buckets.today.length, 1, "Today column should contain task with '오늘'");
  assert.equal(buckets.week.length, 1, "Week column should contain task with '수요일'");
  assert.equal(buckets.later.length, 1, "Later column MUST contain tasks without due date (time == null)");
  assert.equal(buckets.later[0].id, "3", "Task with time == null must be placed in 'later' bucket");
  assert.equal(buckets.done.length, 1, "Done column should contain completed tasks");
  console.log("  ✓ computeKanbanBuckets test passed");
}

// ==========================================
// 4. Priority Sorting (AI sort)
// ==========================================
{
  const unsorted = [
    { id: "1", title: "낮음 작업", priority: "low", done: false },
    { id: "2", title: "완료 작업", priority: "high", done: true },
    { id: "3", title: "높음 작업", priority: "high", done: false },
    { id: "4", title: "보통 작업", priority: "med", done: false },
  ];

  const sorted = sortTasksByPriority(unsorted);
  assert.equal(sorted[0].priority, "high", "First item should be active high priority");
  assert.equal(sorted[1].priority, "med", "Second item should be active medium priority");
  assert.equal(sorted[2].priority, "low", "Third item should be active low priority");
  assert.equal(sorted[3].done, true, "Completed items should be sorted to the end");
  console.log("  ✓ sortTasksByPriority test passed");
}

// ==========================================
{
  assert.equal(resolveTaskDueDate({ id: "none" }), null);
  assert.equal(resolveTaskDueDate({ id: "custom", iso: "2026-10-31" }), "2026-10-31");
  assert.equal(resolveTaskDueDate({ id: "today" }), toISODate(new Date()));
  console.log("  ✓ resolveTaskDueDate test passed");
}

// ==========================================
// 6. Project Stats & Enrolled Courses
// ==========================================
{
  const proj = { id: "p1", name: "프로젝트 1" };
  const tasks = [
    { id: "t1", project: "p1", done: false, archived: false, course: "데이터 시각화" },
    { id: "t2", project: "p1", done: true, archived: false, course: "데이터 시각화" },
    { id: "t3", project: "p1", done: false, archived: false, source: "eclass-course", title: "인터랙티브 미디어" },
    { id: "t4", project: "p2", done: false, archived: false }, // different project
  ];

  const stats = computeProjectStats(proj, tasks);
  assert.equal(stats.totalCount, 3, "Total project tasks count");
  assert.equal(stats.openCount, 2, "Open project tasks count");
  assert.equal(stats.doneCount, 1, "Done project tasks count");
  assert.equal(stats.progress, 33, "Progress should be 33% (1/3)");
  assert.equal(stats.courseCount, 2, "Distinct course count including eclass-course anchor tasks");
  console.log("  ✓ computeProjectStats test passed");
}

// ==========================================
// 7. Command Dispatcher
// ==========================================
{
  const mockCalls = [];
  const dispatcher = new CommandDispatcher({
    createTask: async (payload) => { mockCalls.push({ cmd: "createTask", payload }); return "new_id"; }
  });

  const res = await dispatcher.dispatch("createTask", { title: "테스트" });
  assert.equal(res, "new_id");
  assert.equal(mockCalls.length, 1);
  assert.equal(mockCalls[0].payload.title, "테스트");
  console.log("  ✓ CommandDispatcher test passed");
}

// ==========================================
// 8. Subtasks Checklist Parsing & Serializing
// ==========================================
{
  const rawMemo = "기본 메모 설명글\n\n[체크리스트]\n- [ ] 1. 세부 사항 확인\n- [x] 2. 완료된 항목";
  const { cleanMemo, subtasks } = parseMemoSubtasks(rawMemo);
  assert.equal(cleanMemo, "기본 메모 설명글");
  assert.equal(subtasks.length, 2);
  assert.equal(subtasks[0].done, false);
  assert.equal(subtasks[0].text, "1. 세부 사항 확인");
  assert.equal(subtasks[1].done, true);
  assert.equal(subtasks[1].text, "2. 완료된 항목");

  const serialized = serializeMemoSubtasks(cleanMemo, subtasks);
  assert.equal(serialized, rawMemo);
  console.log("  ✓ parseMemoSubtasks & serializeMemoSubtasks test passed");
}

console.log("All ViewModel unit tests passed successfully!");
