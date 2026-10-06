import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import companyInvoiceList from "../../actions/company-invoice-list.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "companyId": 42, "page": 2, "is_paid": false, "date_after": "2026-01-01" };

Deno.test("company-invoice-list: GET /api/v2/companies/42/invoices with the documented query, header and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ "id": 1 }, { "id": 2 }] }]);
  const out = await companyInvoiceList.execute(INPUT as never, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/companies/42/invoices");
  assertEquals(queryOf(calls[0].url), { "is_paid": "false", "date_after": "2026-01-01" });
  assertEquals(calls[0].headers["page"], "2");
  assertEquals(calls[0].body, null);
  assertEquals(
    calls[0].headers["userapikey"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { items: [{ id: 1 }, { id: 2 }], count: 2, page: 2, nextPage: 3 });
});

Deno.test("company-invoice-list: an Axonaut error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody(403, "Forbidden access") }]);
  const err = await assertRejects(async () =>
    await companyInvoiceList.execute(INPUT as never, ctx)
  );
  assertStringIncludes((err as Error).message, "Axonaut 403: Forbidden access");
});

Deno.test("company-invoice-list: an empty page ends the list and the first page is the default", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  const out = await companyInvoiceList.execute({ companyId: 42 } as never, ctx);
  assertEquals(calls[0].headers["page"], undefined);
  assertEquals(out, { items: [], count: 0, page: 1, nextPage: null });
});
