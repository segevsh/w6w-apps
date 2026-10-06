import { assertEquals } from "@std/assert";
import action from "../../actions/self-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("self-get: returns a curated subset and none of the app block", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      agreementNumber: 1583064,
      company: { name: "Demo Company", country: "Denmark" },
      settings: { baseCurrency: "DKK", defaultPaymentTerm: "1" },
      modules: [{ moduleNumber: 3, name: "Indscanning", self: "x" }],
      application: { appPublicToken: "PUBLIC" },
    },
  }]);
  const out = await action.execute!({}, ctx);
  assertEquals(calls[0].url, "https://restapi.e-conomic.com/self");
  assertEquals(out, {
    agreementNumber: 1583064,
    companyName: "Demo Company",
    country: "Denmark",
    baseCurrency: "DKK",
    defaultPaymentTerm: "1",
    modules: [{ moduleNumber: 3, name: "Indscanning" }],
  });
});
