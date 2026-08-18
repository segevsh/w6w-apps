import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/chat-complete.ts";

const reply = {
  status: 200,
  body: {
    model: "meta-llama/Llama-3.3-70B-Instruct",
    choices: [{ message: { role: "assistant", content: "hello" }, finish_reason: "stop" }],
    usage: { prompt_tokens: 8, completion_tokens: 2, total_tokens: 10 },
  },
};

const messages = [{ role: "user", content: "hi" }];

/** OpenAI-compatible, which is the point — the same body and the same reply. */
Deno.test("chat-complete: posts an OpenAI-shaped body to the router", async () => {
  const { ctx, calls } = mockCtx([reply]);
  const result = await action.execute(
    { model: "meta-llama/Llama-3.3-70B-Instruct", messages },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls[0].url, "https://router.huggingface.co/v1/chat/completions");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.model, "meta-llama/Llama-3.3-70B-Instruct");
  assertEquals(body.messages, messages);
  assertEquals(result.content, "hello");
  assertEquals(result.finishReason, "stop");
  assertEquals(result.usage, { prompt_tokens: 8, completion_tokens: 2, total_tokens: 10 });
});

/** A router extension on an otherwise OpenAI-shaped body. */
Deno.test("chat-complete: a provider is pinned by suffixing the model", async () => {
  const { ctx, calls } = mockCtx([reply]);
  await action.execute({
    model: "meta-llama/Llama-3.3-70B-Instruct",
    messages,
    provider: "together",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).model, "meta-llama/Llama-3.3-70B-Instruct:together");
});

/** Zero means unset here, not deterministic. */
Deno.test("chat-complete: temperature and max tokens are omitted when left at zero", async () => {
  const unset = mockCtx([reply]);
  await action.execute({ model: "m", messages, temperature: 0, maxTokens: 0 }, unset.ctx);
  const omitted = JSON.parse(unset.calls[0].body!);
  assertEquals("temperature" in omitted, false);
  assertEquals("max_tokens" in omitted, false);

  const set = mockCtx([reply]);
  await action.execute({ model: "m", messages, temperature: 0.7, maxTokens: 256 }, set.ctx);
  const sent = JSON.parse(set.calls[0].body!);
  assertEquals(sent.temperature, 0.7);
  assertEquals(sent.max_tokens, 256);
});

Deno.test("chat-complete: extra parameters are merged, and cannot displace the model", async () => {
  const { ctx, calls } = mockCtx([reply]);
  await action.execute(
    { model: "m", messages, extra: { top_p: 0.9, model: "sneaky" } },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.top_p, 0.9);
  assertEquals(body.model, "m");
});

Deno.test("chat-complete: messages must be a non-empty array", async () => {
  for (const bad of [undefined, "", "[]", '{"role":"user"}']) {
    const { ctx, calls } = mockCtx([]);
    let message = "";
    try {
      await action.execute({ model: "m", messages: bad }, ctx);
    } catch (err) {
      message = String(err);
    }
    assert(/non-empty array/.test(message), `${bad}: ${message}`);
    assertEquals(calls.length, 0);
  }
});

Deno.test("chat-complete: a model is required", async () => {
  const { ctx } = mockCtx([]);
  let message = "";
  try {
    await action.execute({ messages }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/`model` is required/.test(message), message);
});

/**
 * A model that is not loaded answers 503 with an `estimated_time`; treating it
 * as an outage gives up on a model that would have answered.
 */
Deno.test("chat-complete: a cold start explains itself as a wait, not a failure", async () => {
  const { ctx } = mockCtx([{
    status: 503,
    body: { error: "Model is loading", estimated_time: 20 },
  }]);
  let message = "";
  try {
    await action.execute({ model: "m", messages }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/estimated_time/.test(message), message);
});

/** What answered may name the provider the router chose. */
Deno.test("chat-complete: reports the model that actually answered", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      model: "meta-llama/Llama-3.3-70B-Instruct:together",
      choices: [{ message: { content: "x" } }],
    },
  }]);
  const result = await action.execute(
    { model: "meta-llama/Llama-3.3-70B-Instruct", messages },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.model, "meta-llama/Llama-3.3-70B-Instruct:together");
});

/** Token counts are fine to log; the prompt and the reply are not. */
Deno.test("chat-complete: logs counts, never the prompt or the reply", async () => {
  const { ctx, logs } = mockCtx([reply]);
  await action.execute({ model: "m", messages: [{ role: "user", content: "a secret" }] }, ctx);
  const data = JSON.stringify(logs[0].data);
  assertEquals(data.includes("a secret"), false);
  assertEquals(data.includes("hello"), false);
  assert(/completionTokens/.test(data), data);
});

Deno.test("chat-complete: is not idempotent and says the router dispatches", () => {
  assertEquals(action.idempotent, false);
  assert(/DISPATCHES to a provider/.test(action.description!), action.description);
});
