import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/organization-delete.ts";

/**
 * Deleting takes the SSO connection, the directory and every membership with
 * it — in practice locking a customer's whole staff out, with no undo.
 */
test("organization-delete: refuses without the confirmation, and says why", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ organizationId: "org_1" }, ctx),
    Error,
    "cannot be undone",
  );
  assertEquals(calls.length, 0);
});

test("organization-delete: confirmed, it deletes and warns", async () => {
  const { ctx, calls, logs } = mockCtx([{ status: 204 }]);
  assertEquals(await action.execute!({ organizationId: "org_1", confirm: true }, ctx), {
    ok: true,
  });
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://api.workos.com/organizations/org_1");
  assert(logs.some((l) => l.level === "warn"), JSON.stringify(logs));
});

test("organization-delete: needs an id even with the confirmation set", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ confirm: true }, ctx),
    Error,
    "organizationId",
  );
  assertEquals(calls.length, 0);
});
