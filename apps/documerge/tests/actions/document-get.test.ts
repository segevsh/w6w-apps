import { assert, assertEquals, assertRejects } from "@std/assert";
import documentGet from "../../actions/document-get.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("document-get: GET /api/documents/{documentId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 1 } } }]);
  const out = await documentGet.execute({ "documentId": 7 } as never, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/documents/7");
  assertEquals(out, { data: { id: 1 } });
  assertEquals(calls[0].headers["content-type"], undefined);
});

Deno.test("document-get: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Unauthenticated.") }]);
  const err = await assertRejects(
    () => Promise.resolve(documentGet.execute({ "documentId": 7 } as never, ctx)),
    Error,
  );
  assert(err.message.includes("Unauthenticated."), err.message);
  assert(err.message.includes("401"), err.message);
});
