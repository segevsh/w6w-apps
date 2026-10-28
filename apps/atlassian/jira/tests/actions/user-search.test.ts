import { assert, assertEquals } from "@std/assert";
import { mockJiraCtx } from "../_helpers.ts";
import action from "../../actions/user-search.ts";

Deno.test("user-search: GETs /user/search with the query", async () => {
  const { ctx, calls } = mockJiraCtx([{ body: [{ accountId: "a1" }] }]);
  assertEquals(await action.execute({ query: "jo" }, ctx), [{ accountId: "a1" }]);
  assertEquals(new URL(calls[0].url).pathname, "/rest/api/3/user/search");
  assertEquals(new URL(calls[0].url).searchParams.get("query"), "jo");
});

Deno.test("user-search: explains that account id is the only usable identifier", () => {
  assert(action.description?.includes("account ids"));
});
