import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/company-admin-list.ts";

const conn = { display: { environment: "production", companyId: "co-1" } };

Deno.test("company-admin-list: reads the company's admins", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ uuid: "a1" }] }], conn);
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/companies/co-1/admins");
});
