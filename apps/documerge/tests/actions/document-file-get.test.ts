import { assert, assertEquals, assertRejects } from "@std/assert";
import documentFileGet from "../../actions/document-file-get.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("document-file-get: GET /api/documents/files/{documentId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 1 } } }]);
  const out = await documentFileGet.execute({ "documentId": 7 } as never, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/documents/files/7");
  assertEquals(out, { data: { id: 1 } });
  assertEquals(calls[0].headers["content-type"], undefined);
});

Deno.test("document-file-get: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Unauthenticated.") }]);
  const err = await assertRejects(
    () => Promise.resolve(documentFileGet.execute({ "documentId": 7 } as never, ctx)),
    Error,
  );
  assert(err.message.includes("Unauthenticated."), err.message);
  assert(err.message.includes("401"), err.message);
});
