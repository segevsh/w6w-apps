import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/employee-home-address-list.ts";

const conn = { display: { environment: "production", companyId: "co-1" } };

Deno.test("employee-home-address-list: reads the address history", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ uuid: "h1" }] }], conn);
  await action.execute!({ employeeId: "e1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/employees/e1/home_addresses");
});

Deno.test("employee-home-address-list: a missing employee is refused", async () => {
  const { ctx } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "employeeId");
});

/** Writing an address changes tax withholding — read-only on purpose. */
Deno.test("employee-home-address-list: is a read action", () => {
  assertEquals(action.type, "read");
  assert(/history/i.test(action.description!), action.description);
});
