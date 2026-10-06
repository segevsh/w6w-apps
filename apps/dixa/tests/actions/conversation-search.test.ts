import { assert, assertEquals } from "@std/assert";
import conversationSearch from "../../actions/conversation-search.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("conversation-search: calls GET /v1/search/conversations", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "data": [{ "id": 9, "highlights": {} }], "meta": {} },
  }]);
  const out = await conversationSearch.execute(
    { "query": "refund", "exactMatch": true, "pageKey": "k1" } as never,
    ctx,
  );

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).origin, "https://dev.dixa.io");
  assertEquals(pathOf(calls[0].url), "/v1/search/conversations");
  assertEquals(queryOf(calls[0].url), { "query": "refund", "exactMatch": "true", "pageKey": "k1" });
  // Credentials belong to `sign`; an action never sets them.
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, { data: [{ "id": 9, "highlights": {} }] });
});

Deno.test("conversation-search: surfaces a Dixa error message with the status", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { message: "Invalid value for: body" } }]);
  let message = "";
  try {
    await conversationSearch.execute(
      { "query": "refund", "exactMatch": true, "pageKey": "k1" } as never,
      ctx,
    );
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("Dixa 400"), message);
  assert(message.includes("Invalid value for: body"), message);
});

Deno.test("conversation-search: rejects bad input before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await conversationSearch.execute({ "query": " " } as never, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("query is required"), message);
  assertEquals(calls.length, 0);
});
