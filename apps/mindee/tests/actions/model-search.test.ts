import { assertEquals } from "@std/assert";
import modelSearch from "../../actions/model-search.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("model-search: lists models with no filters when none are given", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        models: [{ id: "m1", name: "Invoices", model_type: "extraction", webhooks: [] }],
        pagination: {},
      },
    },
  ]);
  const result = await modelSearch.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/search/models");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals((result as { models: unknown[] }).models.length, 1);
});

Deno.test("model-search: filters map to the vendor's snake_case query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { models: [], pagination: {} } }]);
  await modelSearch.execute(
    { name: "invoice", modelType: "extraction", page: 2, perPage: 10 },
    ctx,
  );

  assertEquals(queryOf(calls[0].url), {
    name: "invoice",
    model_type: "extraction",
    page: "2",
    per_page: "10",
  });
});
