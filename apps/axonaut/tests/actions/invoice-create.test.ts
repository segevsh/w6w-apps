import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import invoiceCreate from "../../actions/invoice-create.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "contract_id": 28,
  "company_id": 3,
  "employee_email": "c@a.fr",
  "company_address_id": 5,
  "project_id": 7,
  "date": "2026-10-06",
  "due_date": "2026-11-06",
  "service_start_date": "2026-10-01",
  "service_end_date": "2026-10-31",
  "business_manager": "m@a.fr",
  "order_number": "PO-9",
  "global_discount_flat": 10,
  "global_discount_percent": 5,
  "global_discount_comments": "promo",
  "deposit_type": "1",
  "deposit_percent": 30,
  "deposit_flat": 100,
  "mandatory_mentions": "none",
  "payment_terms": "30 days",
  "theme_id": 2,
  "products": '[{"name": "Consulting", "price": 100, "tax_rate": 20, "quantity": 2}]',
  "delivery_address": '{"city": "Paris"}',
};

Deno.test("invoice-create: POST /api/v2/invoices with the documented query, header and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "id": 1 } }]);
  const out = await invoiceCreate.execute(INPUT as never, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/invoices");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["page"], undefined);
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "contract_id": 28,
    "company_id": 3,
    "employee_email": "c@a.fr",
    "company_address_id": 5,
    "project_id": 7,
    "date": "2026-10-06",
    "due_date": "2026-11-06",
    "service_start_date": "2026-10-01",
    "service_end_date": "2026-10-31",
    "business_manager": "m@a.fr",
    "order_number": "PO-9",
    "global_discount_flat": 10,
    "global_discount_percent": 5,
    "global_discount_comments": "promo",
    "deposit_type": 1,
    "deposit_percent": 30,
    "deposit_flat": 100,
    "mandatory_mentions": "none",
    "payment_terms": "30 days",
    "theme_id": 2,
    "products": [
      {
        "name": "Consulting",
        "price": 100,
        "tax_rate": 20,
        "quantity": 2,
      },
    ],
    "delivery_address": {
      "city": "Paris",
    },
  });
  assertEquals(
    calls[0].headers["userapikey"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { id: 1 });
});

Deno.test("invoice-create: an Axonaut error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody(403, "Forbidden access") }]);
  const err = await assertRejects(async () => await invoiceCreate.execute(INPUT as never, ctx));
  assertStringIncludes((err as Error).message, "Axonaut 403: Forbidden access");
});

Deno.test("invoice-create: invalid JSON in products is rejected before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(async () =>
    await (invoiceCreate.execute({
      ...({
        "contract_id": 28,
        "company_id": 3,
        "employee_email": "c@a.fr",
        "company_address_id": 5,
        "project_id": 7,
        "date": "2026-10-06",
        "due_date": "2026-11-06",
        "service_start_date": "2026-10-01",
        "service_end_date": "2026-10-31",
        "business_manager": "m@a.fr",
        "order_number": "PO-9",
        "global_discount_flat": 10,
        "global_discount_percent": 5,
        "global_discount_comments": "promo",
        "deposit_type": "1",
        "deposit_percent": 30,
        "deposit_flat": 100,
        "mandatory_mentions": "none",
        "payment_terms": "30 days",
        "theme_id": 2,
        "products": '[{"name": "Consulting", "price": 100, "tax_rate": 20, "quantity": 2}]',
        "delivery_address": '{"city": "Paris"}',
      }),
      "products": "{not json",
    } as never, ctx))
  );
  assertStringIncludes((err as Error).message, "Axonaut: products");
  assertEquals(calls.length, 0);
});
