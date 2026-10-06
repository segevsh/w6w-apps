import { assert, assertEquals, assertRejects } from "@std/assert";
import chatCompletion from "../../actions/chat-completion.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

const reply = {
  id: "c1",
  model: "gpt-4o",
  choices: [{ message: { role: "assistant", content: "Hi" }, finish_reason: "stop" }],
  usage: { total_tokens: 5 },
};

Deno.test("chat-completion: a prompt becomes system + user messages", async () => {
  const { ctx, calls } = mockCtx([{ body: reply }]);
  const out = await chatCompletion.execute({
    model: "openai/gpt-4o",
    prompt: "Hello",
    systemPrompt: "Be brief",
    temperature: 0,
    maxTokens: 50,
  }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v3/chat/completions");
  assertEquals(calls[0].method, "POST");
  const body = bodyOf(calls[0]);
  assertEquals(body.model, "openai/gpt-4o");
  assertEquals(body.messages, [
    { role: "system", content: "Be brief" },
    { role: "user", content: "Hello" },
  ]);
  assertEquals(body.temperature, 0);
  assertEquals(body.max_tokens, 50);
  assert(!("stream" in body));
  assertEquals(out.content, "Hi");
  assertEquals(out.finishReason, "stop");
});

Deno.test("chat-completion: explicit messages win, extra body merges, routing and fallbacks map", async () => {
  const { ctx, calls } = mockCtx([{ body: reply }]);
  await chatCompletion.execute({
    model: "gpt-4o",
    prompt: "ignored",
    messages: '[{"role":"user","content":"x"}]',
    extraBody: { top_p: 0.5 },
    routingSort: "speed",
    fallbacks: "openai/gpt-4o-mini, anthropic/x",
    reasoningEffort: "low",
  }, ctx);
  const body = bodyOf(calls[0]);
  assertEquals(body.messages, [{ role: "user", content: "x" }]);
  assertEquals(body.top_p, 0.5);
  assertEquals(body.routing, { sort: "speed" });
  assertEquals(body.fallbacks, ["openai/gpt-4o-mini", "anthropic/x"]);
  assertEquals(body.reasoning_effort, "low");
});

Deno.test("chat-completion: no prompt and no messages fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await chatCompletion.execute({ model: "m" }, ctx),
    Error,
    "Prompt or Messages",
  );
  assertEquals(calls.length, 0);
});

Deno.test("chat-completion: a null reply (tool call) yields empty content and the tool calls", async () => {
  const { ctx } = mockCtx([{
    body: {
      id: "c",
      model: "m",
      choices: [{ message: { content: null, tool_calls: [{ id: "t" }] } }],
    },
  }]);
  const out = await chatCompletion.execute({ model: "m", prompt: "p" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(out.content, "");
  assertEquals(out.toolCalls, [{ id: "t" }]);
});

Deno.test("chat-completion: a vendor error surfaces its detail", async () => {
  const { ctx } = mockCtx([{ status: 402, body: { detail: "Insufficient credits" } }]);
  await assertRejects(
    async () => await chatCompletion.execute({ model: "m", prompt: "p" }, ctx),
    Error,
    "Insufficient credits",
  );
});
