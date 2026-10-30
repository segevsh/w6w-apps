import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/company-contact-remove.ts";

const conn = { display: { baseUrl: "https://mautic.example.com" } };

test("company-contact-remove: POSTs /companies/{companyId}/contact/{contactId}/remove", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { success: 1 } }], conn);
  await action.execute!({ companyId: 1, contactId: 47 }, ctx);
  assertEquals(calls[0].url, "https://mautic.example.com/api/companies/1/contact/47/remove");
});
