import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/task-get.ts";

const conn = { display: { baseUrl: "https://search.example.com" } };

/** This is the only place the real outcome of a write is knowable. */
Deno.test("task-get: reads the task and adds the two booleans a branch tests", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { uid: 7, status: "succeeded", type: "documentAdditionOrUpdate" },
  }], conn);
  const result = await action.execute!({ taskUid: 7 }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://search.example.com/tasks/7");
  assertEquals(result.finished, true);
  assertEquals(result.succeeded, true);
});

/** A failed task never produced an HTTP error anywhere. */
Deno.test("task-get: a failed task is finished but not succeeded", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { uid: 8, status: "failed", error: { code: "invalid_document_id" } },
  }], conn);
  const result = await action.execute!({ taskUid: 8 }, ctx) as Record<string, unknown>;
  assertEquals(result.finished, true);
  assertEquals(result.succeeded, false);
  assertEquals((result.error as { code: string }).code, "invalid_document_id");
});

Deno.test("task-get: an enqueued task is neither finished nor succeeded", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { uid: 9, status: "enqueued" } }], conn);
  const result = await action.execute!({ taskUid: 9 }, ctx) as Record<string, unknown>;
  assertEquals(result.finished, false);
  assertEquals(result.succeeded, false);
});

Deno.test("task-get: a canceled task is finished but not succeeded", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { uid: 10, status: "canceled" } }], conn);
  const result = await action.execute!({ taskUid: 10 }, ctx) as Record<string, unknown>;
  assertEquals(result.finished, true);
  assertEquals(result.succeeded, false);
});

Deno.test("task-get: a missing or non-numeric id fails before any request", async () => {
  const missing = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({}, missing.ctx), Error, "`taskUid`");
  const bad = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ taskUid: "abc" }, bad.ctx),
    Error,
    "must be a number",
  );
  assertEquals(missing.calls.length + bad.calls.length, 0);
  assert(action.description!.includes("actually succeeded"), action.description);
});
