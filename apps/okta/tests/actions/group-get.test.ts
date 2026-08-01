import { assertEquals } from "@std/assert";
import { mockOktaCtx } from "../_helpers.ts";
import action from "../../actions/group-get.ts";

Deno.test("group-get: GETs /groups/{id}", async () => {
  const { ctx, calls } = mockOktaCtx([{ body: { id: "00g1" } }]);
  await action.execute({ groupId: "00g1" }, ctx);
  assertEquals(calls[0].url, "https://dev-1.okta.com/api/v1/groups/00g1");
});
