import { assert, assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";

import updateWebhook from "../../actions/update-webhook.ts";

const EVENTS = [
  "subscriber.created",
  "subscriber.added_to_segment",
  "subscriber.unsubscribed",
];

Deno.test("update-webhook: PUTs only the properties supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "wh1" } }]);
  await updateWebhook.execute({ webhookId: "wh1", name: "Renamed" }, ctx);

  assertEquals(calls[0].url, "https://api.flodesk.com/v1/webhooks/wh1");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { name: "Renamed" });
});

Deno.test("update-webhook: maps postUrl and events too", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await updateWebhook.execute(
    { webhookId: "wh1", postUrl: "https://e.com/new", events: EVENTS },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), { post_url: "https://e.com/new", events: EVENTS });
});

Deno.test("update-webhook: rejects a no-op call rather than sending an empty body", () => {
  const { ctx, calls } = mockCtx([]);
  assertThrows(() => updateWebhook.execute({ webhookId: "wh1" }, ctx), Error);
  assertEquals(calls.length, 0);
});

Deno.test("update-webhook: every property is optional — Flodesk requires none on update", () => {
  for (const p of updateWebhook.params!.filter((p) => p.key !== "webhookId")) {
    assert(!p.required, `${p.key} must be optional on update`);
  }
  assertEquals(updateWebhook.idempotent, true);
});
