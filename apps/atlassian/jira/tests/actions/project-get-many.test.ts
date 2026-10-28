import { assertEquals } from "@std/assert";
import { mockJiraCtx } from "../_helpers.ts";
import action from "../../actions/project-get-many.ts";

Deno.test("project-get-many: GETs /project/search", async () => {
  const { ctx, calls } = mockJiraCtx([{ body: { values: [], total: 0 } }]);
  await action.execute({ query: "eng" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/rest/api/3/project/search");
  assertEquals(new URL(calls[0].url).searchParams.get("query"), "eng");
});
