import { assertEquals } from "@std/assert";
import getMandate from "../../actions/get-mandate.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-mandate: GET /mandates/{id} and the unwrapped mandate", async () => {
  const { ctx, calls } = mockCtx([{
    body: envelope("mandates", {
      id: "MD0000",
      status: "active",
      scheme: "bacs",
      links: { customer: "CU1", customer_bank_account: "BA1" },
    }),
  }]);
  const out = await getMandate.execute!({ mandateId: "MD0000" }, ctx) as {
    status: string;
    links: { customer_bank_account: string };
  };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/mandates/MD0000");
  assertEquals(out.status, "active");
  assertEquals(out.links.customer_bank_account, "BA1");
});
