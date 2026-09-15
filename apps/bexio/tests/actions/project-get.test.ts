import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/project-get.ts";

Deno.test("project-get: GETs /2.0/pr_project/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 3, name: "Relaunch" } }]);
  const result = await action.execute!({ projectId: 3 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2.0/pr_project/3");
  assertEquals(result, { id: 3, name: "Relaunch" });
});
