import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/garnishment-list.ts";

const conn = { display: { environment: "production", companyId: "co-1" } };

Deno.test("garnishment-list: reads an employee's garnishments", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ uuid: "g1" }] }], conn);
  await action.execute!({ employeeId: "e1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/employees/e1/garnishments");
});

Deno.test("garnishment-list: a missing employee is refused", async () => {
  const { ctx } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "employeeId");
});

/** They are court orders, not settings. */
Deno.test("garnishment-list: is read-only, and says so", () => {
  assertEquals(action.type, "read");
  assert(/[Rr]ead-only/.test(action.description!), action.description);
});
