import { assertEquals } from "@std/assert";
import deleteFormWebhook from "../../actions/delete-form-webhook.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("delete-form-webhook: DELETEs /v1/webhooks/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: "ok" } }]);
  const out = await deleteFormWebhook.execute({ id: "w1" }, ctx) as { deleted: boolean };
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/webhooks/w1");
  assertEquals(out.deleted, true);
});
