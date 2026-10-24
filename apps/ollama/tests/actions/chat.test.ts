import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { BASE, display, ok } from "./_shared.ts";
import action from "../../actions/chat.ts";

const reply = ok({
  model: "llama3.2:3b",
  message: { role: "assistant", content: "Hello!" },
  done: true,
  done_reason: "stop",
  prompt_eval_count: 5,
  eval_count: 2,
});
const messages = [{ role: "user", content: "hi" }];

Deno.test("chat: posts the whole messages array to /api/chat with stream false", async () => {
  const { ctx, calls } = mockCtx([reply], { display });
  const result = await action.execute!({ model: "llama3.2:3b", messages }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls[0].url, `${BASE}/api/chat`);
  assertEquals(JSON.parse(calls[0].body!), { model: "llama3.2:3b", messages, stream: false });
  assertEquals(result.content, "Hello!");
  assertEquals(result.promptTokens, 5);
  assertEquals(result.completionTokens, 2);
});

Deno.test("chat: messages may arrive as a JSON string", async () => {
  const { ctx, calls } = mockCtx([reply], { display });
  await action.execute!({ model: "m", messages: JSON.stringify(messages) }, ctx);
  assertEquals(JSON.parse(calls[0].body!).messages, messages);
});

Deno.test("chat: structured format is sent and the content parsed", async () => {
  const { ctx, calls } = mockCtx([
    ok({ message: { role: "assistant", content: '{"ok":true}' }, done: true }),
  ], { display });
  const result = await action.execute!({ model: "m", messages, format: "json" }, ctx) as {
    parsed: unknown;
  };
  assertEquals(JSON.parse(calls[0].body!).format, "json");
  assertEquals(result.parsed, { ok: true });
});

Deno.test("chat: tool calls are surfaced and tools are forwarded", async () => {
  const toolCalls = [{ function: { name: "weather", arguments: { city: "Oslo" } } }];
  const { ctx, calls } = mockCtx([
    ok({ message: { role: "assistant", content: "", tool_calls: toolCalls }, done: true }),
  ], { display });
  const tools = [{ type: "function", function: { name: "weather", parameters: {} } }];
  const result = await action.execute!({ model: "m", messages, tools, keepAlive: "10m" }, ctx) as {
    toolCalls: unknown;
  };
  assertEquals(JSON.parse(calls[0].body!).tools, tools);
  assertEquals(JSON.parse(calls[0].body!).keep_alive, "10m");
  assertEquals(result.toolCalls, toolCalls);
});

Deno.test("chat: rejects bad messages before any request", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ model: "m", messages: [] }, ctx),
    Error,
    "non-empty",
  );
  await assertRejects(
    async () => await action.execute!({ model: "m", messages: [{ content: "x" }] }, ctx),
    Error,
    "`role`",
  );
  await assertRejects(
    async () => await action.execute!({ model: "m", messages: "{oops" }, ctx),
    Error,
    "JSON",
  );
  await assertRejects(
    async () => await action.execute!({ model: "m", messages, tools: { a: 1 } }, ctx),
    Error,
    "`tools`",
  );
  assertEquals(calls.length, 0);
});

Deno.test("chat: a proxy 401 is explained as not coming from Ollama", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "Unauthorized" }], { display });
  const err = await assertRejects(async () => await action.execute!({ model: "m", messages }, ctx));
  assert(/reverse proxy/.test((err as Error).message), (err as Error).message);
});
