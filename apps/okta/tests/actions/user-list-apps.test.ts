import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockOktaCtx } from "../_helpers.ts";
import action from "../../actions/user-list-apps.ts";

test("user-list-apps: GETs /users/{id}/appLinks", async () => {
  const { ctx, calls } = mockOktaCtx([{ body: [{ id: "0oa1", label: "Salesforce" }] }]);
  await action.execute({ userId: "00u1" }, ctx);
  assertEquals(calls[0].url, "https://dev-1.okta.com/api/v1/users/00u1/appLinks");
});
