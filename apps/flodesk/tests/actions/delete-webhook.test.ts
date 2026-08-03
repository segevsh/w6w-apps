import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";

import deleteWebhook from "../../actions/delete-webhook.ts";

Deno.test("delete-webhook: DELETEs and reports the 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await deleteWebhook.execute({ webhookId: "wh1" }, ctx);

  assertEquals(calls[0].url, "https://api.flodesk.com/v1/webhooks/wh1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { status: 204 });
});

Deno.test("delete-webhook: raises on a 404 rather than reporting success", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { code: "not_found" } }]);
  const err = await assertRejects(
    () => deleteWebhook.execute({ webhookId: "gone" }, ctx) as Promise<unknown>,
    Error,
  );
  assert(err.message.includes("404"));
});

Deno.test("delete-webhook: is idempotent — deletion converges", () => {
  assertEquals(deleteWebhook.idempotent, true);
});
