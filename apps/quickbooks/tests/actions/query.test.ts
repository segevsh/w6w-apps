import { assertEquals } from "@std/assert";
import { mockQuickBooksCtx } from "../_helpers.ts";
import action from "../../actions/query.ts";

Deno.test("query: forwards the raw statement verbatim to /query", async () => {
  const { ctx, calls } = mockQuickBooksCtx([{ body: { QueryResponse: {} } }]);
  await action.execute({ query: "SELECT * FROM JournalEntry MAXRESULTS 50" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/company/123145/query");
  assertEquals(url.searchParams.get("query"), "SELECT * FROM JournalEntry MAXRESULTS 50");
});
