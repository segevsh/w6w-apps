import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import embed from "../../actions/embed-content.ts";

const display = { projectId: "p1", location: "europe-west4" };
const BASE = "https://europe-west4-aiplatform.googleapis.com/v1/projects/p1/locations/europe-west4";

Deno.test("embed-content: sends embedContentConfig (not the deprecated top-level fields)", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      embedding: { values: [0.1, 0.2] },
      truncated: false,
      usageMetadata: { promptTokenCount: 2 },
    },
  }], { display });
  const out = await embed.execute!({
    model: "gemini-embedding-001",
    text: "hello",
    taskType: "RETRIEVAL_QUERY",
    outputDimensionality: 256,
  }, ctx);
  assertEquals(calls[0].url, `${BASE}/publishers/google/models/gemini-embedding-001:embedContent`);
  assertEquals(JSON.parse(calls[0].body!), {
    content: { parts: [{ text: "hello" }] },
    embedContentConfig: { taskType: "RETRIEVAL_QUERY", outputDimensionality: 256 },
  });
  assertEquals(out, {
    values: [0.1, 0.2],
    truncated: false,
    usageMetadata: { promptTokenCount: 2 },
  });
  await assertRejects(
    () => Promise.resolve(embed.execute!({ model: "m", text: "" }, ctx)),
    Error,
    "`text` is required",
  );
});
