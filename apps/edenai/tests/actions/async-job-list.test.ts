import { assertEquals } from "@std/assert";
import list from "../../actions/async-job-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("async-job-list: sends filters and page, returns the page envelope", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      items: [{ public_id: "j1", status: "success" }],
      total: 41,
      page: 2,
      limit: 20,
      total_pages: 3,
    },
  }]);
  const out = await list.execute({ feature: "ocr", status: "success", page: 2 }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(pathOf(calls[0].url), "/v3/universal-ai/async");
  assertEquals(queryOf(calls[0].url), {
    feature: "ocr",
    status: "success",
    page: "2",
    limit: "20",
  });
  assertEquals(out.total, 41);
  assertEquals(out.totalPages, 3);
  assertEquals((out.items as unknown[]).length, 1);
});

Deno.test("async-job-list: defaults to page 1 and 20 per page, not the vendor's 100", async () => {
  const { ctx, calls } = mockCtx([{
    body: { items: [], total: 0, page: 1, limit: 20, total_pages: 0 },
  }]);
  await list.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), { page: "1", limit: "20" });
});
