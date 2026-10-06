import { assert, assertEquals, assertRejects } from "@std/assert";
import documentFieldList from "../../actions/document-field-list.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("document-field-list: GET /api/documents/fields/{documentId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 1 } } }]);
  const out = await documentFieldList.execute({ "documentId": 7 } as never, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/documents/fields/7");
  assertEquals(out, { data: { id: 1 } });
  assertEquals(calls[0].headers["content-type"], undefined);
});

Deno.test("document-field-list: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Unauthenticated.") }]);
  const err = await assertRejects(
    () => Promise.resolve(documentFieldList.execute({ "documentId": 7 } as never, ctx)),
    Error,
  );
  assert(err.message.includes("Unauthenticated."), err.message);
  assert(err.message.includes("401"), err.message);
});
