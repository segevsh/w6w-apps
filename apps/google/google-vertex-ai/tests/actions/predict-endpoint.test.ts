import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import predictEndpoint from "../../actions/predict-endpoint.ts";

const display = { projectId: "p1", location: "us-central1" };
const BASE = "https://us-central1-aiplatform.googleapis.com/v1/projects/p1/locations/us-central1";

Deno.test("predict-endpoint: POSTs instances to endpoints/{id}:predict", async () => {
  const { ctx, calls } = mockCtx([{ body: { predictions: [0.9], deployedModelId: "d1" } }], {
    display,
  });
  const out = await predictEndpoint.execute!({ endpointId: "7", instances: [{ x: 1 }] }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${BASE}/endpoints/7:predict`);
  assertEquals(JSON.parse(calls[0].body!), { instances: [{ x: 1 }] });
  assertEquals(out, { predictions: [0.9], deployedModelId: "d1" });
  await assertRejects(
    () => Promise.resolve(predictEndpoint.execute!({ endpointId: "7", instances: "[]" }, ctx)),
    Error,
    "non-empty",
  );
});
