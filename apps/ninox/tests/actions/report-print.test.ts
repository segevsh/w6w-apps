import { assertEquals, assertRejects } from "@std/assert";
import { connCtx, envelope, pathOf, WS } from "../_helpers.ts";
import action from "../../actions/report-print.ts";

Deno.test("report-print: POSTs rowId and merged rowIds, returns the file", async () => {
  const file = { fileName: "inv.pdf", mimeType: "application/pdf", url: "https://x/inv.pdf" };
  const { ctx, calls } = connCtx([{ body: envelope(file) }]);
  const out = await action.execute({ reportId: "r1", rowId: 5, rowIds: "6, 7" }, ctx);
  assertEquals(out, file);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), `/api/v1/workspace/${WS}/reports/r1/print`);
  assertEquals(JSON.parse(calls[0].body!), { rowId: 5, rowIds: [6, 7] });
});

Deno.test("report-print: omits rowIds when none are given", async () => {
  const { ctx, calls } = connCtx([{ body: envelope({ url: "u" }) }]);
  await action.execute({ reportId: "r1", rowId: 5 }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { rowId: 5 });
});

Deno.test("report-print: more than 249 extra ids and bad ids are rejected locally", async () => {
  const { ctx, calls } = connCtx();
  const many = Array.from({ length: 250 }, (_, i) => i + 1);
  await assertRejects(
    async () => await action.execute({ reportId: "r1", rowId: 5, rowIds: many }, ctx),
    Error,
    "at most 249",
  );
  await assertRejects(async () => await action.execute({ reportId: "r1", rowId: 0 }, ctx), Error);
  assertEquals(calls.length, 0);
});
