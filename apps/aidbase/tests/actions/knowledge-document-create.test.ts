import { assert, assertEquals, assertRejects } from "@std/assert";
import knowledgeDocumentCreate from "../../actions/knowledge-document-create.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = { "fileType": "application/pdf", "fileName": "my-document" };
const run = (
  ctx: Parameters<typeof knowledgeDocumentCreate.execute>[1],
  input: Record<string, unknown> = sample,
) => knowledgeDocumentCreate.execute(input as never, ctx) as Promise<unknown>;

Deno.test("knowledge-document-create: declares a perform action with a description, params and output", () => {
  assertEquals(knowledgeDocumentCreate.key, "knowledge-document-create");
  assertEquals(knowledgeDocumentCreate.type, "perform");
  assert((knowledgeDocumentCreate.description ?? "").length > 0);
  assert(
    Array.isArray(knowledgeDocumentCreate.output) && knowledgeDocumentCreate.output.length > 0,
  );
  assertEquals(knowledgeDocumentCreate.idempotent, false);
});

Deno.test("knowledge-document-create: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "success": true,
      "data": { "id": "d1", "upload_url": "https://upload.example/signed" },
    },
  }]);
  const out = await run(ctx);
  assertEquals(out, { "id": "d1", "upload_url": "https://upload.example/signed" });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/knowledge/document");
  assertEquals(calls[0].url.startsWith("https://api.aidbase.ai/v1/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "file_type": "application/pdf",
    "file_name": "my-document",
  });
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("knowledge-document-create: an Aidbase failure body is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errBody("API key is missing a scope") }]);
  await assertRejects(() => run(ctx), Error, "API key is missing a scope");
});
