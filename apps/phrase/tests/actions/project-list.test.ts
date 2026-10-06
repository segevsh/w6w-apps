import { assert, assertEquals, assertRejects } from "@std/assert";
import projectList from "../../actions/project-list.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("project-list: sends GET /v2/projects", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "x1" }] }]);
  const input = {
    "q": "v_q",
    "sortBy": "name_asc",
    "page": 2,
    "perPage": 10,
  };
  const out = await projectList.execute(input, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/projects");
  assertEquals(queryOf(calls[0].url), {
    "q": "v_q",
    "sort_by": "name_asc",
    "page": "2",
    "per_page": "10",
  });
  assertEquals(calls[0].body, null);
  assertEquals(out.items, [{ id: "x1" }]);
  assert(!("authorization" in calls[0].headers), "credentials belong to sign, not the action");
});

Deno.test("project-list: surfaces Phrase's validation message on a 422", async () => {
  const { ctx } = mockCtx([{ status: 422, body: errorBody("Validation failed") }]);
  const err = await assertRejects(async () => {
    await projectList.execute({
      "q": "v_q",
      "sortBy": "name_asc",
      "page": 2,
      "perPage": 10,
    }, ctx);
  });
  assert((err as Error).message.includes("Validation failed"), (err as Error).message);
});

Deno.test("project-list: declares key, type and every param it reads", () => {
  assertEquals(projectList.key, "project-list");
  assertEquals(projectList.type, "search");
  const declared = new Set((projectList.params ?? []).map((p) => p.key));
  for (
    const k of Object.keys({
      "q": "v_q",
      "sortBy": "name_asc",
      "page": 2,
      "perPage": 10,
    })
  ) assert(declared.has(k), `missing param ${k}`);
});

Deno.test("project-list: lifts the Pagination header into the output", async () => {
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
  const out = await projectList.execute({
    "q": "v_q",
    "sortBy": "name_asc",
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

Deno.test("project-list: falls back to the Link header for the next page", async () => {
  const { ctx } = mockCtx([{
    headers: {
      "content-type": "application/json",
      link:
        '<https://api.phrase.com/v2/x?page=3>; rel="next", <https://api.phrase.com/v2/x?page=9>; rel="last"',
    },
    body: [],
  }]);
  const out = await projectList.execute({
    "q": "v_q",
    "sortBy": "name_asc",
    "page": 2,
    "perPage": 10,
  }, ctx) as Record<string, unknown>;
  assertEquals(out.nextPage, 3);
});
