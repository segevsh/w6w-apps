import { assertEquals } from "@std/assert";
import companyContactsList from "../../actions/company-contacts-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("company-contacts-list: reads the nested route", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 501, firstName: "Jane" }] }]);
  const result = await companyContactsList.execute({ companyId: 2001 }, ctx) as {
    contacts: unknown[];
  };

  assertEquals(pathOf(calls[0].url), "/v2/companies/2001/contacts");
  assertEquals(result.contacts.length, 1);
});
