import { assert, assertEquals } from "@std/assert";
import { mockCtx, parse, PDF_BYTES } from "../_helpers.ts";
import action from "../../actions/pdf-encrypt.ts";

Deno.test("pdf-encrypt: POSTs file, passwords and permissions", async () => {
  const { ctx, calls } = mockCtx([{
    headers: { "content-type": "application/pdf" },
    body: PDF_BYTES,
  }]);
  const out = await action.execute(
    {
      fileName: "c.pdf",
      fileUrl: "https://example.com/c.pdf",
      password: "xyz123",
      userPassword: "open",
      permissions: ["AllFeatures"],
    } as never,
    ctx,
  ) as Record<string, unknown>;
  const call = calls[0];
  assertEquals(call.method, "POST");
  const url = parse(call.url);
  assertEquals(url.origin, "https://www.webmerge.me");
  assertEquals(url.pathname, "/api/tools/encrypt_pdf");
  assertEquals(JSON.parse(call.body!), {
    "file": { "name": "c.pdf", "url": "https://example.com/c.pdf" },
    "password": "xyz123",
    "user_password": "open",
    "permissions": ["AllFeatures"],
  });
  const file = out.file as { contentBase64: string; contentType: string; sizeBytes: number };
  assertEquals(file.contentType, "application/pdf");
  assertEquals(file.sizeBytes, PDF_BYTES.length);
  assertEquals(atob(file.contentBase64), new TextDecoder().decode(PDF_BYTES));
});

Deno.test("pdf-encrypt: idempotent flag is true", () => {
  assertEquals(action.idempotent, true);
});

Deno.test("pdf-encrypt: declares key, type and a description", () => {
  assertEquals(action.key, "pdf-encrypt");
  assertEquals(action.type, "perform");
  assert(action.description!.length > 10);
});
