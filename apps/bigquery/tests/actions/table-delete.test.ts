import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/table-delete.ts";

const display = { projectId: "p1", datasetId: "d1" };

Deno.test("table-delete: DELETEs the table and reports it gone", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }], { display });
  const result = await action.execute!({ tableId: "t1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/bigquery/v2/projects/p1/datasets/d1/tables/t1");
  assertEquals(result, { tableId: "t1", deleted: true });
});

Deno.test("table-delete: a blank table id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`tableId`");
  assertEquals(calls.length, 0);
});
