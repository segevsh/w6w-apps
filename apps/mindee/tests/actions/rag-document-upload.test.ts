import { assert, assertEquals } from "@std/assert";
import ragDocumentUpload from "../../actions/rag-document-upload.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const MODEL_ID = "018f1e2a-0000-7000-8000-0000000000aa";

Deno.test("rag-document-upload: posts model_id and the base64-decoded file", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 201,
      body: { id: "doc1", model_id: MODEL_ID, filename: "ref.pdf", status: "Processing" },
    },
  ]);
  const result = await ragDocumentUpload.execute(
    { modelId: MODEL_ID, file: btoa("ref-bytes"), fileName: "ref.pdf" },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/products/extraction/rag-documents");
  assertEquals(calls[0].form?.model_id, [MODEL_ID]);
  assert(calls[0].form?.file?.[0].includes("ref-bytes"));
  assertEquals((result as { status: string }).status, "Processing");
});

Deno.test("rag-document-upload: exposes no url param (the vendor's form takes only file)", () => {
  const keys = ragDocumentUpload.params?.map((p) => p.key) ?? [];
  assertEquals(keys.includes("url"), false);
});
