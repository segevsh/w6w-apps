import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newChecklist from "../../triggers/new-checklist.ts";
import newComment from "../../triggers/new-comment.ts";
import newLabel from "../../triggers/new-label.ts";
import newOrUpdatedTask from "../../triggers/new-or-updated-task.ts";
import newPerson from "../../triggers/new-person.ts";
import newProjectPerson from "../../triggers/new-project-person.ts";
import newProject from "../../triggers/new-project.ts";
import newSection from "../../triggers/new-section.ts";
import newSubtask from "../../triggers/new-subtask.ts";
import newTaskLabel from "../../triggers/new-task-label.ts";
import newTask from "../../triggers/new-task.ts";

const NEWEST = { items: "100", page: "1", sort: "-id" };

// Newest-first feeds (brief 9.1 a) and bounded lists (9.1 c): each case pins the LITERAL request.
const cases = [
  {
    name: "new-project",
    trigger: newProject,
    params: {},
    path: "/api/projects",
    query: { status: "all", ...NEWEST },
  },
  {
    name: "new-section",
    trigger: newSection,
    params: { projectId: 1 },
    path: "/api/projects/1/sections",
    query: { status: "all", ...NEWEST },
  },
  {
    name: "new-task",
    trigger: newTask,
    params: { projectId: 1 },
    path: "/api/projects/1/tasks",
    query: NEWEST,
  },
  {
    name: "new-comment",
    trigger: newComment,
    params: { taskId: 5 },
    path: "/api/tasks/5/comments",
    query: NEWEST,
  },
  {
    name: "new-subtask",
    trigger: newSubtask,
    params: { taskId: 5 },
    path: "/api/tasks/5/subtasks",
    query: NEWEST,
  },
  {
    name: "new-checklist",
    trigger: newChecklist,
    params: { taskId: 5 },
    path: "/api/tasks/5/checklists",
    query: NEWEST,
  },
  {
    name: "new-label",
    trigger: newLabel,
    params: { projectId: 1 },
    path: "/api/projects/1/labels",
    query: {},
  },
  {
    name: "new-project-person",
    trigger: newProjectPerson,
    params: { projectId: 1 },
    path: "/api/projects/1/persons",
    query: {},
  },
  { name: "new-person", trigger: newPerson, params: {}, path: "/api/persons", query: {} },
  {
    name: "new-task-label",
    trigger: newTaskLabel,
    params: { taskId: 5 },
    path: "/api/tasks/5/task_labels",
    query: {},
  },
];

for (const c of cases) {
  const input = { params: c.params, subscriptionId: "sub-1" };
  const rows = (ids: number[]) => ({ body: ids.map((id) => ({ id })) });

  test(`${c.name}: seeds, emits only new rows, retries idempotently, requests its feed`, async () => {
    const seed = mockCtx([rows([1])]);
    const seeded = await c.trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    const request = new URL(seed.calls[0].url);
    assertEquals({
      method: seed.calls[0].method,
      path: request.pathname,
      query: Object.fromEntries(request.searchParams),
    }, { method: "GET", path: c.path, query: c.query });
    const run = () =>
      c.trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([rows([2, 1])]).ctx);
    const first = await run();
    assertEquals(first.events, [{ id: 2 }]);
    assertEquals(await run(), first);
  });

  if (Object.keys(c.params).length) {
    test(`${c.name}: an unset parent id is refused before any request`, async () => {
      const m = mockCtx([]);
      await assertRejects(() =>
        c.trigger.poll!({ params: {}, subscriptionId: "sub-1", state: {} }, m.ctx)
      );
      assertEquals(m.calls.length, 0);
    });
  }
}

// brief 9.2: sorted by the update stamp, and the stamp is part of the id so an edit fires again.
test("new-or-updated-task: requests -updated_at and an edited task is a new event", async () => {
  const input = { params: { projectId: 1 }, subscriptionId: "sub-1" };
  const t1 = { id: 7, updated_at: "2026-11-10T09:00:00Z" };
  const seed = mockCtx([{ body: [t1] }]);
  const seeded = await newOrUpdatedTask.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  const request = new URL(seed.calls[0].url);
  assertEquals({ path: request.pathname, query: Object.fromEntries(request.searchParams) }, {
    path: "/api/projects/1/tasks",
    query: { items: "100", page: "1", sort: "-updated_at" },
  });
  const edited = { id: 7, updated_at: "2026-11-10T10:00:00Z" };
  const run = () =>
    newOrUpdatedTask.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: [edited, t1] }]).ctx,
    );
  const first = await run();
  assertEquals(first.events, [edited]);
  assertEquals(await run(), first);
});
