import { assertEquals } from "@std/assert";
import fileList from "../../actions/file-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("file-list: lists files with purpose filter and bounded paging", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      items: [{ file_id: "f1", file_name: "a.pdf" }],
      total: 1,
      page: 1,
      limit: 20,
      total_pages: 1,
    },
  }]);
  const out = await fileList.execute({ purpose: "ocr" }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v3/upload");
  assertEquals(queryOf(calls[0].url), { purpose: "ocr", page: "1", limit: "20" });
  assertEquals(out.files, [{ file_id: "f1", file_name: "a.pdf" }]);
  assertEquals(out.total, 1);
});
