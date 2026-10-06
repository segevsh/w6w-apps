import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import quotationCreate from "../../actions/quotation-create.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "company_id": 42,
  "company_address_id": 5,
  "business_manager": "m@a.fr",
  "project_id": 7,
  "opportunity_id": 9,
  "theme_id": 2,
  "comments": "hello",
  "mandatory_mentions": "none",
  "payment_terms": "30 days",
  "date": "2026-10-06",
  "expiry_date": "2026-11-06",
  "global_discount_amount": 10,
  "global_discount_unit_is_percent": true,
  "global_discount_comments": "promo",
  "products": '[{"name": "Consulting", "price": 100, "tax_rate": 20, "quantity": 2}]',
};

Deno.test("quotation-create: POST /api/v2/quotations with the documented query, header and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "id": 1 } }]);
  const out = await quotationCreate.execute(INPUT as never, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/quotations");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["page"], undefined);
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "company_id": 42,
    "company_address_id": 5,
    "business_manager": "m@a.fr",
    "project_id": 7,
    "opportunity_id": 9,
    "theme_id": 2,
    "comments": "hello",
    "mandatory_mentions": "none",
    "payment_terms": "30 days",
    "date": "2026-10-06",
    "expiry_date": "2026-11-06",
    "global_discount_amount": 10,
    "global_discount_unit_is_percent": true,
    "global_discount_comments": "promo",
    "products": [
      {
        "name": "Consulting",
        "price": 100,
        "tax_rate": 20,
        "quantity": 2,
      },
    ],
  });
  assertEquals(
    calls[0].headers["userapikey"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { id: 1 });
});

Deno.test("quotation-create: an Axonaut error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody(403, "Forbidden access") }]);
  const err = await assertRejects(async () => await quotationCreate.execute(INPUT as never, ctx));
  assertStringIncludes((err as Error).message, "Axonaut 403: Forbidden access");
});

Deno.test("quotation-create: invalid JSON in products is rejected before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(async () =>
    await (quotationCreate.execute({
      ...({
        "company_id": 42,
        "company_address_id": 5,
        "business_manager": "m@a.fr",
        "project_id": 7,
        "opportunity_id": 9,
        "theme_id": 2,
        "comments": "hello",
        "mandatory_mentions": "none",
        "payment_terms": "30 days",
        "date": "2026-10-06",
        "expiry_date": "2026-11-06",
        "global_discount_amount": 10,
        "global_discount_unit_is_percent": true,
        "global_discount_comments": "promo",
        "products": '[{"name": "Consulting", "price": 100, "tax_rate": 20, "quantity": 2}]',
      }),
      "products": "{not json",
    } as never, ctx))
  );
  assertStringIncludes((err as Error).message, "Axonaut: products");
  assertEquals(calls.length, 0);
});
