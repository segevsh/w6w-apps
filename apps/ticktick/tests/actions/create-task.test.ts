import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-task.ts";

Deno.test("create-task: POSTs the un-nested /task path with projectId in the BODY", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "T1" } }]);
  await action.execute!({ projectId: "P1", title: "Ship it" }, ctx);
  assertEquals(calls[0].method, "POST");
  // Not /project/P1/task — create is the one task endpoint that is not nested.
  assertEquals(new URL(calls[0].url).pathname, "/open/v1/task");
  assertEquals(JSON.parse(calls[0].body!), { projectId: "P1", title: "Ship it" });
});

Deno.test("create-task: converts dates to TickTick's numeric-offset format", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({
    projectId: "P1",
    title: "t",
    startDate: "2026-08-10T09:00:00Z",
    dueDate: "2026-08-10T17:00:00+02:00",
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.startDate, "2026-08-10T09:00:00+0000");
  assertEquals(body.dueDate, "2026-08-10T17:00:00+0200");
});

Deno.test("create-task: sends tags, reminders, repeat rule and priority as given", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({
    projectId: "P1",
    title: "t",
    tags: ["work", "urgent"],
    reminders: ["TRIGGER:PT0S"],
    repeatFlag: "RRULE:FREQ=DAILY;INTERVAL=1",
    priority: 5,
    isAllDay: true,
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    projectId: "P1",
    title: "t",
    tags: ["work", "urgent"],
    reminders: ["TRIGGER:PT0S"],
    repeatFlag: "RRULE:FREQ=DAILY;INTERVAL=1",
    priority: 5,
    isAllDay: true,
  });
});

Deno.test("create-task: passes a subtask array through verbatim", async () => {
  const items = [{ title: "step one", status: 0, isAllDay: false }];
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ projectId: "P1", title: "t", items }, ctx);
  assertEquals(JSON.parse(calls[0].body!).items, items);
});

Deno.test("create-task: offers only the four priorities TickTick defines", () => {
  const priority = action.params!.find((p) => p.key === "priority")!;
  assertEquals((priority.options as Array<{ value: unknown }>).map((o) => o.value), [0, 1, 3, 5]);
});

Deno.test("create-task: never offers server-stamped fields as inputs", () => {
  const keys = action.params!.map((p) => p.key);
  for (const forbidden of ["id", "status", "completedTime", "etag", "kind"]) {
    assert(!keys.includes(forbidden), `${forbidden} must not be an input`);
  }
});

Deno.test("create-task: honestly non-idempotent, and requires title + project", () => {
  assertEquals(action.idempotent, false);
  assert(action.params!.find((p) => p.key === "title")?.required);
  assert(action.params!.find((p) => p.key === "projectId")?.required);
});
