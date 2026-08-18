import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/channel-list.ts";

Deno.test("channel-list: reads /channels — the ids Send Message needs", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { _results: [{ id: "cha_1", address: "support@acme.test", type: "smtp" }] },
  }]);
  const out = await action.execute!({}, ctx) as Array<{ id: string }>;
  assertEquals(out[0].id, "cha_1");
  assertEquals(new URL(calls[0].url).pathname, "/channels");
});
