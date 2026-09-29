import { assertEquals } from "@std/assert";
import listForms from "../../actions/list-forms.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-forms: GETs /v1/forms with search, search_fields (repeated) and pagination", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: listEnvelope({ forms: [{ id: "f1" }] }, {
      total: 1,
      has_more: false,
      limit: 20,
      skip: 0,
    }),
  }]);
  const out = await listForms.execute(
    { search: "John", searchFields: ["title", "slug"], limit: 10, skip: 5 },
    ctx,
  ) as { results: unknown[]; total?: number; hasMore?: boolean };

  assertEquals(pathOf(calls[0].url), "/v1/forms");
  assertEquals(queryOf(calls[0].url), {
    search: "John",
    search_fields: ["title", "slug"],
    limit: "10",
    skip: "5",
  });
  assertEquals(out.results.length, 1);
  assertEquals(out.total, 1);
  assertEquals(out.hasMore, false);
});

Deno.test("list-forms: an empty result set returns an empty array, not undefined", async () => {
  const { ctx } = mockCtx([{ status: 200, body: listEnvelope({}) }]);
  const out = await listForms.execute({}, ctx) as { results: unknown[] };
  assertEquals(out.results, []);
});
