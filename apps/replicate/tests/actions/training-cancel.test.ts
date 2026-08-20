import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/training-cancel.ts";

/** A training bills for its whole runtime, so cancelling is worth real money. */
Deno.test("training-cancel: POSTs the cancel path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "t1", status: "canceled" } }]);
  const result = await action.execute!({ trainingId: "t1" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://api.replicate.com/v1/trainings/t1/cancel");
  assertEquals(result.finished, true);
});

Deno.test("training-cancel: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`trainingId`");
  assertEquals(calls.length, 0);
  assert(action.description!.includes("real money"), action.description);
});
