import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-get.ts";

Deno.test("user-get: the whoami takes no parameters, not even a team", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { user: { username: "acme" } } }], {
    display: { teamId: "team_abc" },
  });
  const result = await action.execute!({}, ctx);
  assertEquals(calls[0].url, "https://api.vercel.com/v2/user");
  assertEquals(action.params, []);
  assertEquals(result, { user: { username: "acme" } });
});
