import { assert, assertEquals } from "@std/assert";
import { BASE_PATH, DISPLAY, mockCtx } from "../_helpers.ts";
import action from "../../actions/form-field-filters-get.ts";

Deno.test("form-field-filters-get: GETs /forms/{id}/field-filters", async () => {
  const filters = [{ key: "2", text: "Email", operators: ["is", "contains"] }];
  const { ctx, calls } = mockCtx([{ body: filters }], { display: DISPLAY });
  const out = await action.execute!({ formId: 30 }, ctx) as { fieldFilters: unknown };
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, `${BASE_PATH}/forms/30/field-filters`);
  assertEquals(out.fieldFilters, filters);
});

Deno.test("form-field-filters-get: honours a subdirectory install", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }], {
    display: { siteUrl: "https://site.com/blog" },
  });
  await action.execute!({ formId: 1 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/blog/wp-json/gf/v2/forms/1/field-filters");
});

Deno.test("form-field-filters-get: is a read action against the form resource", () => {
  assertEquals(action.type, "read");
  assertEquals(action.resource, "form");
  assert(action.output);
});
