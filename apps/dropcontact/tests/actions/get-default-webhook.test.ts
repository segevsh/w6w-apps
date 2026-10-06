import { assertEquals, assertRejects } from "@std/assert";
import getHook from "../../actions/get-default-webhook.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("get-default-webhook: GETs the webhook route and surfaces callback_url", async () => {
  const { ctx, calls } = mockCtx([{
    body: { error: false, success: true, callback_url: "https://h.example/cb" },
  }]);
  const out = await run(getHook, {}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.dropcontact.com/v1/enrich/webhook");
  assertEquals(out.callbackUrl, "https://h.example/cb");
  const bare = await run(getHook, {}, mockCtx([{ body: { error: false, success: true } }]).ctx);
  assertEquals(bare.callbackUrl, undefined);
});

Deno.test("get-default-webhook: 401 throws", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: true, reason: "Unknown account" } }]);
  await assertRejects(() => run(getHook, {}, ctx), Error, "Unknown account");
});
