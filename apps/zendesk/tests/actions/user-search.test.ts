import { assertEquals } from "@std/assert";
import { mockZendeskCtx } from "../_helpers.ts";
import action from "../../actions/user-search.ts";

Deno.test("user-search: GETs /users/search.json with the query", async () => {
  const { ctx, calls } = mockZendeskCtx([{ body: { users: [], count: 0 } }]);
  await action.execute({ query: "jo@acme.test" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/users/search.json");
  assertEquals(new URL(calls[0].url).searchParams.get("query"), "jo@acme.test");
});
