import { assertEquals } from "@std/assert";
import { API, mockCtx } from "../_helpers.ts";
import webhookCreate from "../../actions/webhook-create.ts";

Deno.test("webhook-create: sends every documented field in its documented place", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { uid: "r1", secret: "s3cret" }, metadata: { nextCursor: "c2" } },
  }]);
  const result = await webhookCreate.execute(
    {
      "url": "url-1",
      "eventTypes": "a1, b2",
      "locationUid": "locationUid-1",
      "organizationUid": "organizationUid-1",
      "secret": "shh",
    } as never,
    ctx,
  );
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "POST");
  assertEquals(url.origin + url.pathname, API + "/webhooks");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(JSON.parse(call.body ?? "null"), {
    "url": "url-1",
    "eventTypes": ["a1", "b2"],
    "locationUid": "locationUid-1",
    "organizationUid": "organizationUid-1",
    "secret": "shh",
  });
  assertEquals(call.headers["content-type"], "application/json");
  assertEquals(result, { uid: "r1" });
});

Deno.test("webhook-create: a minimal call sends only what was set", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { uid: "r1", secret: "s3cret" }, metadata: { nextCursor: "c2" } },
  }]);
  const result = await webhookCreate.execute(
    { "url": "url-1", "eventTypes": "a1, b2" } as never,
    ctx,
  );
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "POST");
  assertEquals(url.origin + url.pathname, API + "/webhooks");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(JSON.parse(call.body ?? "null"), { "url": "url-1", "eventTypes": ["a1", "b2"] });
  assertEquals(call.headers["content-type"], "application/json");
  assertEquals(result, { uid: "r1" });
});

Deno.test("webhook-create: declares its params and kind", () => {
  assertEquals((webhookCreate.params ?? []).map((p) => p.key), [
    "url",
    "eventTypes",
    "locationUid",
    "organizationUid",
    "secret",
  ]);
  assertEquals((webhookCreate.params ?? []).filter((p) => p.required).map((p) => p.key), [
    "url",
    "eventTypes",
  ]);
  assertEquals(webhookCreate.type, "perform");
  assertEquals(webhookCreate.idempotent, false);
});
