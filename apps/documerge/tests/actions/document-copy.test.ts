import { assert, assertEquals, assertRejects } from "@std/assert";
import documentCopy from "../../actions/document-copy.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("document-copy: POST /api/documents/copy/{documentId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 1 } } }]);
  const out = await documentCopy.execute({ "documentId": 7, "name": "Invoice copy" } as never, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/documents/copy/7");
  assertEquals(out, { data: { id: 1 } });
  assertEquals(JSON.parse(calls[0].body!), { "name": "Invoice copy" });
  assertEquals(calls[0].headers["content-type"], "application/json");
});

Deno.test("document-copy: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Unauthenticated.") }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        documentCopy.execute({ "documentId": 7, "name": "Invoice copy" } as never, ctx),
      ),
    Error,
  );
  assert(err.message.includes("Unauthenticated."), err.message);
  assert(err.message.includes("401"), err.message);
});

Deno.test("document-copy: idempotency is declared as false", () =>
  assertEquals(documentCopy.idempotent, false));
