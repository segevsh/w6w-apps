import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/chat-complete.ts";

Deno.test("chat-complete: calls POST /v1/chat/completions on api.x.ai and returns the body", async () => {
  const reply = { ok: true };
  const { ctx, calls } = mockCtx([{ body: reply }]);
  const result = await action.execute!({
    model: "grok-x",
    prompt: "hi",
    system: "be brief",
    temperature: 0.2,
    maxCompletionTokens: 50,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.x.ai");
  assertEquals(url.pathname, "/v1/chat/completions");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["authorization"], undefined);
  const b = JSON.parse(calls[0].body!);
  assertEquals(b.model, "grok-x");
  assertEquals(b.messages, [{ role: "system", content: "be brief" }, {
    role: "user",
    content: "hi",
  }]);
  assertEquals(b.temperature, 0.2);
  assertEquals(b.max_completion_tokens, 50);
  assertEquals("top_p" in b, false);
  assertEquals(result, reply);
});

Deno.test("chat-complete: surfaces the vendor error code on failure", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "invalid-argument", error: "bad" } }]);
  let message = "";
  try {
    await action.execute!({
      model: "grok-x",
      prompt: "hi",
      system: "be brief",
      temperature: 0.2,
      maxCompletionTokens: 50,
    }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("400") && message.includes("[invalid-argument]"), message);
});

Deno.test("chat-complete: messages override prompt; missing both throws; bad JSON throws", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    { model: "m", prompt: "ignored", messages: '[{"role":"user","content":"x"}]' },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).messages, [{ role: "user", content: "x" }]);
  let err = "";
  try {
    await action.execute!({ model: "m" }, mockCtx().ctx);
  } catch (e) {
    err = (e as Error).message;
  }
  assert(err.includes("Messages or Prompt"));
  try {
    await action.execute!({ model: "m", messages: "[oops" }, mockCtx().ctx);
  } catch (e) {
    err = (e as Error).message;
  }
  assert(err.includes("valid JSON"));
});

Deno.test("chat-complete: is a non-idempotent perform action", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});
