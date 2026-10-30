import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockOktaCtx } from "../_helpers.ts";
import action from "../../actions/user-reactivate.ts";

test("user-reactivate: POSTs lifecycle/reactivate with sendEmail", async () => {
  const { ctx, calls } = mockOktaCtx([{ body: { activationToken: "tok" } }]);
  await action.execute({ userId: "00u1", sendEmail: false }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(
    calls[0].url,
    "https://dev-1.okta.com/api/v1/users/00u1/lifecycle/reactivate?sendEmail=false",
  );
});

test("user-reactivate: defaults sendEmail to true", async () => {
  const { ctx, calls } = mockOktaCtx([{ body: {} }]);
  await action.execute({ userId: "00u1" }, ctx);
  assertEquals(
    calls[0].url,
    "https://dev-1.okta.com/api/v1/users/00u1/lifecycle/reactivate?sendEmail=true",
  );
});
