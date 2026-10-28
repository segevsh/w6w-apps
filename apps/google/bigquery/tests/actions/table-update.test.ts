import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/table-update.ts";

const display = { projectId: "p1", datasetId: "d1" };

/** PATCH, not PUT: a PUT replaces the resource and clears omitted fields. */
Deno.test("table-update: PATCHes only the fields that were set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "p1:d1.t1" } }], { display });
  await action.execute!({ tableId: "t1", description: "sales facts", friendlyName: "" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).pathname, "/bigquery/v2/projects/p1/datasets/d1/tables/t1");
  assertEquals(JSON.parse(calls[0].body!), { description: "sales facts" });
});

Deno.test("table-update: a schema is wrapped, and must be an array", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await action.execute!({ tableId: "t1", schema: '[{"name":"a","type":"STRING"}]' }, ctx);
  assertEquals(JSON.parse(calls[0].body!).schema, { fields: [{ name: "a", type: "STRING" }] });

  const bad = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ tableId: "t1", schema: '{"name":"a"}' }, bad.ctx),
    Error,
    "`schema` must be an array",
  );
  assertEquals(bad.calls.length, 0);
});

/** Schema edits here are additive only — the hint has to warn about that. */
Deno.test("table-update: the schema hint says the full schema is expected", () => {
  const schema = action.params!.find((p) => p.key === "schema")!;
  assert(schema.hint!.includes("FULL"), schema.hint);
});

Deno.test("table-update: an update with nothing set is refused, not sent", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ tableId: "t1" }, ctx),
    Error,
    "nothing to update",
  );
  assertEquals(calls.length, 0);
});
