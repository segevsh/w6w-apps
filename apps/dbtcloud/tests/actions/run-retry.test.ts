import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/run-retry.ts";

const display = { accessUrl: "https://ab123.us1.dbt.com", accountId: "42" };

Deno.test("run-retry: posts to the retry path and returns the NEW run", async () => {
  const { ctx, calls, logs } = mockCtx([{ status: 200, body: { data: { id: 8, status: 1 } } }], {
    display,
  });
  const result = await action.execute!({ runId: "7" }, ctx) as { id: number; statusName: string };
  assertEquals(calls[0].url, "https://ab123.us1.dbt.com/api/v2/accounts/42/runs/7/retry/");
  assertEquals(calls[0].method, "POST");
  assertEquals(result.id, 8);
  assertEquals(result.statusName, "Queued");
  assertEquals(logs[0].data, { retriedRunId: "7", newRunId: 8 });
});

/** Retry only works on a job's most recent run, which is the usual surprise. */
Deno.test("run-retry: says it only applies to the most recent run", () => {
  assert(/MOST RECENT run/i.test(action.description!), action.description);
});

Deno.test("run-retry: needs a run id", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "runId");
  assertEquals(calls.length, 0);
});
