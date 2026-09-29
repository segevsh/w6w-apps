import { assertEquals } from "@std/assert";
import updateFormWebhook from "../../actions/update-form-webhook.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("update-form-webhook: PUTs /v1/webhooks/{id} with target_url/triggers", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope({ webhook: { id: "w1" } }) }]);
  await updateFormWebhook.execute(
    { id: "w1", targetUrl: "https://example.com/new", triggers: ["submission"] },
    ctx,
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/webhooks/w1");
  assertEquals(JSON.parse(calls[0].body!), {
    target_url: "https://example.com/new",
    triggers: ["submission"],
  });
});

Deno.test("update-form-webhook: omits triggers from the body when not provided", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope({ webhook: {} }) }]);
  await updateFormWebhook.execute({ id: "w1", targetUrl: "https://example.com/x" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { target_url: "https://example.com/x" });
});

Deno.test("update-form-webhook: declares idempotent true", () => {
  assertEquals(updateFormWebhook.idempotent, true);
});
