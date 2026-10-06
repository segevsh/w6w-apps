import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/technician-list.ts";

const conn = { display: { tenantId: "42", environment: "production" } };

Deno.test("technician-list: GETs /settings/v2/tenant/{t}/technicians", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }], conn);
  await action.execute!({ name: "Lee", active: "Any" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(
    url.origin + url.pathname,
    "https://api.servicetitan.io/settings/v2/tenant/42/technicians",
  );
  assertEquals(url.searchParams.get("name"), "Lee");
  assertEquals(url.searchParams.get("active"), "Any");
});
