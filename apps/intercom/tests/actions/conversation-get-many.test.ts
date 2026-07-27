import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/conversation-get-many.ts";

Deno.test("conversation-get-many: GETs /conversations with cursor pagination", async () => {
  const { ctx, calls } = mockCtx([{ body: { conversations: [], pages: {} } }]);
  await action.execute!({ perPage: 50, startingAfter: "cur" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/conversations");
  assertEquals(url.searchParams.get("per_page"), "50");
  assertEquals(url.searchParams.get("starting_after"), "cur");
});

Deno.test("conversation-get-many: defaults per_page to 20", async () => {
  const { ctx, calls } = mockCtx([{ body: { conversations: [] } }]);
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("per_page"), "20");
});
