import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockOktaCtx } from "../_helpers.ts";
import action from "../../actions/user-deactivate.ts";

test("user-deactivate: POSTs lifecycle/deactivate with sendEmail", async () => {
  const { ctx, calls } = mockOktaCtx([{ status: 202 }]);
  await action.execute({ userId: "00u1", sendEmail: true }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(
    calls[0].url,
    "https://dev-1.okta.com/api/v1/users/00u1/lifecycle/deactivate?sendEmail=true",
  );
});

test("user-deactivate: defaults sendEmail to false", async () => {
  const { ctx, calls } = mockOktaCtx([{ status: 202 }]);
  await action.execute({ userId: "00u1" }, ctx);
  assertEquals(
    calls[0].url,
    "https://dev-1.okta.com/api/v1/users/00u1/lifecycle/deactivate?sendEmail=false",
  );
});

test("user-deactivate: says plainly it cannot be undone", () => {
  assert(action.description?.toLowerCase().includes("unwinds"));
});
