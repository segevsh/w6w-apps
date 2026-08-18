import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/table-list.ts";

const display = { projectId: "p1", datasetId: "d1" };

Deno.test("table-list: lists a dataset's tables", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { tables: [{ id: "p1:d1.t1" }] } }], {
    display,
  });
  const result = await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/bigquery/v2/projects/p1/datasets/d1/tables");
  assertEquals(result, [{ id: "p1:d1.t1" }]);
});

Deno.test("table-list: with no dataset it fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display: { projectId: "p1" } });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "no dataset");
  assertEquals(calls.length, 0);
});
