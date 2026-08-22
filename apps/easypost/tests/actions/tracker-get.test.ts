import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/tracker-get.ts";

const tracker = (status: string, lastScan?: string) => ({
  status: 200,
  body: {
    id: "trk_1",
    status,
    tracking_details: lastScan ? [{ datetime: lastScan }] : [],
  },
});

Deno.test("tracker-get: delivered is its own boolean", async () => {
  const { ctx, calls } = mockCtx([tracker("delivered")]);
  const result = await action.execute!({ trackerId: "trk_1" }, ctx) as {
    delivered: boolean;
    needsAttention: boolean;
  };
  assertEquals(calls[0].url, "https://api.easypost.com/v2/trackers/trk_1");
  assertEquals(result.delivered, true);
  assertEquals(result.needsAttention, false);
});

/** The two worth acting on, and both are otherwise silent. */
Deno.test("tracker-get: return_to_sender and failure need attention", async () => {
  for (const status of ["return_to_sender", "failure"]) {
    const { ctx } = mockCtx([tracker(status)]);
    const result = await action.execute!({ trackerId: "trk_1" }, ctx) as {
      needsAttention: boolean;
    };
    assertEquals(result.needsAttention, true, status);
  }
});

/** `unknown` means not yet scanned — alerting on it alerts on everything. */
Deno.test("tracker-get: unknown does not need attention", async () => {
  const { ctx } = mockCtx([tracker("unknown")]);
  const result = await action.execute!({ trackerId: "trk_1" }, ctx) as { needsAttention: boolean };
  assertEquals(result.needsAttention, false);
});

/** No status says "stuck", so it is computed from the last scan. */
Deno.test("tracker-get: a parcel with no scan in a week is stalled", async () => {
  const old = new Date(Date.now() - 10 * 86_400_000).toISOString();
  const { ctx } = mockCtx([tracker("in_transit", old)]);
  const result = await action.execute!({ trackerId: "trk_1" }, ctx) as { stalled: boolean };
  assertEquals(result.stalled, true);
});

Deno.test("tracker-get: a recent scan is not stalled", async () => {
  const recent = new Date(Date.now() - 86_400_000).toISOString();
  const { ctx } = mockCtx([tracker("in_transit", recent)]);
  const result = await action.execute!({ trackerId: "trk_1" }, ctx) as { stalled: boolean };
  assertEquals(result.stalled, false);
});

/** A delivered parcel stops moving on purpose. */
Deno.test("tracker-get: a delivered parcel is never stalled", async () => {
  const old = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { ctx } = mockCtx([tracker("delivered", old)]);
  const result = await action.execute!({ trackerId: "trk_1" }, ctx) as { stalled: boolean };
  assertEquals(result.stalled, false);
});

Deno.test("tracker-get: needs a tracker id", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({}, ctx), Error, "trackerId");
  assertEquals(calls.length, 0);
});

Deno.test("tracker-get: says what unknown actually means", () => {
  assert(/not lost/.test(action.description!), action.description);
});
