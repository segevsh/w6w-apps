import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-campaign.ts";

Deno.test("get-campaign: GETs /api/campaigns/{id}", async () => {
  const envelope = { data: { id: "1", name: "Dummy campaign", status: "draft" } };
  const { ctx, calls } = mockCtx([{ body: envelope }]);
  const out = await action.execute!({ campaignId: "1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/api/campaigns/1");
  assertEquals(out, envelope);
});

Deno.test("get-campaign: URL-encodes the id path segment", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute!({ campaignId: "a b" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/campaigns/a%20b");
});
