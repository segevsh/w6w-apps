import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/reset-user-password.ts";

Deno.test("reset-user-password: PATCHes passwordProfile only", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute({ userId: "u1", newPassword: "S3cret!pw" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/users/u1");
  assertEquals(JSON.parse(calls[0].body!), {
    passwordProfile: { forceChangePasswordNextSignIn: true, password: "S3cret!pw" },
  });
  assertEquals(out, { reset: true, userId: "u1" });
});

Deno.test("reset-user-password: forceChange can be turned off", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute(
    { userId: "u1", newPassword: "x", forceChangePasswordNextSignIn: false },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).passwordProfile.forceChangePasswordNextSignIn, false);
});

Deno.test("reset-user-password: the password is neither logged nor returned", async () => {
  const { ctx, logs } = mockCtx([{ status: 204 }]);
  const out = await action.execute({ userId: "u1", newPassword: "S3cret!pw" }, ctx);
  assert(!JSON.stringify(logs).includes("S3cret!pw"));
  assert(!JSON.stringify(out).includes("S3cret!pw"));
});

Deno.test("reset-user-password: requires a password", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ userId: "u1", newPassword: "" }, ctx),
    Error,
    "required",
  );
  assertEquals(calls.length, 0);
});
