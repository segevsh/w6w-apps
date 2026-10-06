import { assertEquals, assertRejects } from "@std/assert";
import commentList from "../../actions/comment-list.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("comment-list: GET /comments with every filter, sort, include and page serialised", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "data": [{ "id": "1", "type": "comments", "attributes": { "name": "x" } }],
      "meta": { "total_count": 1, "current_page": 1, "total_pages": 1, "page_size": 30 },
      "links": {},
    },
  }]);
  const out = await commentList.execute({
    "taskId": 7,
    "projectId": 7,
    "discussionId": 7,
    "pageId": 7,
    "sort": "-name",
    "include": "company",
    "pageSize": 5,
    "pageNumber": 2,
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/comments");
  assertEquals(queryOf(calls[0].url), {
    "filter[task_id]": "7",
    "filter[project_id]": "7",
    "filter[discussion_id]": "7",
    "filter[page_id]": "7",
    "sort": "-name",
    "include": "company",
    "page[size]": "5",
    "page[number]": "2",
  });
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["content-type"], "application/vnd.api+json");
  assertEquals(calls[0].headers["x-auth-token"], undefined, "credentials belong to sign");
  assertEquals(calls[0].headers["x-organization-id"], undefined);
  assertEquals(out.count, 1);
  assertEquals(out.totalCount, 1);
  assertEquals(out.hasMore, false);
  assertEquals((out.items as Record<string, unknown>[])[0].id, "1");
  assertEquals((out.items as Record<string, unknown>[])[0].name, "x");
});

Deno.test("comment-list: a next link becomes nextCursor, and the cursor is sent back as page[after]", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: {
        data: [],
        links: { next: "https://api.productive.io/api/v2/comments?page%5Bafter%5D=abc123" },
      },
    },
    { status: 200, body: { data: [] } },
  ]);
  const first = await commentList.execute({ cursorPaging: true, pageSize: 2 }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(queryOf(calls[0].url), { "page[after]": "", "page[size]": "2" });
  assertEquals(first.hasMore, true);
  assertEquals(first.nextCursor, "abc123");
  await commentList.execute({ cursor: "abc123" }, ctx);
  assertEquals(queryOf(calls[1].url), { "page[after]": "abc123" });
});

Deno.test("comment-list: a raw filter object is merged with the typed filters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await commentList.execute({ filter: '{"name": {"contains": "x"}, "id": [1, 2]}' }, ctx);
  assertEquals(queryOf(calls[0].url), { "filter[name][contains]": "x", "filter[id]": "1,2" });
});

Deno.test("comment-list: a vendor error surfaces its status, title and detail", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: errorBody("422", "unprocessable_entity", "Invalid", "is invalid"),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(commentList.execute({}, ctx)),
    Error,
  );
  assertEquals(err.message.includes("422"), true, err.message);
  assertEquals(err.message.includes("is invalid"), true, err.message);
});

Deno.test("comment-list: declares search", () => {
  assertEquals(commentList.type, "search");
  assertEquals(commentList.idempotent, undefined);
  assertEquals(commentList.key, "comment-list");
});
