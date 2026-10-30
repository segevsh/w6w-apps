import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/department-list.ts";

const conn = { display: { environment: "production", companyId: "co-1" } };

test("department-list: reads the company's departments", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ uuid: "d1", title: "Support" }] }], conn);
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/companies/co-1/departments");
});
