import { assertEquals } from "@std/assert";
import { mockHighLevelCtx } from "../_helpers.ts";
import action from "../../actions/list-conversations.ts";

Deno.test("list-conversations: GETs /conversations/search with the conversations Version header", async () => {
  const { ctx, calls } = mockHighLevelCtx([{ body: { conversations: [] } }], "loc-1");
  await action.execute!({ contactId: "c1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/conversations/search");
  assertEquals(url.searchParams.get("locationId"), "loc-1");
  assertEquals(url.searchParams.get("contactId"), "c1");
  assertEquals(url.searchParams.get("status"), "all");
  assertEquals(calls[0].headers["version"], "2021-04-15");
});
