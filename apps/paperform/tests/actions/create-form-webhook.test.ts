import { assertEquals } from "@std/assert";
import createFormWebhook from "../../actions/create-form-webhook.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("create-form-webhook: POSTs target_url and triggers, splitting a comma string", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: envelope({ webhook: { id: "w1", target_url: "https://example.com/webhook" } }),
  }]);
  const out = await createFormWebhook.execute(
    {
      slugOrId: "f1",
      targetUrl: "https://example.com/webhook",
      triggers: "submission, partial_submission",
    },
    ctx,
  ) as { webhook?: { id?: string } };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/forms/f1/webhooks");
  assertEquals(JSON.parse(calls[0].body!), {
    target_url: "https://example.com/webhook",
    triggers: ["submission", "partial_submission"],
  });
  assertEquals(out.webhook?.id, "w1");
});

Deno.test("create-form-webhook: accepts triggers already as an array", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope({ webhook: {} }) }]);
  await createFormWebhook.execute(
    { slugOrId: "f1", targetUrl: "https://example.com/hook", triggers: ["submission"] },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).triggers, ["submission"]);
});

Deno.test("create-form-webhook: declares idempotent false — no idempotency key is documented", () => {
  assertEquals(createFormWebhook.idempotent, false);
});
