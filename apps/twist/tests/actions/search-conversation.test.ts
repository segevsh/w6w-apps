import { assert, assertEquals } from "@std/assert";
import searchConversation from "../../actions/search-conversation.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("search-conversation: GET /api/v3/search/conversation with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  const out = await searchConversation.execute({
    "conversationId": 100,
    "query": "sample query",
    "fromUserId": 102,
    "beforeTs": 103,
    "afterTs": 104,
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/search/conversation");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(queryOf(calls[0].url), {
    "conversation_id": "100",
    "query": "sample query",
    "from_user_id": "102",
    "before_ts": "103",
    "after_ts": "104",
  });
  assertEquals(out, { "id": 7, "name": "Sample" });
});

Deno.test("search-conversation: omits optional parameters that are not set", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await searchConversation.execute({ "conversationId": 100, "query": "sample query" }, ctx);

  assertEquals(queryOf(calls[0].url), { "conversation_id": "100", "query": "sample query" });
});

Deno.test("search-conversation: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await searchConversation.execute({
    "conversationId": 100,
    "query": "sample query",
    "fromUserId": 102,
    "beforeTs": 103,
    "afterTs": 104,
  }, ctx);

  assert(!("authorization" in calls[0].headers));
});

Deno.test("search-conversation: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await searchConversation.execute({ "conversationId": 100, "query": "sample query" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
