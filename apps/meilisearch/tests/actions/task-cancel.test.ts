import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/task-cancel.ts";

const conn = { display: { baseUrl: "https://search.example.com" } };

Deno.test("task-cancel: POSTs the filter as query parameters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { taskUid: 11 } }], conn);
  await action.execute!({ uids: "1, 2" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/tasks/cancel");
  assertEquals(new URL(calls[0].url).searchParams.get("uids"), "1,2");
});

/** A statuses filter alone reaches every pending task on the instance. */
Deno.test("task-cancel: a broad filter is allowed but logged at warn", async () => {
  const { ctx, logs } = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({ statuses: "enqueued" }, ctx);
  assertEquals(logs[0].level, "warn");
  assertEquals((logs[0].data as { filters: string[] }).filters, ["statuses"]);
});

Deno.test("task-cancel: a cancel with no filter at all is refused", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({}, ctx),
    Error,
    "a filter is required",
  );
  assertEquals(calls.length, 0);
});

/** Cancelling is itself a task, so the receipt is for the cancellation. */
Deno.test("task-cancel: the output is the cancellation's own task", () => {
  const outputs = action.output as Array<{ key: string }>;
  assert(outputs.some((o) => o.key === "taskUid"));
});
