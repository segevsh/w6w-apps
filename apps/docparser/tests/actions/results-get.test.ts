import { assertEquals } from "@std/assert";
import resultsGet from "../../actions/results-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("results-get: GET /v1/results/<parser>/<doc>, result is the first element", async () => {
  const rows = [{ document_id: "d1", customer: { first_name: "John" } }];
  const { ctx, calls } = mockCtx([{ body: rows }]);
  const out = await resultsGet.execute(
    { parserId: "p1", documentId: "d1", format: "flat", includeChildren: true },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v1/results/p1/d1");
  assertEquals(queryOf(calls[0].url), { format: "flat", include_children: "true" });
  assertEquals(out, { result: rows[0], items: rows, count: 1 });
});

Deno.test("results-get: no query params by default; empty array gives null result", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  const out = await resultsGet.execute({ parserId: "p1", documentId: "d1" }, ctx);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(out, { result: null, items: [], count: 0 });
});
