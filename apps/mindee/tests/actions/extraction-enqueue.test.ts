import { assert, assertEquals, assertThrows } from "@std/assert";
import extractionEnqueue from "../../actions/extraction-enqueue.ts";
import { jobResponse, mockCtx, pathOf } from "../_helpers.ts";

const MODEL_ID = "018f1e2a-0000-7000-8000-0000000000aa";

Deno.test("extraction-enqueue: posts model_id and a base64-decoded file", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: jobResponse() }]);
  const result = await extractionEnqueue.execute(
    {
      modelId: MODEL_ID,
      file: btoa("pdf-bytes"),
      fileName: "a.pdf",
      fileMimeType: "application/pdf",
    },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/products/extraction/enqueue");
  assertEquals(calls[0].form?.model_id, [MODEL_ID]);
  assert(calls[0].form?.file?.[0].includes("pdf-bytes"));
  assertEquals((result as { job: { status: string } }).job.status, "Processing");
});

Deno.test("extraction-enqueue: a url is sent as-is, no file part", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: jobResponse() }]);
  await extractionEnqueue.execute({ modelId: MODEL_ID, url: "https://example.com/a.pdf" }, ctx);

  assertEquals(calls[0].form?.url, ["https://example.com/a.pdf"]);
  assertEquals(calls[0].form?.file, undefined);
});

Deno.test("extraction-enqueue: throws when neither file nor url is given, without a request", () => {
  const { ctx, calls } = mockCtx([]);
  assertThrows(
    () => extractionEnqueue.execute({ modelId: MODEL_ID }, ctx),
    Error,
    "Provide either `file` (base64) or `url`.",
  );
  assertEquals(calls.length, 0);
});

Deno.test("extraction-enqueue: boolean options are sent as the string form Mindee expects", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: jobResponse() }]);
  await extractionEnqueue.execute(
    {
      modelId: MODEL_ID,
      url: "https://example.com/a.pdf",
      rawText: true,
      polygon: false,
      confidence: true,
      rag: false,
      textContext: "This is a receipt",
    },
    ctx,
  );

  assertEquals(calls[0].form?.raw_text, ["true"]);
  assertEquals(calls[0].form?.polygon, ["false"]);
  assertEquals(calls[0].form?.confidence, ["true"]);
  assertEquals(calls[0].form?.rag, ["false"]);
  assertEquals(calls[0].form?.text_context, ["This is a receipt"]);
});

// The reverse case — a `json`-type param arriving already parsed as an object
// rather than as text — is exercised directly against `asJsonText` in
// `tests/lib/client.test.ts`; this only pins the string-passthrough path.
Deno.test("extraction-enqueue: dataSchema is passed through as a JSON string", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: jobResponse() }]);
  await extractionEnqueue.execute(
    { modelId: MODEL_ID, url: "https://example.com/a.pdf", dataSchema: '{"replace":{}}' },
    ctx,
  );

  assertEquals(calls[0].form?.data_schema, ['{"replace":{}}']);
});

Deno.test("extraction-enqueue: webhookIds repeats webhook_ids, one part per id", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: jobResponse() }]);
  await extractionEnqueue.execute(
    { modelId: MODEL_ID, url: "https://example.com/a.pdf", webhookIds: ["w1", "w2"] },
    ctx,
  );

  assertEquals(calls[0].form?.webhook_ids, ["w1", "w2"]);
});
