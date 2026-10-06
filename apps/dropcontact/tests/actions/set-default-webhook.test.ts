import { assertEquals, assertRejects } from "@std/assert";
import setHook from "../../actions/set-default-webhook.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("set-default-webhook: PUTs callback_url", async () => {
  const { ctx, calls } = mockCtx([{ body: { error: false, success: true } }]);
  const out = await run(setHook, { callbackUrl: " https://h.example/cb " }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { callback_url: "https://h.example/cb" });
  assertEquals(out.callbackUrl, "https://h.example/cb");
});

Deno.test("set-default-webhook: a non-http URL throws before any request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(() => run(setHook, { callbackUrl: "ftp://x" }, ctx), Error, "http(s)");
  assertEquals(calls.length, 0);
});
