import { assertEquals, assertRejects } from "@std/assert";
import { mockSalesmateCtx } from "../_helpers.ts";
import search from "../../actions/activity-search.ts";

const ok = (Data: unknown) => ({ body: { Status: "success", Data } });

Deno.test("activity-search: POSTs the documented query shape with rows/from", async () => {
  const { ctx, calls } = mockSalesmateCtx([ok({ data: [{ id: 1 }], totalRows: 1, totalPages: 1 })]);
  const out = await search.execute({ rows: 50, from: 10 }, ctx);
  assertEquals(out, { records: [{ id: 1 }], totalRows: 1, totalPages: 1 });
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/apis/activity/v4/search");
  assertEquals(url.searchParams.get("rows"), "50");
  assertEquals(url.searchParams.get("from"), "10");
  assertEquals(url.searchParams.get("viewType"), "list");
  const body = JSON.parse(calls[0].body!);
  assertEquals(calls[0].method, "POST");
  assertEquals(body.reportType, "get_data");
  assertEquals(body.getRecordsCount, true);
  assertEquals(body.filterQuery.group.operator, "AND");
  assertEquals(body.filterQuery.group.rules.length, 1);
  assertEquals(body.filterQuery.group.rules[0].moduleName, "Task");
  assertEquals(body.moduleId, 2);
  assertEquals(body.displayingFields[0], "activity.id");
  assertEquals(body.sort, { fieldName: "", order: "" });
});

Deno.test("activity-search: caller rules, fields and sort replace the defaults", async () => {
  const { ctx, calls } = mockSalesmateCtx([ok({ data: [] })]);
  const rule = {
    condition: "EQUALS",
    moduleName: "X",
    field: { fieldName: "activity.id" },
    data: 1,
  };
  const out = await search.execute(
    { rules: JSON.stringify([rule]), fields: ["activity.id"], sortBy: "id", sortOrder: "desc" },
    ctx,
  );
  assertEquals((out as { records: unknown[] }).records, []);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.filterQuery.group.rules, [rule]);
  assertEquals(body.displayingFields, ["activity.id"]);
  assertEquals(body.sort, { fieldName: "id", order: "desc" });
});

Deno.test("activity-search: a non-array rules value is rejected before any request", async () => {
  const { ctx, calls } = mockSalesmateCtx();
  await assertRejects(
    async () => await search.execute({ rules: { a: 1 } }, ctx),
    Error,
    "JSON array",
  );
  assertEquals(calls.length, 0);
});
