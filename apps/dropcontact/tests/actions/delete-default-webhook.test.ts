import { assertEquals, assertRejects } from "@std/assert";
import deleteHook from "../../actions/delete-default-webhook.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("delete-default-webhook: DELETEs the webhook route", async () => {
  const { ctx, calls } = mockCtx([{ body: { error: false, success: true } }]);
  const out = await run(deleteHook, {}, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://api.dropcontact.com/v1/enrich/webhook");
  assertEquals(out.deleted, true);
});

Deno.test("delete-default-webhook: an error envelope throws", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { error: true, reason: "no webhook" } }]);
  await assertRejects(() => run(deleteHook, {}, ctx), Error, "no webhook");
});
