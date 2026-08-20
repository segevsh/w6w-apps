import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/prediction-cancel.ts";

/** Cancelling stops the billing clock. */
Deno.test("prediction-cancel: POSTs the cancel path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "p1", status: "canceled" } }]);
  const result = await action.execute!({ predictionId: "p1" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.replicate.com/v1/predictions/p1/cancel");
  assertEquals(result.finished, true);
});

Deno.test("prediction-cancel: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`predictionId`");
  assertEquals(calls.length, 0);
  assert(action.description!.includes("billing"), action.description);
});
