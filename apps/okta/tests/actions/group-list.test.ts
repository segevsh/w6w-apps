import { assertEquals } from "@std/assert";
import { mockOktaCtx } from "../_helpers.ts";
import action from "../../actions/group-list.ts";

Deno.test("group-list: GETs /groups with q and limit", async () => {
  const { ctx, calls } = mockOktaCtx([{ body: [{ id: "00g1" }] }]);
  await action.execute({ q: "Eng", limit: 5 }, ctx);
  assertEquals(calls[0].url, "https://dev-1.okta.com/api/v1/groups?q=Eng&limit=5");
});
