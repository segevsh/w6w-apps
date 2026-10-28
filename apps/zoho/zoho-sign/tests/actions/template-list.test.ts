import { assertEquals } from "@std/assert";
import { mockSignCtx } from "../_helpers.ts";
import action from "../../actions/template-list.ts";

Deno.test("template-list: GET /templates with page_context carried as a data= query param", async () => {
  const { ctx, calls } = mockSignCtx([
    {
      body: {
        code: 0,
        status: "success",
        templates: [{ template_id: "t1" }],
        page_context: { total_count: 1 },
      },
    },
  ]);

  const out = await action.execute({ rowCount: 25, startIndex: 1, sortOrder: "DESC" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/templates");
  const data = JSON.parse(url.searchParams.get("data")!);
  assertEquals(data, { page_context: { row_count: 25, start_index: 1, sort_order: "DESC" } });
  assertEquals(out, { templates: [{ template_id: "t1" }], page_context: { total_count: 1 } });
});
