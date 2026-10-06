import { assertEquals, assertRejects } from "@std/assert";
import bulkDownload from "../../actions/bulk-download.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("bulk-download: returns the octet-stream report as text", async () => {
  const csv = "email,result\na@b.com,ok\n";
  const { ctx, calls } = mockCtx([{
    headers: { "content-type": "application/octet-stream" },
    body: csv,
  }]);
  const out = await run(bulkDownload, { fileId: "940", filter: "ok" }, ctx);
  const u = new URL(calls[0].url);
  assertEquals(u.hostname + u.pathname, "bulkapi.millionverifier.com/bulkapi/v2/download");
  assertEquals(u.searchParams.get("filter"), "ok");
  assertEquals(u.searchParams.has("statuses"), false);
  assertEquals(out.content, csv);
  assertEquals(out.contentType, "application/octet-stream");
  assertEquals(out.size, csv.length);
});

Deno.test("bulk-download: custom filter passes statuses, free and role", async () => {
  const { ctx, calls } = mockCtx([{
    headers: { "content-type": "application/octet-stream" },
    body: "x",
  }]);
  await run(bulkDownload, {
    fileId: "1",
    filter: "custom",
    statuses: "ok,disposable",
    free: "0",
    role: "1",
  }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals([q.get("statuses"), q.get("free"), q.get("role")], ["ok,disposable", "0", "1"]);
});

Deno.test("bulk-download: statuses are dropped unless the filter is custom", async () => {
  const { ctx, calls } = mockCtx([{ body: "x", headers: { "content-type": "text/csv" } }]);
  await run(bulkDownload, { fileId: "1", filter: "all", statuses: "ok", free: "1" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals([q.has("statuses"), q.has("free")], [false, false]);
});

Deno.test("bulk-download: a JSON error on HTTP 200 throws; a bad filter is refused locally", async () => {
  const { ctx, calls } = mockCtx([{
    headers: { "content-type": "application/json; charset=utf-8" },
    body: { error: "unsupported filter value" },
  }]);
  await assertRejects(
    () => run(bulkDownload, { fileId: "1", filter: "all" }, ctx),
    Error,
    "unsupported filter value",
  );
  await assertRejects(
    () => run(bulkDownload, { fileId: "1", filter: "nope" }, ctx),
    Error,
    "filter must be",
  );
  assertEquals(calls.length, 1);
});
