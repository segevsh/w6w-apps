import { assertEquals } from "@std/assert";
import customFieldList from "../../actions/custom-field-list.ts";
import { API_ROOT, mockCtx, page, queryOf } from "../_helpers.ts";

const FIELD = {
  label: "Street address",
  type: "TEXT",
  mergeTag: "street_address",
  defaultMaxLength: 100,
};

Deno.test("custom-field-list: reads the custom-fields page and returns its rows", async () => {
  const { ctx, calls } = mockCtx([{ body: page([FIELD], { totalElements: 1 }) }]);
  const result = await customFieldList.execute({}, ctx) as { content: unknown[] };

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, `${API_ROOT}/api/custom-fields`);
  assertEquals(result.content, [FIELD]);
});

Deno.test("custom-field-list: forwards page and size verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await customFieldList.execute({ page: 1, size: 25 }, ctx);
  assertEquals(queryOf(calls[0].url), { page: "1", size: "25" });
});

Deno.test("custom-field-list: is a search action grouped under custom-field", () => {
  assertEquals(customFieldList.type, "search");
  assertEquals(customFieldList.resource, "custom-field");
});
