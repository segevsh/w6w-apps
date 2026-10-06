import { assert, assertEquals } from "@std/assert";
import resultsList from "../../actions/results-list.ts";
import { errorOf, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("results-list: GET /v1/results/<parser> with every filter mapped", async () => {
  const rows = [{ document_id: "a" }, { document_id: "b" }];
  const { ctx, calls } = mockCtx([{ body: rows }]);
  const out = await resultsList.execute({
    parserId: "p1",
    format: "flat",
    list: "uploaded_after",
    limit: 5,
    date: "2017-02-12T15:19:21+00:00",
    remoteId: "r",
    includeProcessingQueue: true,
    sortBy: "processed_at",
    sortOrder: "ASC",
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/results/p1");
  assertEquals(queryOf(calls[0].url), {
    format: "flat",
    list: "uploaded_after",
    limit: "5",
    date: "2017-02-12T15:19:21+00:00",
    remote_id: "r",
    include_processing_queue: "true",
    sort_by: "processed_at",
    sort_order: "ASC",
  });
  assertEquals(out, { items: rows, count: 2 });
});

Deno.test("results-list: defaults send no query", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await resultsList.execute({ parserId: "p1" }, ctx);
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("results-list: an 'after' mode without a date fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await errorOf(() =>
    resultsList.execute({ parserId: "p1", list: "processed_after" }, ctx)
  );
  assert(err.message.includes("date is required"));
  assertEquals(calls.length, 0);
});
