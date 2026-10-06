import { assert, assertEquals, assertRejects } from "@std/assert";
import documentDelete from "../../actions/document-delete.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("document-delete: DELETE /api/documents/{documentId}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await documentDelete.execute({ "documentId": 7 } as never, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/documents/7");
  assertEquals(calls[0].body, null);
  assertEquals(out, { deleted: true });
  assertEquals(calls[0].headers["content-type"], undefined);
});

Deno.test("document-delete: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Unauthenticated.") }]);
  const err = await assertRejects(
    () => Promise.resolve(documentDelete.execute({ "documentId": 7 } as never, ctx)),
    Error,
  );
  assert(err.message.includes("Unauthenticated."), err.message);
  assert(err.message.includes("401"), err.message);
});

Deno.test("document-delete: idempotency is declared as true", () =>
  assertEquals(documentDelete.idempotent, true));
