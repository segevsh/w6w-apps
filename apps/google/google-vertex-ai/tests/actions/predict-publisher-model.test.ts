import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import predict from "../../actions/predict-publisher-model.ts";

const display = { projectId: "p1", location: "europe-west4" };
const BASE = "https://europe-west4-aiplatform.googleapis.com/v1/projects/p1/locations/europe-west4";

Deno.test("predict-publisher-model: passes instances and parameters through to :predict", async () => {
  const { ctx, calls } = mockCtx([{ body: { predictions: [{ embeddings: { values: [1] } }] } }], {
    display,
  });
  const out = await predict.execute!({
    model: "text-embedding-005",
    instances: [{ content: "hello" }],
    parameters: { outputDimensionality: 8 },
  }, ctx);
  assertEquals(calls[0].url, `${BASE}/publishers/google/models/text-embedding-005:predict`);
  assertEquals(JSON.parse(calls[0].body!), {
    instances: [{ content: "hello" }],
    parameters: { outputDimensionality: 8 },
  });
  assertEquals(out, { predictions: [{ embeddings: { values: [1] } }] });
  await assertRejects(
    () => Promise.resolve(predict.execute!({ model: "m", instances: [] }, ctx)),
    Error,
    "non-empty",
  );
});
