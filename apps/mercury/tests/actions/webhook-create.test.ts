import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import webhookCreate from "../../actions/webhook-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("webhook-create: POSTs /webhooks with url, no eventTypes key when empty", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "wh_new" } }]);
  await webhookCreate.execute({ url: "https://example.com/hook" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/webhooks");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.url, "https://example.com/hook");
  assertEquals("eventTypes" in body, false);
});

test("webhook-create: forwards eventTypes when given", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await webhookCreate.execute({
    url: "https://example.com/hook",
    eventTypes: ["transaction.created"],
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).eventTypes, ["transaction.created"]);
});
