import { assert, assertEquals, assertRejects } from "@std/assert";
import documentCreate from "../../actions/document-create.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("document-create: POST /api/documents", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 1 } } }]);
  const out = await documentCreate.execute(
    {
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
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/documents");
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

Deno.test("document-create: unset optional fields are not sent", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 1 } } }]);
  await documentCreate.execute(
    { "name": "Invoice", "type": "docx", "output": "pdf" } as never,
    ctx,
  );
  assertEquals(Object.keys(JSON.parse(calls[0].body!)).sort(), ["name", "output", "type"]);
});

Deno.test("document-create: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Unauthenticated.") }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        documentCreate.execute(
          {
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

Deno.test("document-create: idempotency is declared as false", () =>
  assertEquals(documentCreate.idempotent, false));
