import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/training-get.ts";

Deno.test("training-get: reads a training and adds the two booleans", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { id: "t1", status: "succeeded", output: { version: "v2" } },
  }]);
  const result = await action.execute!({ trainingId: "t1" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://api.replicate.com/v1/trainings/t1");
  assertEquals(result.succeeded, true);
});

/** output.version is where the trained model's new version id appears. */
Deno.test("training-get: the output says where the trained version lands", () => {
  const outputs = action.output as Array<{ key: string; label: string }>;
  assert(outputs.find((o) => o.key === "output")!.label.includes("new version id"));
});

Deno.test("training-get: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`trainingId`");
  assertEquals(calls.length, 0);
});
