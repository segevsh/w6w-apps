import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-message.ts";

Deno.test("create-message: calls POST /v1/messages on api.x.ai and returns the body", async () => {
  const reply = { ok: true };
  const { ctx, calls } = mockCtx([{ body: reply }]);
  const result = await action.execute!({ model: "grok-x", maxTokens: 64, prompt: "hi" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.x.ai");
  assertEquals(url.pathname, "/v1/messages");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["authorization"], undefined);
  const b = JSON.parse(calls[0].body!);
  assertEquals(b.max_tokens, 64);
  assertEquals(b.messages, [{ role: "user", content: "hi" }]);
  assertEquals(result, reply);
});

Deno.test("create-message: surfaces the vendor error code on failure", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "invalid-argument", error: "bad" } }]);
  let message = "";
  try {
    await action.execute!({ model: "grok-x", maxTokens: 64, prompt: "hi" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("400") && message.includes("[invalid-argument]"), message);
});
