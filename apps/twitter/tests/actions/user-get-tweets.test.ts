import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-get-tweets.ts";

Deno.test("user-get-tweets: GETs /users/{id}/tweets", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ id: "1" }], meta: {} } }]);
  const out = await action.execute({ userId: "42", maxResults: 5 }, ctx);
  assertEquals(calls[0].url, "https://api.x.com/2/users/42/tweets?max_results=5");
  assertEquals(out, { data: [{ id: "1" }], meta: {} });
});
