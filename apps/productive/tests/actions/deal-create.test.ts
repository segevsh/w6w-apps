import { assertEquals, assertRejects } from "@std/assert";
import dealCreate from "../../actions/deal-create.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("deal-create: POST /deals sends a JSON:API document of attributes", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "data": { "id": "42", "type": "deals", "attributes": { "name": "x" } } },
  }]);
  const out = await dealCreate.execute({
    "name": "sample name",
    "companyId": 7,
    "dealTypeId": 7,
    "budget": true,
    "dealStatusId": 7,
    "responsibleId": 7,
    "date": "2026-10-01",
    "endDate": "2026-10-01",
    "currency": "sample currency",
    "probability": 7,
    "purchaseOrderNumber": "sample purchaseOrderNumber",
    "projectId": 7,
    "note": "sample note",
    "customFields": '{"1": "x"}',
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/deals");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["content-type"], "application/vnd.api+json");
  assertEquals(calls[0].headers["x-auth-token"], undefined, "credentials belong to sign");
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    data: {
      type: "deals",
      attributes: {
        "name": "sample name",
        "company_id": 7,
        "deal_type_id": 7,
        "budget": true,
        "deal_status_id": 7,
        "responsible_id": 7,
        "date": "2026-10-01",
        "end_date": "2026-10-01",
        "currency": "sample currency",
        "probability": 7,
        "purchase_order_number": "sample purchaseOrderNumber",
        "project_id": 7,
        "note": "sample note",
        "custom_fields": { "1": "x" },
      },
    },
  });
  assertEquals((out as Record<string, unknown>).id, "42");
});

Deno.test("deal-create: a vendor error surfaces its status, title and detail", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: errorBody("422", "unprocessable_entity", "Invalid", "is invalid"),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(dealCreate.execute({ "name": "sample name", "companyId": 7 }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("422"), true, err.message);
  assertEquals(err.message.includes("is invalid"), true, err.message);
});

Deno.test("deal-create: declares perform and idempotent=false", () => {
  assertEquals(dealCreate.type, "perform");
  assertEquals(dealCreate.idempotent, false);
  assertEquals(dealCreate.key, "deal-create");
});
