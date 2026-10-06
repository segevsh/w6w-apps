import { assertEquals } from "@std/assert";
import projectList from "../../actions/project-list.ts";
import { listEnvelope, mockCtx, pathOf, problem, PROBLEM_HEADERS, queryOf } from "../_helpers.ts";

Deno.test("project-list: lists projects and passes the paging block", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: listEnvelope([{ id: "p1", name: "Docs" }], {
      page: 2,
      has_more: true,
      next_cursor: "c1",
    }),
  }]);
  const out = await projectList.execute(
    { page: 2, pageSize: 10, includeTotalCount: true },
    ctx,
  ) as { items: unknown[]; pagination: { next_cursor?: string } | null };

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v3/projects");
  assertEquals(queryOf(calls[0].url), { page: "2", page_size: "10", include_total_count: "true" });
  assertEquals(calls[0].body, null);
  assertEquals(out.items, [{ id: "p1", name: "Docs" }]);
  assertEquals(out.pagination?.next_cursor, "c1");
});

Deno.test("project-list: a vendor error surfaces its code and message", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    headers: PROBLEM_HEADERS,
    body: problem(422, "VALIDATION_ERROR", "The field is required.", "title"),
  }]);
  let message = "";
  try {
    await projectList.execute({ page: 2, pageSize: 10, includeTotalCount: true }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("VALIDATION_ERROR"), true, message);
  assertEquals(message.includes("title: The field is required."), true, message);
});
