import { assert, assertEquals } from "@std/assert";
import { mockQbCtx } from "../_helpers.ts";
import action from "../../actions/query-records.ts";

const body = (raw: string | null) => JSON.parse(raw!);

Deno.test("query-records: posts to /records/query with `from` as the table", async () => {
  const { ctx, calls } = mockQbCtx([{ body: { data: [], metadata: {} } }]);
  await action.execute({ tableId: "bck7gp3q2" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1/records/query");
  assertEquals(body(calls[0].body), { from: "bck7gp3q2" });
});

Deno.test("query-records: omits `options` entirely when no paging param is set", async () => {
  // Sending `options: {}` would be noise; Quickbase treats an absent options
  // block as "use your defaults".
  const { ctx, calls } = mockQbCtx([{ body: {} }]);
  await action.execute({ tableId: "bck1" }, ctx);
  assert(!("options" in body(calls[0].body)));
});

Deno.test("query-records: forwards select, sortBy, groupBy and paging options", async () => {
  const { ctx, calls } = mockQbCtx([{ body: {} }]);
  await action.execute({
    tableId: "bck1",
    select: [6, 7],
    where: "{6.CT.'acme'}",
    sortBy: [{ fieldId: 4, order: "DESC" }],
    groupBy: [{ fieldId: 6, grouping: "equal-values" }],
    skip: 100,
    top: 50,
    compareWithAppLocalTime: true,
  }, ctx);

  assertEquals(body(calls[0].body), {
    from: "bck1",
    select: [6, 7],
    where: "{6.CT.'acme'}",
    sortBy: [{ fieldId: 4, order: "DESC" }],
    groupBy: [{ fieldId: 6, grouping: "equal-values" }],
    options: { skip: 100, top: 50, compareWithAppLocalTime: true },
  });
});

Deno.test("query-records: accepts JSON params as strings from the form", async () => {
  const { ctx, calls } = mockQbCtx([{ body: {} }]);
  await action.execute({ tableId: "bck1", select: "[6,7]", sortBy: '[{"fieldId":4}]' }, ctx);

  assertEquals(body(calls[0].body).select, [6, 7]);
  assertEquals(body(calls[0].body).sortBy, [{ fieldId: 4 }]);
});

Deno.test("query-records: sends record IDs as the `where` union arm", async () => {
  const { ctx, calls } = mockQbCtx([{ body: {} }]);
  await action.execute({ tableId: "bck1", recordIds: [12, 13] }, ctx);

  assertEquals(body(calls[0].body).where, [12, 13]);
});

Deno.test("query-records: a Where clause wins over record IDs", async () => {
  const { ctx, calls } = mockQbCtx([{ body: {} }]);
  await action.execute({ tableId: "bck1", where: "{3.GT.0}", recordIds: [12] }, ctx);

  assertEquals(body(calls[0].body).where, "{3.GT.0}");
});

Deno.test("query-records: omits `where` when neither is given, returning all records", async () => {
  const { ctx, calls } = mockQbCtx([{ body: {} }]);
  await action.execute({ tableId: "bck1", where: "   " }, ctx);
  assert(!("where" in body(calls[0].body)));
});

Deno.test("query-records: returns data, the field map and pagination metadata", async () => {
  const { ctx } = mockQbCtx([{
    body: {
      data: [{ "6": { value: "Acme" } }],
      fields: [{ id: 6, label: "Name", type: "text" }],
      metadata: { totalRecords: 90, numRecords: 1, numFields: 1, skip: 0 },
    },
  }]);
  const out = await action.execute({ tableId: "bck1" }, ctx);

  assertEquals(out.data![0]["6"].value, "Acme");
  assertEquals(out.fields![0].label, "Name");
  // numRecords < totalRecords is normal: intelligent pagination.
  assertEquals(out.metadata!.totalRecords, 90);
  assertEquals(out.metadata!.numRecords, 1);
});
