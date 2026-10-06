import { assertEquals } from "@std/assert";
import workflowList from "../../actions/workflow-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("workflow-list: GET /workflows with pagination and filters", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: "w1" }]) }]);
  const out = await workflowList.execute(
    {
      page: 2,
      pageSize: 50,
      status: ["active", "paused"],
      filter: "Equals([a], 'b')",
      hydrateEntities: true,
    },
    ctx,
  ) as { list: unknown[]; count: number };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/public/api/v1/workflows");
  assertEquals(queryOf(calls[0].url), {
    page: "2",
    pageSize: "50",
    status: "active,paused",
    filter: "Equals([a], 'b')",
    hydrateEntities: "true",
  });
  assertEquals(out.list.length, 1);
  assertEquals(out.count, 1);
});

Deno.test("workflow-list: sends nothing the caller left unset", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await workflowList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("workflow-list: accepts a comma-separated status string", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await workflowList.execute({ status: "completed, cancelled" }, ctx);
  assertEquals(queryOf(calls[0].url).status, "completed,cancelled");
});
