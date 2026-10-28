import { assertEquals } from "@std/assert";
import { mockJiraCtx } from "../_helpers.ts";
import action from "../../actions/user-get.ts";

Deno.test("user-get: GETs /user with the accountId query param", async () => {
  const { ctx, calls } = mockJiraCtx([{ body: { accountId: "a1" } }]);
  await action.execute({ accountId: "a1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/rest/api/3/user");
  assertEquals(new URL(calls[0].url).searchParams.get("accountId"), "a1");
});
