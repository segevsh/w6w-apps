import { assertEquals } from "@std/assert";
import action from "../../actions/customer-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("customer-list: GET /customers maps params to the vendor's query names", async () => {
  const { ctx, calls } = mockCtx([{ body: { customers: [{ id: "a" }], cursor: "c2" } }]);
  const out = await action.execute({ email: "a@b.co", customerIds: "c1" }, ctx) as {
    customers: unknown[];
    cursor?: string;
  };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1.0/customers");
  assertEquals(queryOf(calls[0].url), { email: "a@b.co", customer_ids: "c1" });
  assertEquals(out.customers.length, 1);
  assertEquals(out.cursor, "c2");
});

Deno.test("customer-list: no params sends no query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { customers: [] } }]);
  const out = await action.execute({}, ctx) as { cursor?: string };
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(out.cursor, undefined);
});
