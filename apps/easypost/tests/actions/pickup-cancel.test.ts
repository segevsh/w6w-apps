import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/pickup-cancel.ts";

Deno.test("pickup-cancel: posts to the cancel path", async () => {
  const { ctx, calls, logs } = mockCtx([{
    status: 200,
    body: { id: "pkp_1", status: "cancelled" },
  }]);
  const result = await action.execute!({ pickupId: "pkp_1" }, ctx) as { status: string };
  assertEquals(calls[0].url, "https://api.easypost.com/v2/pickups/pkp_1/cancel");
  assertEquals(calls[0].method, "POST");
  assertEquals(result.status, "cancelled");
  assertEquals(logs[0].data, { pickupId: "pkp_1" });
});

Deno.test("pickup-cancel: needs a pickup id", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({}, ctx), Error, "pickupId");
  assertEquals(calls.length, 0);
});

/** Carriers charge for a wasted trip, so this belongs early. */
Deno.test("pickup-cancel: says why it should run early", () => {
  assert(/wasted trip/.test(action.description!), action.description);
});
