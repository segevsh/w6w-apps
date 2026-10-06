import { assertEquals } from "@std/assert";
import { API, mockCtx } from "../_helpers.ts";
import contactCampaignOptOut from "../../actions/contact-campaign-opt-out.ts";

Deno.test("contact-campaign-opt-out: sends every documented field in its documented place", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { uid: "r1" }, metadata: { nextCursor: "c2" } },
  }]);
  const result = await contactCampaignOptOut.execute(
    { "phoneNumber": "+15555550123", "channelType": "PHONE" } as never,
    ctx,
  );
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "POST");
  assertEquals(url.origin + url.pathname, API + "/contacts/campaigns/opt_out");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(JSON.parse(call.body ?? "null"), {
    "channel": { "identifier": "+15555550123", "type": "PHONE" },
  });
  assertEquals(call.headers["content-type"], "application/json");
  assertEquals(result, { uid: "r1" });
});

Deno.test("contact-campaign-opt-out: a minimal call sends only what was set", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { uid: "r1" }, metadata: { nextCursor: "c2" } },
  }]);
  const result = await contactCampaignOptOut.execute(
    { "phoneNumber": "+15555550123" } as never,
    ctx,
  );
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "POST");
  assertEquals(url.origin + url.pathname, API + "/contacts/campaigns/opt_out");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(JSON.parse(call.body ?? "null"), {
    "channel": { "identifier": "+15555550123", "type": "PHONE" },
  });
  assertEquals(call.headers["content-type"], "application/json");
  assertEquals(result, { uid: "r1" });
});

Deno.test("contact-campaign-opt-out: declares its params and kind", () => {
  assertEquals((contactCampaignOptOut.params ?? []).map((p) => p.key), [
    "phoneNumber",
    "channelType",
  ]);
  assertEquals((contactCampaignOptOut.params ?? []).filter((p) => p.required).map((p) => p.key), [
    "phoneNumber",
  ]);
  assertEquals(contactCampaignOptOut.type, "perform");
  assertEquals(contactCampaignOptOut.idempotent, true);
});
