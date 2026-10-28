import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { BASE, ok } from "./_shared.ts";
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
  const { ctx, calls } = mockCtx([reply]);
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
  const { ctx, calls } = mockCtx([reply]);
  await action.execute!({ model: "m", messages: JSON.stringify(messages) }, ctx);
  assertEquals(JSON.parse(calls[0].body!).messages, messages);
});

Deno.test("chat: structured format is sent and the content parsed", async () => {
  const { ctx, calls } = mockCtx([
    ok({ message: { role: "assistant", content: '{"ok":true}' }, done: true }),
  ]);
  const result = await action.execute!({ model: "m", messages, format: "json" }, ctx) as {
    parsed: unknown;
  };
  assertEquals(JSON.parse(calls[0].body!).format, "json");
  assertEquals(result.parsed, { ok: true });
});

Deno.test("chat: tool calls are surfaced, tools forwarded, and no keep_alive is sent", async () => {
  const toolCalls = [{ function: { name: "weather", arguments: { city: "Oslo" } } }];
  const { ctx, calls } = mockCtx([
    ok({ message: { role: "assistant", content: "", tool_calls: toolCalls }, done: true }),
  ]);
  const tools = [{ type: "function", function: { name: "weather", parameters: {} } }];
  const result = await action.execute!({ model: "m", messages, tools }, ctx) as {
    toolCalls: unknown;
  };
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.tools, tools);
  assertEquals("keep_alive" in body, false);
  assertEquals(result.toolCalls, toolCalls);
});

Deno.test("chat: rejects bad messages before any request", async () => {
  const { ctx, calls } = mockCtx([]);
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

Deno.test("chat: a 401 is explained as a rejected key", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "Unauthorized" }]);
  const err = await assertRejects(async () => await action.execute!({ model: "m", messages }, ctx));
  assert(/API key/.test((err as Error).message), (err as Error).message);
});
