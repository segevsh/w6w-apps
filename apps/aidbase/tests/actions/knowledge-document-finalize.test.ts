import { assert, assertEquals, assertRejects } from "@std/assert";
import knowledgeDocumentFinalize from "../../actions/knowledge-document-finalize.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = { "knowledgeId": "d1" };
const run = (
  ctx: Parameters<typeof knowledgeDocumentFinalize.execute>[1],
  input: Record<string, unknown> = sample,
) => knowledgeDocumentFinalize.execute(input as never, ctx) as Promise<unknown>;

Deno.test("knowledge-document-finalize: declares a perform action with a description, params and output", () => {
  assertEquals(knowledgeDocumentFinalize.key, "knowledge-document-finalize");
  assertEquals(knowledgeDocumentFinalize.type, "perform");
  assert((knowledgeDocumentFinalize.description ?? "").length > 0);
  assert(
    Array.isArray(knowledgeDocumentFinalize.output) && knowledgeDocumentFinalize.output.length > 0,
  );
  assertEquals(knowledgeDocumentFinalize.idempotent, true);
});

Deno.test("knowledge-document-finalize: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "success": true,
      "data": {
        "id": "d1",
        "type": "document",
        "document_url": "https://cdn.aidbase.ai/x/documents/my-document.pdf",
      },
    },
  }]);
  const out = await run(ctx);
  assertEquals(out, {
    "id": "d1",
    "type": "document",
    "document_url": "https://cdn.aidbase.ai/x/documents/my-document.pdf",
  });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/knowledge/d1/finalize");
  assertEquals(calls[0].url.startsWith("https://api.aidbase.ai/v1/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("knowledge-document-finalize: an Aidbase failure body is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errBody("API key is missing a scope") }]);
  await assertRejects(() => run(ctx), Error, "API key is missing a scope");
});
