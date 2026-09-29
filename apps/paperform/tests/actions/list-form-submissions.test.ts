import { assertEquals } from "@std/assert";
import listFormSubmissions from "../../actions/list-form-submissions.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-form-submissions: GETs /v1/forms/{slugOrId}/submissions with pagination query", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: listEnvelope({ submissions: [{ id: "s1" }] }, { total: 1 }),
  }]);
  const out = await listFormSubmissions.execute(
    { slugOrId: "f1", limit: 5, sort: "ASC" },
    ctx,
  ) as { results: unknown[]; total?: number };

  assertEquals(pathOf(calls[0].url), "/v1/forms/f1/submissions");
  assertEquals(queryOf(calls[0].url), { limit: "5", sort: "ASC" });
  assertEquals(out.results.length, 1);
  assertEquals(out.total, 1);
});
