import { assert, assertEquals, assertRejects } from "@std/assert";
import documentUpdate from "../../actions/document-update.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("document-update: PUT /api/documents/{documentId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 1 } } }]);
  const out = await documentUpdate.execute(
    {
      "documentId": 7,
      "name": "Invoice",
      "type": "docx",
      "output": "pdf",
      "html": "<p>Hi</p>",
      "sizeWidth": "8.5",
      "sizeHeight": "11",
      "contents": "QUJD",
      "folder": "Contracts",
      "status": "Test Mode",
    } as never,
    ctx,
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/documents/7");
  assertEquals(out, { data: { id: 1 } });
  assertEquals(JSON.parse(calls[0].body!), {
    "name": "Invoice",
    "type": "docx",
    "output": "pdf",
    "html": "<p>Hi</p>",
    "size_width": "8.5",
    "size_height": "11",
    "contents": "QUJD",
    "folder": "Contracts",
    "status": "Test Mode",
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
});

Deno.test("document-update: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Unauthenticated.") }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        documentUpdate.execute(
          {
            "documentId": 7,
            "name": "Invoice",
            "type": "docx",
            "output": "pdf",
            "html": "<p>Hi</p>",
            "sizeWidth": "8.5",
            "sizeHeight": "11",
            "contents": "QUJD",
            "folder": "Contracts",
            "status": "Test Mode",
          } as never,
          ctx,
        ),
      ),
    Error,
  );
  assert(err.message.includes("Unauthenticated."), err.message);
  assert(err.message.includes("401"), err.message);
});

Deno.test("document-update: idempotency is declared as true", () =>
  assertEquals(documentUpdate.idempotent, true));
