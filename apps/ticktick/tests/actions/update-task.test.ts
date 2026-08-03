import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-task.ts";

Deno.test("update-task: POSTs /task/{taskId} and repeats both ids in the body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ projectId: "P1", taskId: "T1", title: "Renamed" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/open/v1/task/T1");
  // TickTick documents `id` and `projectId` as required body fields even though
  // taskId is already in the path.
  assertEquals(JSON.parse(calls[0].body!), { id: "T1", projectId: "P1", title: "Renamed" });
});

Deno.test("update-task: the body id can never disagree with the path id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ projectId: "P1", taskId: "T9" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.id, "T9");
  assertEquals(new URL(calls[0].url).pathname.endsWith("/T9"), true);
});

Deno.test("update-task: sends only the fields set, plus the two required ids", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ projectId: "P1", taskId: "T1", priority: 1 }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { id: "T1", projectId: "P1", priority: 1 });
});

Deno.test("update-task: converts dates the same way create does", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ projectId: "P1", taskId: "T1", dueDate: "2026-08-10T17:00:00Z" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).dueDate, "2026-08-10T17:00:00+0000");
});

Deno.test("update-task: does not offer status — completion has its own endpoint", () => {
  const keys = action.params!.map((p) => p.key);
  assert(!keys.includes("status"));
  assertEquals(action.idempotent, true);
});
