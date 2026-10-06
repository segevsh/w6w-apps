import { assert, assertEquals, assertRejects } from "@std/assert";
import keySearch from "../../actions/key-search.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("key-search: sends POST /v2/projects/project%201%2Fx/keys/search", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "x1" }] }]);
  const input = {
    "projectId": "project 1/x",
    "branch": "v_branch",
    "sort": "name",
    "order": "asc",
    "q": "v_q",
    "localeId": "v_localeId",
    "page": 2,
    "perPage": 10,
  };
  const out = await keySearch.execute(input, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/projects/project%201%2Fx/keys/search");
  assertEquals(queryOf(calls[0].url), { "page": "2", "per_page": "10" });
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "branch": "v_branch",
    "sort": "name",
    "order": "asc",
    "q": "v_q",
    "locale_id": "v_localeId",
  });
  assertEquals(out.items, [{ id: "x1" }]);
  assert(!("authorization" in calls[0].headers), "credentials belong to sign, not the action");
});

Deno.test("key-search: surfaces Phrase's validation message on a 422", async () => {
  const { ctx } = mockCtx([{ status: 422, body: errorBody("Validation failed") }]);
  const err = await assertRejects(async () => {
    await keySearch.execute({
      "projectId": "project 1/x",
      "branch": "v_branch",
      "sort": "name",
      "order": "asc",
      "q": "v_q",
      "localeId": "v_localeId",
      "page": 2,
      "perPage": 10,
    }, ctx);
  });
  assert((err as Error).message.includes("Validation failed"), (err as Error).message);
});

Deno.test("key-search: declares key, type and every param it reads", () => {
  assertEquals(keySearch.key, "key-search");
  assertEquals(keySearch.type, "search");
  const declared = new Set((keySearch.params ?? []).map((p) => p.key));
  for (
    const k of Object.keys({
      "projectId": "project 1/x",
      "branch": "v_branch",
      "sort": "name",
      "order": "asc",
      "q": "v_q",
      "localeId": "v_localeId",
      "page": 2,
      "perPage": 10,
    })
  ) assert(declared.has(k), `missing param ${k}`);
});

Deno.test("key-search: lifts the Pagination header into the output", async () => {
  const { ctx } = mockCtx([{
    headers: {
      "content-type": "application/json",
      pagination: JSON.stringify({
        total_count: 41,
        total_pages_count: 5,
        current_page: 2,
        current_per_page: 10,
        next_page: 3,
      }),
    },
    body: [],
  }]);
  const out = await keySearch.execute({
    "projectId": "project 1/x",
    "branch": "v_branch",
    "sort": "name",
    "order": "asc",
    "q": "v_q",
    "localeId": "v_localeId",
    "page": 2,
    "perPage": 10,
  }, ctx) as Record<string, unknown>;
  assertEquals([out.page, out.perPage, out.totalCount, out.totalPages, out.nextPage], [
    2,
    10,
    41,
    5,
    3,
  ]);
});

Deno.test("key-search: falls back to the Link header for the next page", async () => {
  const { ctx } = mockCtx([{
    headers: {
      "content-type": "application/json",
      link:
        '<https://api.phrase.com/v2/x?page=3>; rel="next", <https://api.phrase.com/v2/x?page=9>; rel="last"',
    },
    body: [],
  }]);
  const out = await keySearch.execute({
    "projectId": "project 1/x",
    "branch": "v_branch",
    "sort": "name",
    "order": "asc",
    "q": "v_q",
    "localeId": "v_localeId",
    "page": 2,
    "perPage": 10,
  }, ctx) as Record<string, unknown>;
  assertEquals(out.nextPage, 3);
});
