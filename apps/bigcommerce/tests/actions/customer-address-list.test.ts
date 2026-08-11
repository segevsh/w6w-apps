import { assertEquals } from "@std/assert";
import customerAddressList from "../../actions/customer-address-list.ts";
import { mockCtx, pathOf, queryOf, v3Page } from "../_helpers.ts";

Deno.test("customer-address-list: is addressed at the TOP level, not under a customer", async () => {
  const { ctx, calls } = mockCtx([{ body: v3Page([{ id: 3, customer_id: 12 }]) }]);
  const out = await customerAddressList.execute({ customerIds: "12,13" }, ctx);

  assertEquals(pathOf(calls[0].url), "/stores/abc123/v3/customers/addresses");
  assertEquals(queryOf(calls[0].url), { "customer_id:in": "12,13" });
  assertEquals(out.data.length, 1);
});

Deno.test("customer-address-list: include has exactly one legal value here", async () => {
  const { ctx, calls } = mockCtx([{ body: v3Page([]) }]);
  await customerAddressList.execute({ includeFormFields: true }, ctx);
  assertEquals(queryOf(calls[0].url), { include: "formfields" });

  const off = mockCtx([{ body: v3Page([]) }]);
  await customerAddressList.execute({ includeFormFields: false }, off.ctx);
  assertEquals(queryOf(off.calls[0].url), {});
});
