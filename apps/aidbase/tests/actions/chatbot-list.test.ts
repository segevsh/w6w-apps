import { assert, assertEquals, assertRejects } from "@std/assert";
import chatbotList from "../../actions/chatbot-list.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = {};
const run = (
  ctx: Parameters<typeof chatbotList.execute>[1],
  input: Record<string, unknown> = sample,
) => chatbotList.execute(input as never, ctx) as Promise<unknown>;

Deno.test("chatbot-list: declares a read action with a description, params and output", () => {
  assertEquals(chatbotList.key, "chatbot-list");
  assertEquals(chatbotList.type, "read");
  assert((chatbotList.description ?? "").length > 0);
  assert(Array.isArray(chatbotList.output) && chatbotList.output.length > 0);
});

Deno.test("chatbot-list: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "data": [{ "id": "a1" }, { "id": "a2" }] },
  }]);
  const out = await run(ctx);
  assertEquals(out, { "items": [{ "id": "a1" }, { "id": "a2" }], "count": 2 });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/chatbots");
  assertEquals(calls[0].url.startsWith("https://api.aidbase.ai/v1/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("chatbot-list: an Aidbase failure body is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errBody("API key is missing a scope") }]);
  await assertRejects(() => run(ctx), Error, "API key is missing a scope");
});
