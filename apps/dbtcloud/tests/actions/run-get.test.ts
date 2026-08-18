import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/run-get.ts";

const display = { accessUrl: "https://ab123.us1.dbt.com", accountId: "42" };

Deno.test("run-get: fetches the run and names its status", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { data: { id: 7, status: 20, is_complete: true, is_error: true } } }],
    { display },
  );
  const result = await action.execute!({ runId: "7" }, ctx) as { statusName: string };
  assertEquals(calls[0].url, "https://ab123.us1.dbt.com/api/v2/accounts/42/runs/7/");
  assertEquals(result.statusName, "Error");
});

Deno.test("run-get: include_related is passed as one comma-separated value", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { id: 7, status: 10 } } }], {
    display,
  });
  await action.execute!({ runId: "7", includeRelated: "run_steps, job" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("include_related"), "run_steps,job");
});

/** The numbers skip 4 through 9, so the booleans are what to branch on. */
Deno.test("run-get: its description points at the booleans rather than the number", () => {
  assert(/is_complete/.test(action.description!), action.description);
  const p = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "includeRelated")!;
  assert(/very large/.test(p.hint!), p.hint);
});

Deno.test("run-get: needs a run id", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "runId");
  assertEquals(calls.length, 0);
});
