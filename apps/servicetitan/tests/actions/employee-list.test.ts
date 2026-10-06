import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/employee-list.ts";

const conn = { display: { tenantId: "42", environment: "production" } };

Deno.test("employee-list: GETs /settings/v2/tenant/{t}/employees by exact email", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }], conn);
  await action.execute!({ email: "a@b.com" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(
    url.origin + url.pathname,
    "https://api.servicetitan.io/settings/v2/tenant/42/employees",
  );
  assertEquals(url.searchParams.get("email"), "a@b.com");
});
