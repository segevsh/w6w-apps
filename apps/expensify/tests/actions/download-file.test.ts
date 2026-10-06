import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/download-file.ts";
import { mockCtx } from "../_helpers.ts";
import { assertWire, sent } from "../_job.ts";

Deno.test("download-file: posts a download job and returns a text file as content", async () => {
  const csv = "Merchant,Amount\nCafe,12.34\n";
  const { ctx, calls } = mockCtx([{ body: csv, headers: { "content-type": "text/csv" } }]);
  const out = await action.execute!({ fileName: "myFile.csv" }, ctx);
  assertWire(calls[0]);
  assertEquals(sent(calls[0]).job, {
    type: "download",
    fileName: "myFile.csv",
    fileSystem: "integrationServer",
  });
  assertEquals(out, { fileName: "myFile.csv", content: csv, size: csv.length });
});

Deno.test("download-file: a reconciliation file uses the reconciliation file system", async () => {
  const { ctx, calls } = mockCtx([{ body: "a,b", headers: { "content-type": "text/plain" } }]);
  await action.execute!({ fileName: "is_reconciliation_1.csv", fileSystem: "reconciliation" }, ctx);
  assertEquals(sent(calls[0]).job.fileSystem, "reconciliation");
});

Deno.test("download-file: a binary format comes back base64", async () => {
  const { ctx } = mockCtx([{
    body: "PK\u0003\u0004",
    headers: { "content-type": "application/octet-stream" },
  }]);
  const out = await action.execute!({ fileName: "export_1.xlsx" }, ctx) as Record<string, unknown>;
  assertEquals(out.contentBase64, btoa("PK\u0003\u0004"));
  assertEquals(out.size, 4);
  assert(!("content" in out));
});

Deno.test("download-file: a JSON error envelope (HTTP 200) is thrown, not returned as the file", async () => {
  const { ctx } = mockCtx([{ body: { responseMessage: "File not found", responseCode: 404 } }]);
  await assertRejects(
    async () => await action.execute!({ fileName: "missing.csv" }, ctx),
    Error,
    "File not found",
  );
  const pdf = mockCtx([{ body: { responseMessage: "File not found", responseCode: 404 } }]);
  await assertRejects(
    async () => await action.execute!({ fileName: "missing.pdf" }, pdf.ctx),
    Error,
    "File not found",
  );
});

Deno.test("download-file: a genuine JSON export that is not an envelope is returned as content", async () => {
  const body = [{ reportName: "Trip", total: 100 }];
  const { ctx } = mockCtx([{ body }]);
  const out = await action.execute!({ fileName: "export_1.json" }, ctx) as Record<string, unknown>;
  assertEquals(JSON.parse(out.content as string), body);
});

Deno.test("download-file: validates the name and file system locally; HTTP errors throw", async () => {
  await assertRejects(
    async () => await action.execute!({ fileName: "" }, mockCtx([]).ctx),
    Error,
    "fileName is required",
  );
  await assertRejects(
    async () =>
      await action.execute!({ fileName: "a.csv", fileSystem: "x" as never }, mockCtx([]).ctx),
    Error,
    "fileSystem must be",
  );
  await assertRejects(
    async () =>
      await action.execute!(
        { fileName: "a.csv" },
        mockCtx([{ status: 502, body: "bad gateway" }]).ctx,
      ),
    Error,
    "502",
  );
});

Deno.test("download-file: declares a read", () => {
  assertEquals(action.type, "read");
});
