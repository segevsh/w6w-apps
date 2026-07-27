import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/conversation-get.ts";

Deno.test("conversation-get: GETs /conversations/{id} with display_as", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "42" } }]);
  await action.execute!({ conversationId: "42", displayAs: "plaintext" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/conversations/42");
  assertEquals(url.searchParams.get("display_as"), "plaintext");
  assertEquals(calls[0].method, "GET");
});
