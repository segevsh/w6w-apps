import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/identity-get.ts";

Deno.test("identity-get: returns /api/v1/me's body directly, unwrapped", async () => {
  const { ctx, calls } = mockCtx([{
    body: { id: "t2_abc", name: "acme", link_karma: 10, comment_karma: 5 },
  }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://oauth.reddit.com/api/v1/me");
  assertEquals(out, { id: "t2_abc", name: "acme", link_karma: 10, comment_karma: 5 });
});

Deno.test("identity-get: takes no params", () => {
  assertEquals(action.params, []);
});
