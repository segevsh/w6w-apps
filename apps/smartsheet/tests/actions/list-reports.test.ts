import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-reports.ts";

Deno.test("list-reports: is a read over the report resource", () => {
  assertEquals(action.key, "list-reports");
  assertEquals(action.type, "read");
  assertEquals(action.resource, "report");
});

Deno.test("list-reports: GETs /reports with no query by default", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/2.0/reports");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("list-reports: forwards modifiedSince and the paging trio", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await action.execute(
    { modifiedSince: "2026-08-01T00:00:00Z", page: 2, pageSize: 10, includeAll: true },
    ctx,
  );
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("modifiedSince"), "2026-08-01T00:00:00Z");
  assertEquals(q.get("page"), "2");
  assertEquals(q.get("pageSize"), "10");
  assertEquals(q.get("includeAll"), "true");
});

Deno.test("list-reports: says reports are read-only here, and why", () => {
  // Report columns are virtual ids, not sheet column ids — the write path in
  // this app is built on real columnIds and would be wrong against a report.
  assert(/read-only/i.test(action.description!));
  assert(/virtual/i.test(action.description!));
});
