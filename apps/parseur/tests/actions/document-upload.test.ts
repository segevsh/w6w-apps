import { assert, assertEquals } from "@std/assert";
import documentUpload from "../../actions/document-upload.ts";
import { mockCtx, pathOf, queryAllOf, queryOf } from "../_helpers.ts";

const FILE = new Blob(["%PDF-fake"], { type: "application/pdf" });

Deno.test("document-upload: POSTs multipart/form-data to /parser/{id}/upload", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 201,
      body: { message: "OK", attachments: [{ name: "f.pdf", DocumentID: "abc123" }] },
    },
  ]);
  const out = await documentUpload.execute({ mailboxId: "42", file: FILE }, ctx) as {
    message: string;
    attachments: Array<{ DocumentID: string }>;
  };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/parser/42/upload");
  // The client never sets a JSON content-type for a form body — the boundary
  // is left to `fetch`/`FormData` itself.
  assert(calls[0].headers["content-type"] === undefined);
  assertEquals(out.message, "OK");
  assertEquals(out.attachments[0].DocumentID, "abc123");
});

Deno.test("document-upload: custom parameters become query-string params", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { message: "OK", attachments: [] } }]);
  await documentUpload.execute(
    { mailboxId: "42", file: FILE, customParams: { "user.name": "John", "user.tags": ["a", "b"] } },
    ctx,
  );

  assertEquals(queryOf(calls[0].url)["user.name"], "John");
  assertEquals(queryAllOf(calls[0].url, "user.tags"), ["a", "b"]);
});

Deno.test("document-upload: is not idempotent", () => {
  assertEquals(documentUpload.idempotent, false);
});
