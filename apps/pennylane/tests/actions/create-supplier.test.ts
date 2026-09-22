import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-supplier.ts";

Deno.test("create-supplier: POSTs /suppliers with just the required name", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 3, name: "Papeterie SARL" } }]);
  await action.execute({ name: "Papeterie SARL" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/external/v2/suppliers");
  assertEquals(JSON.parse(calls[0].body!), { name: "Papeterie SARL" });
});

Deno.test("create-supplier: forwards the French identifiers, address, IBAN and payment terms", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 3 } }]);
  await action.execute({
    name: "Papeterie SARL",
    establishment_no: "12345678900012",
    reg_no: "123456789",
    postal_address: {
      address: "2 avenue Victor Hugo",
      postal_code: "75116",
      city: "Paris",
      country_alpha2: "FR",
    },
    vat_number: "FR12345678901",
    ledger_account: { number: "401000" },
    emails: ["factures@papeterie.example"],
    iban: "FR1420041010050500013M02606",
    supplier_payment_method: "automatic_transfer",
    supplier_due_date_delay: 30,
    supplier_due_date_rule: "days_or_end_of_month",
    external_reference: "supplier-1",
  }, ctx);

  const sent = JSON.parse(calls[0].body!);
  assertEquals(Object.keys(sent).sort(), [
    "emails",
    "establishment_no",
    "external_reference",
    "iban",
    "ledger_account",
    "name",
    "postal_address",
    "reg_no",
    "supplier_due_date_delay",
    "supplier_due_date_rule",
    "supplier_payment_method",
    "vat_number",
  ]);
  assertEquals(sent.supplier_due_date_delay, 30);
  assertEquals(sent.postal_address.city, "Paris");
});
