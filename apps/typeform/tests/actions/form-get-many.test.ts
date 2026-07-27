import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/form-get-many.ts";

Deno.test("form-get-many: GETs /forms mapping filters to snake_case query", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [], total_items: 0 } }]);
  await action.execute(
    {
      search: "quiz",
      workspaceId: "w1",
      page: 2,
      pageSize: 50,
      sortBy: "created_at",
      orderBy: "desc",
    },
    ctx,
  );

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/forms");
  assertEquals(url.searchParams.get("search"), "quiz");
  assertEquals(url.searchParams.get("workspace_id"), "w1");
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.get("page_size"), "50");
  assertEquals(url.searchParams.get("sort_by"), "created_at");
  assertEquals(url.searchParams.get("order_by"), "desc");
});

Deno.test("form-get-many: omits unset filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});
