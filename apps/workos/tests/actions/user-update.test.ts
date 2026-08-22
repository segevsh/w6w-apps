import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-update.ts";

/**
 * Setting verification FALSE locks password sign-in without deleting the
 * account or its history, which is the under-used direction.
 */
Deno.test("user-update: can set verification false as well as true", async () => {
  const off = mockCtx([{ status: 200, body: { id: "user_1" } }]);
  await action.execute!({ userId: "user_1", emailVerified: "false" }, off.ctx);
  assertEquals(JSON.parse(off.calls[0].body!), { email_verified: false });

  const on = mockCtx([{ status: 200, body: { id: "user_1" } }]);
  await action.execute!({ userId: "user_1", emailVerified: "true" }, on.ctx);
  assertEquals(JSON.parse(on.calls[0].body!), { email_verified: true });
});

Deno.test("user-update: leaving verification unchanged omits the field entirely", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "user_1" } }]);
  await action.execute!({ userId: "user_1", firstName: "Ada", emailVerified: "" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { first_name: "Ada" });
});

Deno.test("user-update: an empty update is refused rather than sent", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ userId: "user_1" }, ctx),
    Error,
    "nothing to update",
  );
  assertEquals(calls.length, 0);
});

Deno.test("user-update: needs a user id", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ firstName: "Ada" }, ctx),
    Error,
    "userId",
  );
});
