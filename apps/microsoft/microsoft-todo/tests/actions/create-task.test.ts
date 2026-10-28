import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-task.ts";

Deno.test("create-task: POSTs to the list's tasks collection with just the title", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "T1" } }]);
  await action.execute!({ taskList: "L=1", title: "Ship it" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/todo/lists/L%3D1/tasks");
  // The list id is a path segment, not a body field.
  assertEquals(JSON.parse(calls[0].body!), { title: "Ship it" });
});

Deno.test("create-task: nests body, dates and categories the way Graph wants", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute!({
    taskList: "L1",
    title: "Ship it",
    body: "with notes",
    bodyContentType: "html",
    status: "inProgress",
    importance: "high",
    categories: ["Important"],
    dueDateTime: "2026-08-10T17:00:00Z",
    reminderDateTime: "2026-08-10T09:00:00Z",
    isReminderOn: true,
    timeZone: "Eastern Standard Time",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    title: "Ship it",
    body: { contentType: "html", content: "with notes" },
    status: "inProgress",
    importance: "high",
    categories: ["Important"],
    dueDateTime: { dateTime: "2026-08-10T17:00:00", timeZone: "Eastern Standard Time" },
    reminderDateTime: { dateTime: "2026-08-10T09:00:00", timeZone: "Eastern Standard Time" },
    isReminderOn: true,
  });
});

Deno.test("create-task: `timeZone` is a helper, never a body field of its own", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute!({ taskList: "L1", title: "t", timeZone: "UTC" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { title: "t" });
});

Deno.test("create-task: passes a patternedRecurrence through verbatim", async () => {
  const recurrence = {
    pattern: { type: "weekly", interval: 1, daysOfWeek: ["monday"] },
    range: { type: "noEnd", startDate: "2026-08-03" },
  };
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute!({ taskList: "L1", title: "t", recurrence }, ctx);
  assertEquals(JSON.parse(calls[0].body!).recurrence, recurrence);
});

Deno.test("create-task: declares title required and is honestly non-idempotent", () => {
  assertEquals(action.idempotent, false);
  assert(action.params!.find((p) => p.key === "title")?.required);
  // Read-only / server-stamped properties are never offered as inputs.
  const keys = action.params!.map((p) => p.key);
  for (const forbidden of ["id", "createdDateTime", "lastModifiedDateTime", "hasAttachments"]) {
    assert(!keys.includes(forbidden), `${forbidden} must not be an input`);
  }
});
