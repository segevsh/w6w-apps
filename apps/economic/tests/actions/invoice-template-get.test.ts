import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import action from "../../actions/invoice-template-get.ts";
import { mockCtx } from "../_helpers.ts";

test("invoice-template-get: GETs the customer's invoice template", async () => {
  const { ctx, calls } = mockCtx([{ body: { currency: "DKK" } }]);
  assertEquals(await action.execute!({ customerNumber: 1 }, ctx), {
    template: { currency: "DKK" },
  });
  assertEquals(calls[0].url, "https://restapi.e-conomic.com/customers/1/templates/invoice");
});
