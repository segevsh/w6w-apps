import { assertEquals } from "@std/assert";
import companyAddressesList from "../../actions/company-addresses-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("company-addresses-list: reads the nested route", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, city: "Auckland" }] }]);
  const result = await companyAddressesList.execute({ companyId: 2001 }, ctx) as {
    addresses: unknown[];
  };

  assertEquals(pathOf(calls[0].url), "/v2/companies/2001/addresses");
  assertEquals(result.addresses.length, 1);
});
