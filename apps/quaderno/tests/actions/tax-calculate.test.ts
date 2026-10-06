import { assertEquals } from "@std/assert";
import { mockQuadernoCtx } from "../_helpers.ts";
import action from "../../actions/tax-calculate.ts";

Deno.test("tax-calculate: calls the documented endpoint", async () => {
  const { ctx, calls } = mockQuadernoCtx([{ body: { name: "IVA", rate: 21, tax_amount: 21 } }]);
  const out = await action.execute({ toCountry: "ES", toPostalCode: "28001", amount: "100" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://acme.quadernoapp.com/api/tax_rates/calculate?to_country=ES&to_postal_code=28001&amount=100",
  );
  assertEquals(out, { name: "IVA", rate: 21, tax_amount: 21 });
});
