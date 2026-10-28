import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/dataset-delete.ts";

const display = { projectId: "p1", datasetId: "main" };

Deno.test("dataset-delete: DELETEs the named dataset and reports it gone", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }], { display });
  const result = await action.execute!({ datasetId: "scratch" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/bigquery/v2/projects/p1/datasets/scratch");
  assertEquals(result, { datasetId: "scratch", deleted: true });
});

/** Without the flag BigQuery refuses to delete a dataset that still has tables. */
Deno.test("dataset-delete: deleteContents is opt-in", async () => {
  const off = mockCtx([{ status: 204 }], { display });
  await action.execute!({ datasetId: "scratch" }, off.ctx);
  assertEquals(new URL(off.calls[0].url).searchParams.get("deleteContents"), null);

  const on = mockCtx([{ status: 204 }], { display });
  await action.execute!({ datasetId: "scratch", deleteContents: true }, on.ctx);
  assertEquals(new URL(on.calls[0].url).searchParams.get("deleteContents"), "true");
});

/**
 * The one action that must NOT fall back to the connection's dataset — a blank
 * field would otherwise delete the connection's main dataset.
 */
Deno.test("dataset-delete: a blank dataset never resolves to the connection default", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`datasetId` is required");
  assertEquals(calls.length, 0);
});
