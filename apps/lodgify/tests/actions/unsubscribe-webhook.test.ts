import { assertEquals } from "@std/assert";
import { mockCtx, pathOf } from "../_helpers.ts";
import unsubscribe from "../../actions/unsubscribe-webhook.ts";

Deno.test("unsubscribe-webhook: DELETE with the id in a JSON body", async () => {
  const { ctx, calls } = mockCtx([{ body: undefined }]);
  const out = await unsubscribe.execute({ webhookId: "w1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/webhooks/v1/unsubscribe");
  assertEquals(JSON.parse(calls[0].body!), { id: "w1" });
  assertEquals(out, { ok: true });
});
