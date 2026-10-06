import { assertEquals, assertRejects } from "@std/assert";
import projectList from "../../actions/project-list.ts";
import { errorBody, mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("project-list: GET /api/v1/projects, no filters sends no query", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: "p1" }], "cur1") }]);
  const out = await projectList.execute({}, ctx) as {
    values: unknown[];
    pagination: { after: string };
  };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v1/projects");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(out.values.length, 1);
  assertEquals(out.pagination.after, "cur1");
});

Deno.test("project-list: filters, flags, lists and cursor reach the query", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await projectList.execute({
    statuses: ["Live", "Draft"],
    categories: "finance, ops",
    ownerEmail: "o@x.com",
    includeArchived: true,
    sortBy: "LAST_EDITED_AT",
    sortDirection: "ASC",
    limit: 50,
    after: "abc",
  }, ctx);
  assertEquals(queryOf(calls[0].url), {
    statuses: "Live,Draft",
    categories: "finance,ops",
    ownerEmail: "o@x.com",
    includeArchived: "true",
    sortBy: "LAST_EDITED_AT",
    sortDirection: "ASC",
    limit: "50",
    after: "abc",
  });
});

Deno.test("project-list: a structured error surfaces code and message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody("FORBIDDEN", "Insufficient access") }]);
  const err = await assertRejects(() => Promise.resolve(projectList.execute({}, ctx)), Error);
  assertEquals(
    err.message.includes("FORBIDDEN") && err.message.includes("Insufficient access"),
    true,
  );
});
