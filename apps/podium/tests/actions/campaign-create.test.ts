import { assertEquals } from "@std/assert";
import { API, mockCtx } from "../_helpers.ts";
import campaignCreate from "../../actions/campaign-create.ts";

Deno.test("campaign-create: sends every documented field in its documented place", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { uid: "r1" }, metadata: { nextCursor: "c2" } },
  }]);
  const result = await campaignCreate.execute(
    {
      "name": "name-1",
      "locations": "a1, b2",
      "status": "ACTIVE",
      "message": "message text",
      "includeActiveConversations": true,
      "recentlySentSubscriberOverride": true,
    } as never,
    ctx,
  );
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "POST");
  assertEquals(url.origin + url.pathname, API + "/campaigns");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(JSON.parse(call.body ?? "null"), {
    "name": "name-1",
    "locations": ["a1", "b2"],
    "status": "ACTIVE",
    "message": "message text",
    "includeActiveConversations": true,
    "recentlySentSubscriberOverride": true,
  });
  assertEquals(call.headers["content-type"], "application/json");
  assertEquals(result, { uid: "r1" });
});

Deno.test("campaign-create: a minimal call sends only what was set", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { uid: "r1" }, metadata: { nextCursor: "c2" } },
  }]);
  const result = await campaignCreate.execute(
    { "name": "name-1", "locations": "a1, b2", "status": "ACTIVE" } as never,
    ctx,
  );
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "POST");
  assertEquals(url.origin + url.pathname, API + "/campaigns");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(JSON.parse(call.body ?? "null"), {
    "name": "name-1",
    "locations": ["a1", "b2"],
    "status": "ACTIVE",
  });
  assertEquals(call.headers["content-type"], "application/json");
  assertEquals(result, { uid: "r1" });
});

Deno.test("campaign-create: declares its params and kind", () => {
  assertEquals((campaignCreate.params ?? []).map((p) => p.key), [
    "name",
    "locations",
    "status",
    "message",
    "includeActiveConversations",
    "recentlySentSubscriberOverride",
  ]);
  assertEquals((campaignCreate.params ?? []).filter((p) => p.required).map((p) => p.key), [
    "name",
    "locations",
    "status",
  ]);
  assertEquals(campaignCreate.type, "perform");
  assertEquals(campaignCreate.idempotent, false);
});
