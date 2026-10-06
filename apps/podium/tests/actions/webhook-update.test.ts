import { assertEquals } from "@std/assert";
import { API, mockCtx } from "../_helpers.ts";
import webhookUpdate from "../../actions/webhook-update.ts";

Deno.test("webhook-update: sends every documented field in its documented place", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { uid: "r1", secret: "s3cret" }, metadata: { nextCursor: "c2" } },
  }]);
  const result = await webhookUpdate.execute(
    {
      "uid": "uid-1",
      "url": "url-1",
      "eventTypes": "a1, b2",
      "secret": "shh",
      "disabled": true,
    } as never,
    ctx,
  );
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "PUT");
  assertEquals(url.origin + url.pathname, API + "/webhooks/uid-1");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(JSON.parse(call.body ?? "null"), {
    "url": "url-1",
    "eventTypes": ["a1", "b2"],
    "secret": "shh",
    "disabled": true,
  });
  assertEquals(call.headers["content-type"], "application/json");
  assertEquals(result, { uid: "r1" });
});

Deno.test("webhook-update: a minimal call sends only what was set", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { uid: "r1", secret: "s3cret" }, metadata: { nextCursor: "c2" } },
  }]);
  const result = await webhookUpdate.execute({ "uid": "uid-1" } as never, ctx);
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "PUT");
  assertEquals(url.origin + url.pathname, API + "/webhooks/uid-1");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(call.body, "{}");
  assertEquals(result, { uid: "r1" });
});

Deno.test("webhook-update: declares its params and kind", () => {
  assertEquals((webhookUpdate.params ?? []).map((p) => p.key), [
    "uid",
    "url",
    "eventTypes",
    "secret",
    "disabled",
  ]);
  assertEquals((webhookUpdate.params ?? []).filter((p) => p.required).map((p) => p.key), ["uid"]);
  assertEquals(webhookUpdate.type, "perform");
  assertEquals(webhookUpdate.idempotent, true);
});
