import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-get.ts";

const USER = {
  id: "u1",
  email: "a@b.com",
  fullName: "Ada B",
  organizationId: "org1",
  subscriptionPlan: "PRO",
};

test("user-get: GETs /users/me and surfaces the identity fields", async () => {
  const { ctx, calls } = mockCtx([{ body: USER }]);
  const result = await action.execute({}, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/users/me");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(result.id, "u1");
  assertEquals(result.email, "a@b.com");
  assertEquals(result.organizationId, "org1");
  assertEquals(result.subscriptionPlan, "PRO");
  assertEquals(result.user, USER);
});

test("user-get: forwards the optional timezone", async () => {
  const { ctx, calls } = mockCtx([{ body: USER }]);
  await action.execute({ timezone: "Europe/Brussels" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("timezone"), "Europe/Brussels");
});
