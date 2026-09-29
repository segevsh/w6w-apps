import { assertEquals } from "@std/assert";
import getFormWebhook from "../../actions/get-form-webhook.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-form-webhook: GETs /v1/webhooks/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope({ webhook: { id: "w1" } }) }]);
  const out = await getFormWebhook.execute({ id: "w1" }, ctx) as { webhook?: { id?: string } };
  assertEquals(pathOf(calls[0].url), "/v1/webhooks/w1");
  assertEquals(out.webhook?.id, "w1");
});
