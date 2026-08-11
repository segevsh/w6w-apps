import { assertEquals } from "@std/assert";
import webhookCreate from "../../actions/webhook-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-create: POSTs to the flat /v1/api/webhook/create route", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 4211 } }]);
  await webhookCreate.execute(
    { formId: "aB1", url: "https://example.com/hooks/fillout" },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  // Not /forms/{formId}/webhooks — the form id travels in the body here.
  assertEquals(pathOf(calls[0].url), "/v1/api/webhook/create");
  assertEquals(JSON.parse(calls[0].body!), {
    formId: "aB1",
    url: "https://example.com/hooks/fillout",
  });
});

/**
 * **The type flip.** Create's schema answers `{"id": <integer>}`; Remove's
 * schema declares `webhookId: <string>`. Handing the integer straight back is
 * the obvious move and the one the delete schema rejects, so this action
 * returns both forms and the string one is what Remove Webhook expects.
 */
Deno.test("webhook-create: returns the integer id AND the string form delete needs", async () => {
  const { ctx } = mockCtx([{ body: { id: 4211 } }]);
  const out = await webhookCreate.execute({ formId: "aB1", url: "https://x.example.com" }, ctx);
  assertEquals(out.id, 4211);
  assertEquals(out.webhookId, "4211");
  assertEquals(typeof out.webhookId, "string");
});

Deno.test("webhook-create: a missing id yields undefined rather than the string 'undefined'", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  const out = await webhookCreate.execute({ formId: "aB1", url: "https://x.example.com" }, ctx);
  assertEquals(out.webhookId, undefined);
});

Deno.test("webhook-create: is not idempotent — a retry means every submission twice", () => {
  assertEquals(webhookCreate.idempotent, false);
});
