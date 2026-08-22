import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/token-info.ts";

const conn = { display: { environment: "production", companyId: "co-1" } };

/** The only call needing neither a company id nor a permission. */
Deno.test("token-info: reads the introspection route", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { resource: { type: "Company" } } }], conn);
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/token_info");
  assertEquals((action.params ?? []).length, 0);
});
