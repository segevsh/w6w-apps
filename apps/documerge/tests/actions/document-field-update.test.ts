import { assert, assertEquals, assertRejects } from "@std/assert";
import documentFieldUpdate from "../../actions/document-field-update.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("document-field-update: PUT /api/documents/fields/{documentId}/{fieldId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 1 } } }]);
  const out = await documentFieldUpdate.execute(
    {
      "documentId": 7,
      "fieldId": 21,
      "name": "customer_name",
      "fieldMap": "Customer.Name",
    } as never,
    ctx,
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/documents/fields/7/21");
  assertEquals(out, { data: { id: 1 } });
  assertEquals(JSON.parse(calls[0].body!), {
    "name": "customer_name",
    "field_map": "Customer.Name",
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
});

Deno.test("document-field-update: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Unauthenticated.") }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        documentFieldUpdate.execute(
          {
            "documentId": 7,
            "fieldId": 21,
            "name": "customer_name",
            "fieldMap": "Customer.Name",
          } as never,
          ctx,
        ),
      ),
    Error,
  );
  assert(err.message.includes("Unauthenticated."), err.message);
  assert(err.message.includes("401"), err.message);
});

Deno.test("document-field-update: idempotency is declared as true", () =>
  assertEquals(documentFieldUpdate.idempotent, true));
