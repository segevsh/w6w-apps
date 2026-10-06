import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import invoiceList from "../../actions/invoice-list.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "page": 2,
  "number": "F-2026-001",
  "internal_ref": "R1",
  "date_before": "2026-01-31",
  "date_after": "2026-01-01",
  "paid_date": "2026-01-31",
  "is_paid": true,
  "updated_after": "2026-02-01",
};

Deno.test("invoice-list: GET /api/v2/invoices with the documented query, header and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ "id": 1 }, { "id": 2 }] }]);
  const out = await invoiceList.execute(INPUT as never, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/invoices");
  assertEquals(queryOf(calls[0].url), {
    "number": "F-2026-001",
    "internal_ref": "R1",
    "date_before": "2026-01-31",
    "date_after": "2026-01-01",
    "paid_date": "2026-01-31",
    "is_paid": "true",
    "updated_after": "2026-02-01",
  });
  assertEquals(calls[0].headers["page"], "2");
  assertEquals(calls[0].body, null);
  assertEquals(
    calls[0].headers["userapikey"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { items: [{ id: 1 }, { id: 2 }], count: 2, page: 2, nextPage: 3 });
});

Deno.test("invoice-list: an Axonaut error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody(403, "Forbidden access") }]);
  const err = await assertRejects(async () => await invoiceList.execute(INPUT as never, ctx));
  assertStringIncludes((err as Error).message, "Axonaut 403: Forbidden access");
});

Deno.test("invoice-list: an empty page ends the list and the first page is the default", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  const out = await invoiceList.execute({} as never, ctx);
  assertEquals(calls[0].headers["page"], undefined);
  assertEquals(out, { items: [], count: 0, page: 1, nextPage: null });
});
