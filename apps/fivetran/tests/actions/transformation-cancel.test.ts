import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { ok } from "./_shared.ts";
import action from "../../actions/transformation-cancel.ts";

Deno.test("transformation-cancel: posts to the cancel path and warns", async () => {
  const { ctx, calls, logs } = mockCtx([ok({})]);
  const result = await action.execute!({ transformationId: "t1" }, ctx) as { cancelled: boolean };
  assertEquals(calls[0].url, "https://api.fivetran.com/v1/transformations/t1/cancel");
  assertEquals(calls[0].method, "POST");
  assertEquals(result.cancelled, true);
  assert(logs.some((l) => l.level === "warn"), JSON.stringify(logs));
});

Deno.test("transformation-cancel: needs a transformation id", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({}, ctx), Error, "transformationId");
  assertEquals(calls.length, 0);
});

/** dbt commits each model as it completes, so a half-run is inconsistent. */
Deno.test("transformation-cancel: says the warehouse is left inconsistent", () => {
  assert(/internally inconsistent/.test(action.description!), action.description);
});
