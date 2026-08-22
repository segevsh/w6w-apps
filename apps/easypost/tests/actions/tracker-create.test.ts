import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/tracker-create.ts";

const created = { status: 200, body: { id: "trk_1", status: "pre_transit" } };

Deno.test("tracker-create: posts a wrapped tracker", async () => {
  const { ctx, calls } = mockCtx([created]);
  await action.execute!({ trackingCode: "1Z999", carrier: "UPS" }, ctx);
  assertEquals(calls[0].url, "https://api.easypost.com/v2/trackers");
  assertEquals(JSON.parse(calls[0].body!), {
    tracker: { tracking_code: "1Z999", carrier: "UPS" },
  });
});

/** EasyPost infers the carrier, and several use overlapping formats. */
Deno.test("tracker-create: the carrier is optional", async () => {
  const { ctx, calls } = mockCtx([created]);
  await action.execute!({ trackingCode: "1Z999" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).tracker.carrier, undefined);
});

Deno.test("tracker-create: a declared value reaches the wire as a string", async () => {
  const { ctx, calls } = mockCtx([created]);
  await action.execute!({ trackingCode: "1Z999", amount: 120 }, ctx);
  assertEquals(JSON.parse(calls[0].body!).tracker.amount, "120");
});

Deno.test("tracker-create: needs a tracking number", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({}, ctx), Error, "trackingCode");
  assertEquals(calls.length, 0);
});

/** Creating a tracker subscribes to updates; polling as well is double work. */
Deno.test("tracker-create: says it starts a subscription", () => {
  assert(/doing the work twice/.test(action.description!), action.description);
});
