import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { ok } from "./_shared.ts";
import action from "../../actions/transformation-get.ts";

Deno.test("transformation-get: fetches one transformation", async () => {
  const { ctx, calls } = mockCtx([ok({
    id: "t1",
    status: "SUCCEEDED",
    schedule: { schedule_type: "INTEGRATED" },
  })]);
  const result = await action.execute!({ transformationId: "t1" }, ctx) as { status: string };
  assertEquals(calls[0].url, "https://api.fivetran.com/v1/transformations/t1");
  assertEquals(result.status, "SUCCEEDED");
});

Deno.test("transformation-get: needs a transformation id", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({}, ctx), Error, "transformationId");
  assertEquals(calls.length, 0);
});

/** An integrated schedule fires on the sync a workflow just triggered. */
Deno.test("transformation-get: names the double-run trap", () => {
  assert(/run twice/.test(action.description!), action.description);
});
