import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/organization-update.ts";

test("organization-update: PATCHes only name/slug", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "org_1" } }]);
  await action.execute!({ organizationId: "org_1", slug: "acme-inc" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { slug: "acme-inc" });
});

test("organization-update: refuses a call with nothing to change", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(
    async () => await action.execute!({ organizationId: "org_1" }, ctx),
    Error,
  );
  assert(/name or a slug/.test(String(err)), String(err));
  assertEquals(calls.length, 0);
});
