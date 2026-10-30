import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/employee-get.ts";

const conn = { display: { environment: "production", companyId: "co-1" } };

test("employee-get: reads one employee", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { uuid: "e1", version: "v" } }], conn);
  await action.execute!({ employeeId: "e1", include: "all_compensations" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/employees/e1");
  assertEquals(url.searchParams.get("include"), "all_compensations");
});

test("employee-get: a missing id is refused", async () => {
  const { ctx } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "employeeId");
});

/** It is the read half of read-then-write. */
test("employee-get: the description points at the version", () => {
  assert(/version/i.test(action.description!), action.description);
});
