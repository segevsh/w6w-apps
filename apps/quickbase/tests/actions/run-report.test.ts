import { assert, assertEquals } from "@std/assert";
import { mockQbCtx } from "../_helpers.ts";
import action from "../../actions/run-report.ts";

Deno.test("run-report: POSTs with NO body — paging goes in the query string", async () => {
  const { ctx, calls } = mockQbCtx([{ body: { data: [], metadata: {} } }]);
  await action.execute({ tableId: "bck1", reportId: "1", skip: 100, top: 50 }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].body, null);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/reports/1/run");
  assertEquals(url.searchParams.get("tableId"), "bck1");
  assertEquals(url.searchParams.get("skip"), "100");
  assertEquals(url.searchParams.get("top"), "50");
});

Deno.test("run-report: omits paging params when unset", async () => {
  const { ctx, calls } = mockQbCtx([{ body: {} }]);
  await action.execute({ tableId: "bck1", reportId: "1" }, ctx);

  const url = new URL(calls[0].url);
  assert(!url.searchParams.has("skip"));
  assert(!url.searchParams.has("top"));
});

Deno.test("run-report: returns the same envelope as query-records", async () => {
  const { ctx } = mockQbCtx([{
    body: {
      data: [{ "6": { value: "Acme" } }],
      fields: [{ id: 6, label: "Name", type: "text", labelOverride: "Customer" }],
      metadata: { totalRecords: 5, numRecords: 1, numFields: 1 },
    },
  }]);
  const out = await action.execute({ tableId: "bck1", reportId: "1" }, ctx);

  assertEquals(out.data!.length, 1);
  assertEquals(out.fields![0].labelOverride, "Customer");
  assertEquals(out.metadata!.totalRecords, 5);
});
