import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/prediction-get.ts";

/** This is where the answer eventually appears. */
Deno.test("prediction-get: reads a prediction and adds the two booleans", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { id: "p1", status: "succeeded", output: ["hi"], metrics: { predict_time: 1.2 } },
  }]);
  const result = await action.execute!({ predictionId: "p1" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://api.replicate.com/v1/predictions/p1");
  assertEquals(result.finished, true);
  assertEquals(result.succeeded, true);
});

Deno.test("prediction-get: a canceled prediction is finished but not succeeded", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { id: "p1", status: "canceled" } }]);
  const result = await action.execute!({ predictionId: "p1" }, ctx) as Record<string, unknown>;
  assertEquals(result.finished, true);
  assertEquals(result.succeeded, false);
});

/** predict_time is the only per-call cost figure Replicate exposes. */
Deno.test("prediction-get: the output names what predict_time is", () => {
  const outputs = action.output as Array<{ key: string; label: string }>;
  assert(outputs.find((o) => o.key === "metrics")!.label.includes("what this cost"));
  assert(outputs.find((o) => o.key === "error")!.label.includes("without any HTTP error"));
});

Deno.test("prediction-get: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`predictionId`");
  assertEquals(calls.length, 0);
});
