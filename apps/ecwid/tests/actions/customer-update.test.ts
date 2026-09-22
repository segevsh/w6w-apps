import { assertEquals } from "@std/assert";
import customerUpdate from "../../actions/customer-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("customer-update: PUTs a partial body and returns updateCount", async () => {
  const { ctx, calls } = mockCtx([{ body: { updateCount: 1 } }]);
  const out = await customerUpdate.execute(
    { customerId: "177737165", acceptMarketing: true, lang: "nl" },
    ctx,
  ) as { updateCount: number };

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/v3/1003/customers/177737165");
  assertEquals(JSON.parse(calls[0].body ?? "{}"), { acceptMarketing: true, lang: "nl" });
  assertEquals(out.updateCount, 1);
});

Deno.test("customer-update: addresses and contacts replace, so they go out whole", async () => {
  const { ctx, calls } = mockCtx([{ body: { updateCount: 1 } }]);
  await customerUpdate.execute(
    {
      customerId: "1",
      shippingAddresses: [{ countryCode: "NL", city: "Utrecht" }],
      contacts: [{ type: "EMAIL", contact: "buyer@example.com" }],
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body.shippingAddresses, [{ countryCode: "NL", city: "Utrecht" }]);
  assertEquals(body.contacts, [{ type: "EMAIL", contact: "buyer@example.com" }]);
});

Deno.test("customer-update: b2b_b2c is create-only, so it is not declared here", () => {
  const keys = (customerUpdate.params ?? []).map((p) => p.key);
  assertEquals(keys.includes("b2b_b2c"), false);
  assertEquals(keys.includes("customerId"), true);
});
