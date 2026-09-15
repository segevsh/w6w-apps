import { assertEquals } from "@std/assert";
import documentLogList from "../../actions/document-log-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("document-log-list: GETs /document/{id}/log_set", async () => {
  const { ctx, calls } = mockCtx([
    { body: listEnvelope([{ id: 1, status: "ERROR", source: "DOCUMENT" }]) },
  ]);
  const out = await documentLogList.execute(
    { documentId: "5", page: 2, pageSize: 10 },
    ctx,
  ) as { results: unknown[] };

  assertEquals(pathOf(calls[0].url), "/document/5/log_set");
  assertEquals(queryOf(calls[0].url), { page: "2", page_size: "10" });
  assertEquals(out.results.length, 1);
});
