import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import download from "../../actions/report-download.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("report-download: json format is parsed and humanReadable is forwarded", async () => {
  const { ctx, calls } = mockCtx([{ body: { employees: [{ name: "A" }] } }]);
  const out = await download.execute(
    { reportId: 5, format: "json", humanReadable: "APPEND", locale: "fr-FR" },
    ctx,
  ) as { format: string; data: { employees: unknown[] } };
  assertEquals(pathOf(calls[0].url), "/v1/company/reports/5/download");
  assertEquals(queryOf(calls[0].url), { format: "json", locale: "fr-FR", humanReadable: "APPEND" });
  assertEquals(out.data.employees.length, 1);
});

test("report-download: csv comes back as text and drops humanReadable", async () => {
  const { ctx, calls } = mockCtx([{
    body: "name,site\nA,London\n",
    headers: { "content-type": "text/csv" },
  }]);
  const out = await download.execute(
    { reportId: 5, format: "csv", humanReadable: "APPEND", includeInfo: false },
    ctx,
  );
  assertEquals(queryOf(calls[0].url), { format: "csv", includeInfo: "false" });
  assertEquals(out, { format: "csv", data: "name,site\nA,London\n" });
});

test("report-download: xlsx is refused before any call", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(() =>
    Promise.resolve(download.execute({ reportId: 5, format: "xlsx" as unknown as "csv" }, ctx))
  );
  assertEquals(calls.length, 0);
});
