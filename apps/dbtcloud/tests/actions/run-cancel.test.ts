import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/run-cancel.ts";

const display = { accessUrl: "https://ab123.us1.dbt.com", accountId: "42" };

Deno.test("run-cancel: posts to the cancel path and names the resulting status", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { id: 7, status: 30 } } }], {
    display,
  });
  const result = await action.execute!({ runId: "7" }, ctx) as { statusName: string };
  assertEquals(calls[0].url, "https://ab123.us1.dbt.com/api/v2/accounts/42/runs/7/cancel/");
  assertEquals(calls[0].method, "POST");
  assertEquals(result.statusName, "Cancelled");
});

/** dbt writes each model as it finishes, so a cancel leaves a partial rebuild. */
Deno.test("run-cancel: warns that what was already built stays built", async () => {
  const { ctx, logs } = mockCtx([{ status: 200, body: { data: { id: 7, status: 30 } } }], {
    display,
  });
  await action.execute!({ runId: "7" }, ctx);
  assert(
    logs.some((l) => l.level === "warn" && /already built/.test(l.message)),
    JSON.stringify(logs),
  );
  assert(/does NOT undo/i.test(action.description!), action.description);
});

Deno.test("run-cancel: needs a run id", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "runId");
  assertEquals(calls.length, 0);
});
