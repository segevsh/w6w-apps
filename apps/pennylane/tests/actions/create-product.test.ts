import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-product.ts";

Deno.test("create-product: POSTs /products with the three required fields as strings", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await action.execute({ label: "Product 1", price_before_tax: "100.00", vat_rate: "FR_200" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/external/v2/products");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent, { label: "Product 1", price_before_tax: "100.00", vat_rate: "FR_200" });
  assertEquals(typeof sent.price_before_tax, "string", "a JSON number is a documented 400");
});

Deno.test("create-product: forwards custom_fields and substance untouched", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await action.execute({
    label: "Product 1",
    price_before_tax: "100.00",
    vat_rate: "FR_200",
    unit: "piece",
    currency: "EUR",
    ledger_account_id: 1255,
    substance: "services",
    custom_fields: [{ name: "color", value: "red" }],
  }, ctx);

  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.custom_fields, [{ name: "color", value: "red" }]);
  assertEquals(sent.substance, "services");
  assertEquals(Object.keys(sent).sort(), [
    "currency",
    "custom_fields",
    "label",
    "ledger_account_id",
    "price_before_tax",
    "substance",
    "unit",
    "vat_rate",
  ]);
});
