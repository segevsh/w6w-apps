import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-tasks.ts";

Deno.test("list-tasks: hits /tasks/v1/lists/{id}/tasks and invents no defaults", async () => {
  const { ctx, calls } = mockCtx([{ body: { kind: "tasks#tasks", items: [] } }]);
  await action.execute!({ taskList: "L1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/tasks/v1/lists/L1/tasks");
  assertEquals(calls[0].method, "GET");
  // Google's own defaults (showCompleted=true, maxResults=20) must not be
  // shadowed by client-side ones.
  assertEquals([...url.searchParams.keys()], []);
});

Deno.test("list-tasks: forwards every documented filter", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute!({
    taskList: "L1",
    showCompleted: false,
    showDeleted: true,
    showHidden: true,
    showAssigned: true,
    dueMin: "2026-08-01T00:00:00Z",
    dueMax: "2026-08-31T00:00:00Z",
    completedMin: "2026-07-01T00:00:00Z",
    completedMax: "2026-07-31T00:00:00Z",
    updatedMin: "2026-06-01T00:00:00Z",
    maxResults: 100,
    pageToken: "tok",
  }, ctx);
  const p = new URL(calls[0].url).searchParams;
  // `false` must survive — it is meaningful, not "unset".
  assertEquals(p.get("showCompleted"), "false");
  assertEquals(p.get("showDeleted"), "true");
  assertEquals(p.get("showHidden"), "true");
  assertEquals(p.get("showAssigned"), "true");
  assertEquals(p.get("dueMin"), "2026-08-01T00:00:00Z");
  assertEquals(p.get("dueMax"), "2026-08-31T00:00:00Z");
  assertEquals(p.get("completedMin"), "2026-07-01T00:00:00Z");
  assertEquals(p.get("completedMax"), "2026-07-31T00:00:00Z");
  assertEquals(p.get("updatedMin"), "2026-06-01T00:00:00Z");
  assertEquals(p.get("maxResults"), "100");
  assertEquals(p.get("pageToken"), "tok");
});

Deno.test("list-tasks: declares only parameters the Tasks API actually defines", () => {
  const keys = action.params!.map((p) => p.key).sort();
  assertEquals(keys, [
    "completedMax",
    "completedMin",
    "dueMax",
    "dueMin",
    "maxResults",
    "pageToken",
    "showAssigned",
    "showCompleted",
    "showDeleted",
    "showHidden",
    "taskList",
    "updatedMin",
  ]);
});
