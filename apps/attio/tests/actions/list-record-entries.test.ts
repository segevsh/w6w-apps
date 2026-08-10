import { assertEquals } from "@std/assert";
import { mockCtx, param } from "../_helpers.ts";
import listRecordEntries from "../../actions/list-record-entries.ts";

Deno.test("list-record-entries: GETs …/entries with query-string paging", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await listRecordEntries.execute({ object: "companies", recordId: "r1", limit: 100 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/objects/companies/records/r1/entries");
  assertEquals(url.searchParams.get("limit"), "100");
  assertEquals(calls[0].body, null);
});

Deno.test("list-record-entries: enforces the documented 1000 maximum", () => {
  assertEquals(param(listRecordEntries, "limit").validation?.max, 1000);
});
