import { assertEquals } from "@std/assert";
import companyContactCreate from "../../actions/company-contact-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("company-contact-create: POSTs to the nested route", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 501, firstName: "Jane" } }]);
  await companyContactCreate.execute(
    { companyId: 2001, firstName: "Jane", email: "jane@acme.co" },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/companies/2001/contacts");
  assertEquals(bodyOf(calls[0]), { firstName: "Jane", email: "jane@acme.co" });
});

/** `companyId` is in the path and read-only on the model, so the body never carries it. */
Deno.test("company-contact-create: the company is in the path, never in the body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await companyContactCreate.execute({ companyId: 7, firstName: "Jane" }, ctx);
  assertEquals("companyId" in bodyOf(calls[0]), false);
  assertEquals(pathOf(calls[0].url), "/v2/companies/7/contacts");
});
