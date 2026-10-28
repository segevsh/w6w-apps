import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/dataset-get.ts";

Deno.test("dataset-get: reads the dataset defaulted from the connection", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "p1:d1", location: "US" } }], {
    display: { projectId: "p1", datasetId: "d1" },
  });
  const result = await action.execute!({}, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/bigquery/v2/projects/p1/datasets/d1");
  assertEquals(result.location, "US");
});

Deno.test("dataset-get: with no dataset anywhere it says so before calling", async () => {
  const { ctx, calls } = mockCtx([], { display: { projectId: "p1" } });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "no dataset");
  assertEquals(calls.length, 0);
});
