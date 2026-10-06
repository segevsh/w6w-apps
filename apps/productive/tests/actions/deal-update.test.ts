import { assertEquals, assertRejects } from "@std/assert";
import dealUpdate from "../../actions/deal-update.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("deal-update: PATCH /deals/{id} sends a JSON:API document of attributes", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "data": { "id": "42", "type": "deals", "attributes": { "name": "x" } } },
  }]);
  const out = await dealUpdate.execute({
    "id": "42",
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
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/api/v2/deals/42");
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

Deno.test("deal-update: only the fields set are sent", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "data": { "id": "42", "type": "deals", "attributes": { "name": "x" } } },
  }]);
  await dealUpdate.execute({ id: "42", name: "sample name" }, ctx);
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    data: { type: "deals", attributes: { "name": "sample name" } },
  });
});

Deno.test("deal-update: naming no field to change fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(
    () => Promise.resolve(dealUpdate.execute({ id: "42" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("at least one field"), true, err.message);
  assertEquals(calls.length, 0);
});

Deno.test("deal-update: a vendor error surfaces its status, title and detail", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody("404", "not_found", "Not Found", "Resource not found"),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(dealUpdate.execute({ id: "42", name: "sample name" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Resource not found"), true, err.message);
});

Deno.test("deal-update: declares perform and idempotent=true", () => {
  assertEquals(dealUpdate.type, "perform");
  assertEquals(dealUpdate.idempotent, true);
  assertEquals(dealUpdate.key, "deal-update");
});
