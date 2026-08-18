import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/run-artifact-list.ts";

const display = { accessUrl: "https://ab123.us1.dbt.com", accountId: "42" };

Deno.test("run-artifact-list: returns the paths a run produced", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { data: ["manifest.json", "run_results.json"] } }],
    { display },
  );
  const result = await action.execute!({ runId: "7" }, ctx) as {
    paths: string[];
    count: number;
  };
  assertEquals(calls[0].url, "https://ab123.us1.dbt.com/api/v2/accounts/42/runs/7/artifacts/");
  assertEquals(result.paths, ["manifest.json", "run_results.json"]);
  assertEquals(result.count, 2);
});

Deno.test("run-artifact-list: a step selects a different set of artifacts", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }], { display });
  await action.execute!({ runId: "7", step: 2 }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("step"), "2");
});

Deno.test("run-artifact-list: step 0 means the last step, so nothing is sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }], { display });
  await action.execute!({ runId: "7", step: 0 }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("step"), null);
});

/** A job with no docs step has no catalog.json, and a 404 reads like a bug. */
Deno.test("run-artifact-list: says why asking first is worth a call", () => {
  assert(/catalog.json/.test(action.description!), action.description);
});

Deno.test("run-artifact-list: needs a run id", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "runId");
  assertEquals(calls.length, 0);
});
