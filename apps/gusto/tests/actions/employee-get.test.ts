import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/employee-get.ts";

const conn = { display: { environment: "production", companyId: "co-1" } };

Deno.test("employee-get: reads one employee", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { uuid: "e1", version: "v" } }], conn);
  await action.execute!({ employeeId: "e1", include: "all_compensations" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/employees/e1");
  assertEquals(url.searchParams.get("include"), "all_compensations");
});

Deno.test("employee-get: a missing id is refused", async () => {
  const { ctx } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "employeeId");
});

/** It is the read half of read-then-write. */
Deno.test("employee-get: the description points at the version", () => {
  assert(/version/i.test(action.description!), action.description);
});
