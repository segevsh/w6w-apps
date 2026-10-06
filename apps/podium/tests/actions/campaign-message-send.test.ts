import { assertEquals } from "@std/assert";
import { API, mockCtx } from "../_helpers.ts";
import campaignMessageSend from "../../actions/campaign-message-send.ts";

Deno.test("campaign-message-send: sends every documented field in its documented place", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { uid: "r1" }, metadata: { nextCursor: "c2" } },
  }]);
  const result = await campaignMessageSend.execute(
    { "uid": "uid-1", "channelIdentifier": "channelIdentifier-1" } as never,
    ctx,
  );
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "POST");
  assertEquals(url.origin + url.pathname, API + "/campaigns/uid-1/messages");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(JSON.parse(call.body ?? "null"), { "channelIdentifier": "channelIdentifier-1" });
  assertEquals(call.headers["content-type"], "application/json");
  assertEquals(result, { uid: "r1" });
});

Deno.test("campaign-message-send: declares its params and kind", () => {
  assertEquals((campaignMessageSend.params ?? []).map((p) => p.key), ["uid", "channelIdentifier"]);
  assertEquals((campaignMessageSend.params ?? []).filter((p) => p.required).map((p) => p.key), [
    "uid",
    "channelIdentifier",
  ]);
  assertEquals(campaignMessageSend.type, "perform");
  assertEquals(campaignMessageSend.idempotent, false);
});
