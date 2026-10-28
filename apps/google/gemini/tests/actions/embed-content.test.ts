import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/embed-content.ts";

Deno.test("embed-content: POSTs to /models/{model}:embedContent wrapping text as a Content part", async () => {
  const { ctx, calls } = mockCtx([{ body: { embedding: { values: [0.1, 0.2] } } }]);
  await action.execute!({ model: "gemini-embedding-001", text: "hello world" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1beta/models/gemini-embedding-001:embedContent",
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.content, { parts: [{ text: "hello world" }] });
  assertEquals("embedContentConfig" in body, false);
});

Deno.test("embed-content: folds taskType/title/outputDimensionality into embedContentConfig", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    {
      model: "gemini-embedding-001",
      text: "hello",
      taskType: "RETRIEVAL_DOCUMENT",
      title: "doc-1",
      outputDimensionality: 256,
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.embedContentConfig, {
    taskType: "RETRIEVAL_DOCUMENT",
    title: "doc-1",
    outputDimensionality: 256,
  });
});
