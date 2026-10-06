import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/customer-update.ts";

const conn = { display: { tenantId: "42", environment: "production" } };

Deno.test("customer-update: PATCHes only the supplied fields, address nested", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 7 } }], conn);
  await action.execute!({ id: 7, name: "New", city: "Reno", active: false }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(calls[0].url, "https://api.servicetitan.io/crm/v2/tenant/42/customers/7");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "New",
    active: false,
    address: { city: "Reno" },
  });
});

Deno.test("customer-update: with nothing but an id the body is empty, with no address key", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 7 } }], conn);
  await action.execute!({ id: 7 }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {});
});
