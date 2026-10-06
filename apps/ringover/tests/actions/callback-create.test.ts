import { assertEquals } from "@std/assert";
import action from "../../actions/callback-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("callback-create: POSTs integer numbers", async () => {
  const { ctx, calls } = mockCtx([{ body: { call_id: 11, channel_id: 22 } }]);
  const out = await action.execute!({
    toNumber: "+33 6 12 34 56 78",
    fromNumber: "33140000000",
    device: "APP",
    timeout: 30,
  }, ctx);
  assertEquals(calls[0].url, "https://public-api.ringover.com/v2/callback");
  assertEquals(JSON.parse(calls[0].body!), {
    to_number: 33612345678,
    from_number: 33140000000,
    device: "APP",
    timeout: 30,
  });
  assertEquals(out, { call_id: 11, channel_id: 22 });
  assertEquals(action.idempotent, false);
});
