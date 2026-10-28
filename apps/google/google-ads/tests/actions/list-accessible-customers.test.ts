import { assert, assertEquals } from "@std/assert";
import { mockAdsCtx } from "../_helpers.ts";
import action from "../../actions/list-accessible-customers.ts";

Deno.test("list-accessible-customers: GETs the customer-id-free endpoint", async () => {
  const { ctx, calls } = mockAdsCtx([{
    status: 200,
    body: { resourceNames: ["customers/1234567890", "customers/2222222222"] },
  }]);
  const out = await action.execute({} as never, ctx);
  assertEquals(out, { resourceNames: ["customers/1234567890", "customers/2222222222"] });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://googleads.googleapis.com/v25/customers:listAccessibleCustomers",
  );
  // This is the one endpoint that takes no customer id — the path must not
  // acquire one from the connection.
  assert(!calls[0].url.includes("/customers/"));
});

Deno.test("list-accessible-customers: works without a connection customer id", async () => {
  const { ctx } = mockAdsCtx([{ status: 200, body: { resourceNames: [] } }], {});
  assertEquals(await action.execute({} as never, ctx), { resourceNames: [] });
});

Deno.test("list-accessible-customers: is a read with no params", () => {
  assertEquals(action.type, "read");
  assertEquals(action.params, []);
});
