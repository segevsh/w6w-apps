import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-update-metadata.ts";

Deno.test("user-update-metadata: PATCHes the dedicated /metadata endpoint", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "user_1" } }]);
  await action.execute!({ userId: "user_1", publicMetadata: '{"plan":"pro"}' }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).pathname, "/v1/users/user_1/metadata");
  assertEquals(JSON.parse(calls[0].body!), { public_metadata: { plan: "pro" } });
});

/** A key set to `null` at any depth is Clerk's own documented way to delete it during a merge. */
Deno.test("user-update-metadata: a null value survives compact() to reach Clerk", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "user_1" } }]);
  await action.execute!({ userId: "user_1", publicMetadata: '{"plan":null}' }, ctx);
  assertEquals(JSON.parse(calls[0].body!).public_metadata, { plan: null });
});

Deno.test("user-update-metadata: refuses a call with nothing to merge", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(
    async () => await action.execute!({ userId: "user_1" }, ctx),
    Error,
  );
  assert(/at least one/.test(String(err)), String(err));
  assertEquals(calls.length, 0);
});
