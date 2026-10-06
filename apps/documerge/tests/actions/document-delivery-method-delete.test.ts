import { assert, assertEquals, assertRejects } from "@std/assert";
import documentDeliveryMethodDelete from "../../actions/document-delivery-method-delete.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("document-delivery-method-delete: DELETE /api/documents/delivery-methods/{documentId}/{deliveryMethodId}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await documentDeliveryMethodDelete.execute(
    { "documentId": 7, "deliveryMethodId": 5 } as never,
    ctx,
  );
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/documents/delivery-methods/7/5");
  assertEquals(calls[0].body, null);
  assertEquals(out, { deleted: true });
  assertEquals(calls[0].headers["content-type"], undefined);
});

Deno.test("document-delivery-method-delete: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Unauthenticated.") }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        documentDeliveryMethodDelete.execute(
          { "documentId": 7, "deliveryMethodId": 5 } as never,
          ctx,
        ),
      ),
    Error,
  );
  assert(err.message.includes("Unauthenticated."), err.message);
  assert(err.message.includes("401"), err.message);
});

Deno.test("document-delivery-method-delete: idempotency is declared as true", () =>
  assertEquals(documentDeliveryMethodDelete.idempotent, true));
