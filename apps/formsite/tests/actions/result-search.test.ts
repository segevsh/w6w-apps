import { assertEquals, assertRejects } from "@std/assert";
import { mockFormsiteCtx } from "../_helpers.ts";
import resultSearch, { parseCriteria } from "../../actions/result-search.ts";

const paged = {
  "content-type": "application/json",
  "pagination-page-current": "1",
  "pagination-page-last": "3",
};

Deno.test("result-search: builds search_<op>[id] params and the method", async () => {
  const { ctx, calls } = mockFormsiteCtx([{ body: { results: [] }, headers: paged }]);
  await resultSearch.execute({
    formDir: "f1",
    searchMethod: "or",
    criteria: [
      { itemId: "100", operator: "equals", value: "Yes" },
      { itemId: "101", operator: "contains", value: "ab" },
      { itemId: "102", operator: "begins", value: "x" },
      { itemId: "103", operator: "ends", value: "z" },
    ],
  }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("search_equals[100]"), "Yes");
  assertEquals(p.get("search_contains[101]"), "ab");
  assertEquals(p.get("search_begins[102]"), "x");
  assertEquals(p.get("search_ends[103]"), "z");
  assertEquals(p.get("search_method"), "or");
});

Deno.test("result-search: accepts criteria as a JSON string", async () => {
  const { ctx, calls } = mockFormsiteCtx([{ body: {} }]);
  await resultSearch.execute({
    formDir: "f1",
    criteria: '[{"itemId":"5","operator":"equals","value":"1"}]',
  }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("search_equals[5]"), "1");
});

Deno.test("result-search: rejects bad criteria before any request", async () => {
  const { ctx, calls } = mockFormsiteCtx();
  await assertRejects(async () => await resultSearch.execute({ formDir: "f", criteria: [] }, ctx));
  await assertRejects(
    async () =>
      await resultSearch.execute({
        formDir: "f",
        criteria: [{ itemId: "1", operator: "like" as "equals", value: "a" }],
      }, ctx),
    Error,
    "operator",
  );
  assertEquals(calls.length, 0);
});

Deno.test("parseCriteria: stringifies ids and values", () => {
  // deno-lint-ignore no-explicit-any
  assertEquals(parseCriteria([{ itemId: 1, operator: "equals", value: 2 } as any]), [
    { itemId: "1", operator: "equals", value: "2" },
  ]);
});
