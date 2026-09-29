import { assertEquals } from "@std/assert";
import listFormPartialSubmissions from "../../actions/list-form-partial-submissions.ts";
import { listEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-form-partial-submissions: reads the HYPHENATED 'partial-submissions' results key", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: listEnvelope({ "partial-submissions": [{ id: "ps1" }] }, { total: 1 }),
  }]);
  const out = await listFormPartialSubmissions.execute({ slugOrId: "f1" }, ctx) as {
    results: unknown[];
    total?: number;
  };
  assertEquals(pathOf(calls[0].url), "/v1/forms/f1/partial-submissions");
  assertEquals(out.results.length, 1);
  assertEquals(out.total, 1);
});

Deno.test("list-form-partial-submissions: an underscore key (not what the vendor sends) yields no results", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: listEnvelope({ partial_submissions: [{ id: "ps1" }] }),
  }]);
  const out = await listFormPartialSubmissions.execute({ slugOrId: "f1" }, ctx) as {
    results: unknown[];
  };
  assertEquals(out.results, []);
});
