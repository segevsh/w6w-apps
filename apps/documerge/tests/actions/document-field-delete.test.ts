import { assert, assertEquals, assertRejects } from "@std/assert";
import documentFieldDelete from "../../actions/document-field-delete.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("document-field-delete: DELETE /api/documents/fields/{documentId}/{fieldId}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await documentFieldDelete.execute({ "documentId": 7, "fieldId": 21 } as never, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/documents/fields/7/21");
  assertEquals(calls[0].body, null);
  assertEquals(out, { deleted: true });
  assertEquals(calls[0].headers["content-type"], undefined);
});

Deno.test("document-field-delete: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Unauthenticated.") }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        documentFieldDelete.execute({ "documentId": 7, "fieldId": 21 } as never, ctx),
      ),
    Error,
  );
  assert(err.message.includes("Unauthenticated."), err.message);
  assert(err.message.includes("401"), err.message);
});

Deno.test("document-field-delete: idempotency is declared as true", () =>
  assertEquals(documentFieldDelete.idempotent, true));
