import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/employee-update.ts";

const conn = { display: { environment: "production", companyId: "co-1" } };

Deno.test("employee-update: sends the version with the changed fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { uuid: "e1" } }], conn);
  await action.execute!({ employeeId: "e1", version: "v-abc", firstName: "Ada" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { version: "v-abc", first_name: "Ada" });
});

/**
 * The lock is the point: this action asks for the version rather than fetching
 * it, because re-reading and forcing the write would defeat it.
 */
Deno.test("employee-update: refuses without a version, and says why", async () => {
  const { ctx, calls } = mockCtx([], conn);
  const err = await assertRejects(
    async () => await action.execute!({ employeeId: "e1", firstName: "Ada" }, ctx),
    Error,
  );
  assert(/version/.test(String(err)), String(err));
  assert(/never saw/.test(String(err)), String(err));
  assertEquals(calls.length, 0);
});

Deno.test("employee-update: does not fetch the version itself", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({ employeeId: "e1", version: "v", lastName: "L" }, ctx);
  // One call: the write. No read-then-force.
  assertEquals(calls.length, 1);
});

Deno.test("employee-update: an empty update is refused rather than sent", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ employeeId: "e1", version: "v" }, ctx),
    Error,
    "nothing to update",
  );
  assertEquals(calls.length, 0);
});

/** An SSN moving through a workflow is a liability nobody asked for. */
Deno.test("employee-update: offers no SSN field", () => {
  const keys = (action.params as Array<{ key: string }>).map((p) => p.key);
  assert(!keys.some((k) => /ssn/i.test(k)), keys.join(","));
});
