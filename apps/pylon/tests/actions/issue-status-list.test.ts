import { assertEquals } from "@std/assert";
import action from "../../actions/issue-status-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("issue-status-list: GETs /issue-statuses", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: [{ slug: "new", label: "New", category: "open" }],
      pagination: { has_next_page: false },
    },
  }]);
  const out = await action.execute!({}, ctx);
  assertEquals(calls[0].url, "https://api.usepylon.com/issue-statuses");
  assertEquals(out, {
    statuses: [{ slug: "new", label: "New", category: "open" }],
    hasNextPage: false,
  });
});
